import os
import json
import httpx
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("script_service")

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3:instruct")

CULTURAL_EMPHASIS = {
    "it": "tecnica artistica, storia locale, figure storiche italiane, connessioni regionali",
    "fr": "influenze culturali francesi, stile e gusto artistico, connessioni con arte francese",
    "de": "contesto storico preciso, dati e date, influenze architettoniche germaniche, analisi tecnica",
    "en": "storie personali, aneddoti, curiosità inaspettate, narrazione accessibile",
    "ja": "precisione tecnica artigianale, processo di creazione, materiali, maestria esecutiva",
    "es": "connessioni con storia iberica, personaggi, passione narrativa, contesto mediterraneo",
    "zh": "contesto storico, simbolismo, connessioni con scambi culturali est-ovest",
    "pt": "connessioni con storia portoghese e esplorazioni, arte religiosa, atlantico",
    "nl": "mercanti, scambi commerciali, storia marittima, influenze fiamminghe"
}

TOUR_TYPE_INSTRUCTIONS = {
    "standard": "Narrativo, coinvolgente. Adulti generici. Target: 90 secondi (circa 200 parole).",
    "kids": "Linguaggio da favola per bambini di 7 anni. Analogie, giochi, supereroi. Domanda interattiva finale. Target: 60s.",
    "expert": "Stile accademico-giornalistico. Cita fonti. Analisi iconografica. Formato controversia storiografica tra Tesi A e B. Target: 200s.",
    "quick": "Solo 3 fatti essenziali. Nessuna storia lunga. Target: 40s.",
    "mystery": "Tono thriller soft. Misteri irrisolti, leggende, scandali. Crea suspense. Target: 100s."
}

SYSTEM_PROMPT = """Sei una guida culturale europea esperta e appassionata. Generi script audio per audio 
guide di musei, chiese e monumenti. Il tuo stile è narrativo, coinvolgente, mai 
accademico. Usi storie reali, aneddoti verificati, curiosità inaspettate.

STRUTTURA OBBLIGATORIA:
- HOOK (0-15s): frase spiazzante o domanda retorica. 
  VIETATO iniziare con: 'Questa è...', 'Davanti a voi...', 'Benvenuti a...'
- SVILUPPO (15-75s): storia reale con personaggi, conflitti, risoluzione. 
- CURIOSITÀ FINALE (75-90s): il fatto più sorprendente viene tenuto per ultimo.
  Marca questo momento con il tag XML: <share_moment>testo condivisibile</share_moment>
- TRANSIZIONE (90-95s): anticipa il POI successivo senza spoilerarlo."""


class ScriptService:
    """Phase 3: Script Generation via Local Ollama LLM (Llama 3)"""

    @staticmethod
    async def generate_script(
        poi_data: Dict[str, Any],
        venue_info: Dict[str, Any],
        lang: str,
        tour_type: str,
        poi_index: int,
        total_pois: int,
        next_poi_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate a cultural audioguide script using the local Ollama LLM."""

        emphasis = CULTURAL_EMPHASIS.get(lang, CULTURAL_EMPHASIS["en"])
        instructions = TOUR_TYPE_INSTRUCTIONS.get(tour_type, TOUR_TYPE_INSTRUCTIONS["standard"])

        user_prompt = f"""Venue: {venue_info['name']}, {venue_info['type']}, {venue_info['city']}, {venue_info['country']}
POI corrente: {poi_data['name']}
Posizione: {poi_index} di {total_pois}
POI successivo: {next_poi_name or 'Fine tour'}

Conoscenza:
{json.dumps(poi_data.get('verified_knowledge', {}), ensure_ascii=False)}

Lingua: {lang}
Enfasi culturale: {emphasis}
Tour type: {tour_type}
{instructions}

Genera lo script. Rispetta la struttura. Includi il tag <share_moment>."""

        # --- Primary: Local Ollama (free, private, fast) ---
        try:
            result = await ScriptService._generate_via_ollama(user_prompt)
            if result and not result.get("error"):
                logger.info(f"Script generated via Ollama for POI '{poi_data['name']}' ({len(result.get('script', '').split())} words)")
                return result
            logger.warning(f"Ollama returned empty/error, attempting fallback...")
        except Exception as e:
            logger.warning(f"Ollama unavailable ({e}), attempting Claude fallback...")

        # --- Fallback: Claude API (if key present) ---
        anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if anthropic_key:
            try:
                return await ScriptService._generate_via_claude(user_prompt, anthropic_key)
            except Exception as e:
                logger.error(f"Claude fallback also failed: {e}")

        return {"error": "No LLM available. Ensure Ollama is running or set ANTHROPIC_API_KEY."}

    @staticmethod
    async def _generate_via_ollama(user_prompt: str) -> Dict[str, Any]:
        """Call the local Ollama API to generate the script."""
        url = f"{OLLAMA_BASE_URL}/api/chat"
        payload = {
            "model": OLLAMA_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            "stream": False,
            "options": {
                "num_predict": 800,
                "temperature": 0.7,
                "top_p": 0.9,
                "num_ctx": 4096,
            }
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        full_text = data.get("message", {}).get("content", "")
        if not full_text:
            return {"error": "Ollama returned empty content"}

        return ScriptService._parse_script(full_text)

    @staticmethod
    async def _generate_via_claude(user_prompt: str, api_key: str) -> Dict[str, Any]:
        """Fallback: call Claude API for script generation."""
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=api_key)
        message = await client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=1000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}]
        )
        full_text = message.content[0].text
        return ScriptService._parse_script(full_text)

    @staticmethod
    def _parse_script(full_text: str) -> Dict[str, Any]:
        """Extract share_moment tag and return structured result."""
        share_moment = ""
        if "<share_moment>" in full_text:
            try:
                share_moment = full_text.split("<share_moment>")[1].split("</share_moment>")[0]
            except IndexError:
                pass

        return {
            "script": full_text,
            "share_moment": share_moment,
            "word_count": len(full_text.split())
        }

