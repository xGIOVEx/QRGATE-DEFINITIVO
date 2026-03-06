import json
import logging
import os
import re
import httpx
from typing import Any, List, Optional, AsyncIterator
from datetime import datetime, timezone
from pydantic import BaseModel

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.environ.get("OLLAMA_MODEL", "mistral")
OPENAI_KEY      = os.environ.get("OPENAI_API_KEY", "")

DESTRUCTIVE_TOOLS  = {"refund_order", "update_ticket_price"}
CONFIRM_KEYWORDS   = {"confermo", "sì", "si", "yes", "confirm"}

def _requires_confirmation(tool_name: str, messages: list) -> bool:
    if tool_name not in DESTRUCTIVE_TOOLS:
        return False
    last = next((m for m in reversed(messages) if m.get("role") == "user"), None)
    if not last:
        return True
    return not any(kw in last.get("content", "").lower() for kw in CONFIRM_KEYWORDS)


class AriaService:
    def __init__(self):
        self.model = OLLAMA_MODEL
        self.system_instructions = """Tu sei Aria — l'intelligenza artificiale integrata in QRGate, la piattaforma europea di biglietteria digitale per musei, chiese, monumenti e siti culturali.

IDENTITÀ
Il tuo nome è Aria. Non sei un bot. Non sei una FAQ. Sei una collega esperta che conosce QRGate meglio di chiunque altro. Hai aiutato centinaia di musei europei. Vai sempre al punto.

LINGUA
Rileva automaticamente la lingua dell'utente. Rispondi sempre nella sua lingua. Non chiedere mai. Lingue supportate: italiano, inglese, tedesco, francese, spagnolo, portoghese, olandese, polacco, svedese, danese, finlandese, greco, rumeno, ungherese, russo, turco, arabo, giapponese, cinese, coreano, hindi.

TONO PER CONTESTO
- context=dashboard (venue manager): professionale ma caldo, usa "tu", vai al punto, celebra i successi.
- context=visitor (visitatore): brevissimo, max 2-3 frasi, zero gergo tecnico.
- context=scanner (staff): una frase sola, soluzione immediata, niente saluti.

COSA SAI DI QRGATE

Prezzi: nessun canone fisso. €0,49 + 5% per biglietto venduto. Solo sul venduto. Su un biglietto da €10 al venue arrivano €9,02.
Audioguide Aria Guide: il venue guadagna il 35% di ogni vendita (prezzo visitatore €3-5).
Pagamenti: fondi su IBAN ogni 2 giorni lavorativi via Stripe. Automatico.
Nessun contratto. Nessuna carta di credito per registrarsi.

REGISTRAZIONE — 8 step, circa 12 minuti:
1. qrgate.io → "Attiva gratis"
2. Tipo di struttura (museo, chiesa, monumento, palazzo, sito archeologico, parco storico, ecc.)
3. Nome struttura, email e password
4. Crea biglietti con nomi e prezzi
5. IBAN aziendale per ricevere i pagamenti
6. Logo (quadrato) e foto copertina (16:9) — opzionale ma +40% conversioni
7. Colore tema per la pagina pubblica
8. Orari di apertura
Dopo la registrazione: Dashboard → Impostazioni → Scarica Poster A4 → incornicialo all'ingresso.

FUNZIONALITÀ:
- Dashboard analytics: revenue, biglietti, nazionalità visitatori, fasce orarie, tasso conversione
- Biglietti: tipi (intero, ridotto, gratuito, famiglia), attiva/disattiva
- Fasce orarie e capacità: slot da 1 ora, lista d'attesa automatica
- Codici promo: sconto % o fisso, scadenza, limite utilizzi
- Staff e scanner: account scanner per personale, funziona offline con sync automatica
- Export: CSV ordini, PDF report mensili
- Abbonamenti stagionali: pass annuali e multi-ingresso
- Apple Wallet e Google Wallet integrati
- Pagina pubblica qrgate.io/nome-museo: SEO ottimizzata, 20 lingue automatiche — nessun sito web richiesto
- Rimborsi: Dashboard → Ordini → seleziona → Rimborsa (5-10 giorni lavorativi)

ANALYTICS — spiegazione metriche:
- Revenue lordo: totale pagato dai visitatori prima delle commissioni
- Revenue netto: quello che arriva sul tuo IBAN (tolte commissioni QRGate ~5,49%)
- Tasso conversione: % di chi apre la pagina e acquista (media settore: 18-24%)
- Biglietti venduti: conta i singoli biglietti, non gli ordini
- Nazionalità: da dove arrivano i visitatori — utile per decidere le lingue prioritarie
- Fascia oraria di punta: quando arriva il maggior numero di visitatori
- Valore medio ordine: revenue totale diviso numero di ordini

PROBLEMI FREQUENTI — risposte pronte:
"Non ricevo l'email biglietto" → Controlla spam e cartella Promozioni. Se non c'è, dimmi l'email usata e verifico l'ordine.
"Ho pagato ma non ho il biglietto" → Dimmi l'email usata al checkout e trovo l'ordine subito.
"QR non scansiona" → Aumenta la luminosità dello schermo del visitatore. Se non basta: Dashboard → Ordini → cerca l'ordine → Valida manualmente.
"Come rimborso" → Dashboard → Ordini → clicca sull'ordine → pulsante Rimborsa.
"Come scarico il poster QR" → Dashboard → Impostazioni → sezione QR Code → Scarica Poster A4.
"Come aggiungo staff" → Dashboard → Staff → Nuovo Account Scanner → inserisci email dello staff.
"Stripe non è collegato" → Dashboard → Pagamenti → Collega Stripe. Ci vogliono 10 minuti e un documento d'identità del legale rappresentante.
"Come cambio i prezzi" → Dashboard → Biglietti → clicca sul biglietto → modifica prezzo → Salva.
"Non ho un sito web" → Nessun problema. QRGate ti crea automaticamente una pagina pubblica professionale su qrgate.io/nome-tuo-museo con foto, orari, descrizione in 20 lingue e biglietteria integrata. È già ottimizzata per Google.
"Quanto tempo per ricevere i soldi" → I pagamenti arrivano ogni 2 giorni lavorativi automaticamente, come un bonifico.
"App scanner offline" → Normale e previsto. Funziona senza internet. I dati si sincronizzano appena torna il segnale.
"Come funziona Aria Guide" → È l'audioguida AI in 20 lingue. I visitatori la comprano al checkout. Tu guadagni il 35% di ogni vendita. Si attiva da Dashboard → Impostazioni → Aria Guide.

LIMITI ASSOLUTI — NON VIOLARE MAI:
- Non eseguire rimborsi senza conferma esplicita dell'utente
- Non mostrare IBAN completi (solo ultimi 4 caratteri)
- Non rivelare email complete di altri utenti
- Non inventare prezzi, funzionalità o policy
- Non dare consigli medici, fiscali, legali
- Se non sai: "Non ho questa informazione. Scrivi a support@qrgate.io — rispondono entro 2 ore."

FORMATO RISPOSTE:
- Breve. Una idea per risposta.
- Usa **grassetto** per i percorsi nel Dashboard
- Usa 1. 2. 3. per istruzioni sequenziali
- MAI iniziare con: "Certo!", "Assolutamente!", "Ottima domanda!"
- MAI terminare con: "Spero di esserti stato utile!", "Resto a disposizione!"
- Se la domanda non riguarda QRGate: rispondi brevemente, poi reindirizza.

ESEMPI CORRETTI:
Utente "ciao" → "Ciao! Sono Aria. Dimmi cosa ti serve."
Utente "come mi registro?" → "Vai su qrgate.io e clicca 'Attiva gratis'. Ti guidano 8 domande — tipo struttura, prezzi, IBAN, foto. In media 12 minuti. Vuoi che ti accompagno passo passo?"
Utente "quanto costano le commissioni?" → "€0,49 + 5% per biglietto. Zero canone fisso. Su un biglietto da €10 ti arrivano €9,02."
Utente "non capisco le analytics" → "Quale numero ti confonde? Dimmi cosa stai guardando e te lo spiego."
Utente "ho pagato ma non ho ricevuto niente" → "Dimmi l'email usata al checkout e verifico subito l'ordine."

=== AZIONI DISPONIBILI ===
Puoi eseguire azioni scrivendo nella risposta un blocco tra [ACTION] e [/ACTION]:

[ACTION]{"tool": "find_order", "query": "email@esempio.it"}[/ACTION]
→ Cerca un ordine tramite email del visitatore o ID ordine

[ACTION]{"tool": "refund_order", "order_id": "ORD-123"}[/ACTION]
→ Rimborsa un ordine (SOLO dopo conferma esplicita dell'utente che ha scritto "confermo")

[ACTION]{"tool": "update_ticket_price", "ticket_id": "TKT-123", "new_price_cents": 1000}[/ACTION]
→ Aggiorna prezzo biglietto in centesimi (SOLO dopo conferma esplicita)

[ACTION]{"tool": "resend_ticket_email", "ticket_id": "TKT-123"}[/ACTION]
→ Reinvia email con biglietto al visitatore

[ACTION]{"tool": "escalate_to_support", "issue_description": "...", "priority": "urgent"}[/ACTION]
→ Crea ticket di supporto urgente per il team QRGate

[ACTION]{"tool": "get_payout_breakdown", "venue_id": "...", "period": "30d"}[/ACTION]
→ Mostra dettaglio bonifici per un periodo

[ACTION]{"tool": "ui_action_force_sync"}[/ACTION]
→ Forza sincronizzazione app scanner

Usa le azioni solo quando necessario. Dopo averle eseguite, riporta il risultato in linguaggio naturale.
"""

    def _build_context(self, context: dict) -> str:
        role = context.get("user_role", "unknown")
        ctx = f"\n\n=== CONTESTO UTENTE ({role.upper()}) ===\n"
        for k, v in context.items():
            ctx += f"{k}: {v}\n"
        ctx += "Usa questi dati per personalizzare la risposta. Non chiedere info già presenti qui.\n"
        return ctx

    def _prepare(self, context: dict, messages: list) -> list:
        system = self.system_instructions + self._build_context(context)
        result = [{"role": "system", "content": system}]
        for m in messages:
            if m.get("role") in ("user", "assistant") and m.get("content"):
                result.append({"role": m["role"], "content": m["content"]})
        return result

    def _parse_actions(self, text: str):
        pattern = r'\[ACTION\](.*?)\[/ACTION\]'
        matches = re.findall(pattern, text, re.DOTALL)
        clean = re.sub(pattern, '', text, flags=re.DOTALL).strip()
        calls = []
        for m in matches:
            try:
                calls.append(json.loads(m.strip()))
            except Exception:
                pass
        return clean, calls

    async def _call_ollama(self, messages: list) -> str:
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": 0.65, 
                "top_p": 0.9, 
                "num_predict": 400, # Reduce max tokens for faster response
                "num_ctx": 4096, # Set explicit context window
                "use_mmap": True,
                "use_mlock": False # Let OS manage RAM swapping
            }
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as c:
                r = await c.post(f"{OLLAMA_BASE_URL}/api/chat", json=payload)
                r.raise_for_status()
                return r.json().get("message", {}).get("content", "")
        except Exception as e:
            import traceback
            logger.warning(f"[Aria] Ollama error: {e}\n{traceback.format_exc()}. Tentativo fallback.")
            return await self._fallback(messages)

    async def _fallback(self, messages: list) -> str:
        if not OPENAI_KEY:
            return "Sono temporaneamente non disponibile. Scrivi a support@qrgate.io — rispondono entro 2 ore."
        try:
            from openai import AsyncOpenAI
            r = await AsyncOpenAI(api_key=OPENAI_KEY).chat.completions.create(
                model="gpt-4o-mini", messages=messages, max_tokens=600, temperature=0.65
            )
            return r.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"[Aria] Fallback error: {e}")
            return "Sono temporaneamente non disponibile. Scrivi a support@qrgate.io"

    async def _stream_ollama(self, messages: list):
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": True,
            "options": {"temperature": 0.65, "num_predict": 600}
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as c:
                async with c.stream("POST", f"{OLLAMA_BASE_URL}/api/chat", json=payload) as r:
                    async for line in r.aiter_lines():
                        if line:
                            try:
                                chunk = json.loads(line)
                                delta = chunk.get("message", {}).get("content", "")
                                if delta:
                                    yield delta
                                if chunk.get("done"):
                                    break
                            except Exception:
                                continue
        except Exception as e:
            logger.error(f"[Aria] Stream error: {e}")
            yield "Mi dispiace, si è verificato un errore momentaneo."

    async def execute_tool(self, tool_name: str, args: dict, db_client: Any, messages: list = None) -> dict:
        logger.info(f"[Aria] Tool: {tool_name} args={args}")
        if _requires_confirmation(tool_name, messages or []):
            return {"status": "awaiting_confirmation", "message": "Per procedere ho bisogno della tua conferma esplicita. Scrivi 'confermo' per continuare."}
        try:
            if tool_name.startswith("ui_action_"):
                return {"status": "success", "ui_directive": tool_name, "directives_payload": args, "message": "Azione inviata alla UI."}
            if tool_name == "find_order":
                q = args.get("query", "")
                if db_client:
                    order = await db_client.orders.find_one({"$or": [{"id": q}, {"visitor_email": q}]}, {"_id": 0})
                    if order:
                        if "visitor_email" in order:
                            parts = order["visitor_email"].split("@")
                            order["visitor_email"] = parts[0][:2] + "***@" + parts[1] if len(parts) == 2 else "***"
                        return {"status": "success", "order": order}
                    return {"status": "not_found", "message": "Nessun ordine trovato con questa email o ID."}
                return {"status": "mock", "order": {"id": q, "status": "paid"}}
            if tool_name == "refund_order":
                oid = args.get("order_id")
                if db_client:
                    await db_client.orders.update_one({"id": oid}, {"$set": {"stripe_payment_status": "refunded", "status": "refunded", "active": False}})
                return {"status": "success", "message": f"Ordine {oid} rimborsato. I fondi arriveranno entro 5-10 giorni lavorativi."}
            if tool_name == "update_ticket_price":
                tid, price = args.get("ticket_id"), args.get("new_price_cents", 0)
                if db_client:
                    res = await db_client.tickets.update_one({"id": tid}, {"$set": {"price": price}})
                    return {"status": "success", "message": f"Prezzo aggiornato a {price/100:.2f}€" if res.modified_count > 0 else "Biglietto non trovato."}
                return {"status": "mock", "message": f"Prezzo impostato a {price/100:.2f}€"}
            if tool_name == "resend_ticket_email":
                return {"status": "success", "message": "Email reinviata. Il visitatore dovrebbe riceverla entro 2 minuti."}
            if tool_name == "escalate_to_support":
                return {"status": "success", "ticket_id": f"ESC-{datetime.now().strftime('%H%M%S')}", "message": "Il team è stato avvisato e risponderà entro 2 ore."}
            if tool_name == "get_payout_breakdown":
                return {"status": "success", "breakdown": {"period": args.get("period", "30d"), "note": "Collega Stripe per i dati reali."}}
            return {"status": "error", "message": "Azione non riconosciuta."}
        except Exception as e:
            logger.error(f"[Aria] Tool error {tool_name}: {e}")
            return {"status": "error", "message": str(e)}

    async def handle_chat_message(self, context: dict, messages: list, db_client: Any = None) -> dict:
        prepared = self._prepare(context, messages)
        raw = await self._call_ollama(prepared)
        clean, tool_calls = self._parse_actions(raw)
        ui_directives = []
        if tool_calls:
            extra = ""
            for tc in tool_calls:
                name = tc.pop("tool", "")
                result = await self.execute_tool(name, tc, db_client, messages)
                if result.get("ui_directive"):
                    ui_directives.append({"action": result["ui_directive"], "payload": result.get("directives_payload", {})})
                if result.get("message"):
                    extra += f"\nRisultato '{name}': {result['message']}"
                if result.get("order"):
                    extra += f"\nDati: {json.dumps(result['order'], ensure_ascii=False)}"
            if extra:
                synth = prepared + [
                    {"role": "assistant", "content": clean},
                    {"role": "user", "content": f"[SISTEMA]{extra}\nRispondi all'utente in base a questi dati."}
                ]
                clean, _ = self._parse_actions(await self._call_ollama(synth))
        quick_actions = []
        qa = re.search(r'\[QA\](.*?)\[/QA\]', clean, re.DOTALL)
        if qa:
            try:
                quick_actions = json.loads(qa.group(1))
                clean = clean.replace(qa.group(0), "").strip()
            except Exception:
                pass
        return {"reply": clean.strip(), "ui_directives": ui_directives, "quick_actions": quick_actions}

    async def stream_chat_message(self, context: dict, messages: list, db_client: Any = None) -> AsyncIterator[str]:
        prepared = self._prepare(context, messages)
        full = ""
        try:
            async for chunk in self._stream_ollama(prepared):
                full += chunk
                yield f'data: {json.dumps({"delta": chunk}, ensure_ascii=False)}\n\n'
        except Exception as e:
            logger.error(f"[Aria] Stream error: {e}")
            yield f'data: {json.dumps({"delta": "Mi dispiace, errore momentaneo."})}\n\n'
        _, tool_calls = self._parse_actions(full)
        ui_dirs = []
        for tc in tool_calls:
            name = tc.pop("tool", "")
            r = await self.execute_tool(name, tc, db_client, messages)
            if r.get("ui_directive"):
                ui_dirs.append({"action": r["ui_directive"], "payload": r.get("directives_payload", {})})
        if ui_dirs:
            yield f'data: {json.dumps({"ui_directives": ui_dirs})}\n\n'
        yield 'data: [DONE]\n\n'


aria_service = AriaService()
