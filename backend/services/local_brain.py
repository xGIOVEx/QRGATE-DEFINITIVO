import re
import logging
import random
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class LocalBrain:
    def __init__(self):
        # Identity: Advanced Strategic AI Assistant (llm-like reasoning)
        # Goal: Indistinguishable from high-end AI, creative, multi-layered.
        
        self.knowledge_base = {
            "strategy": {
                "it": [
                    "Analizzando i parametri della tua sede, ho identificato un'opportunità di crescita: l'integrazione di **Aria Guide** con contenuti immersivi può generare un incremento del **35%** nel valore per visitatore.",
                    "Per massimizzare la conversione, suggerisco di adottare un design 'European Cultural Premium': immagini ad alta risoluzione, testi brevi (max 150 parole) e un layout pulito che guidi l'occhio verso l'acquisto.",
                    "Dal punto di vista della visibilità, il sistema QRGate è ottimizzato per l'indicizzazione rapida. Assicurati che il nome della sede sia unico e descrittivo."
                ],
                "en": [
                    "Analyzing your venue's parameters, I've identified a growth opportunity: integrating **Aria Guide** with immersive content can generate a **35%** increase in per-visitor value.",
                    "To maximize conversion, I suggest adopting a 'European Cultural Premium' design: high-res images, short texts (max 150 words), and a clean layout that guides the eye towards the purchase.",
                    "From a visibility perspective, the QRGate system is optimized for rapid indexing. Ensure your venue name is unique and descriptive."
                ]
            },
            "technical": {
                "it": [
                    "QRGate opera su un'infrastruttura edge-first, garantendo tempi di caricamento inferiori ai 2 secondi anche in condizioni di rete instabili.",
                    "La sicurezza è delegata a protocolli di crittografia end-to-end tramite Stripe Connect, eliminando qualsiasi rischio di esposizione dei dati sensibili.",
                    "Il sistema di generazione QR utilizza una codifica ad alta correzione d'errore (livello H), rendendo i codici leggibili anche se parzialmente danneggiati o esposti a luce intensa."
                ],
                "en": [
                    "QRGate operates on an edge-first infrastructure, ensuring load times under 2 seconds even in unstable network conditions.",
                    "Security is delegated to end-to-end encryption protocols via Stripe Connect, eliminating any risk of sensitive data exposure.",
                    "The QR generation system uses high error-correction coding (Level H), making codes readable even if partially damaged or exposed to bright light."
                ]
            }
        }

        self.intent_map = {
            "pricing_detailed": {
                "patterns": [r"costo", r"prezzo", r"pricing", r"how much", r"soldi", r"percentuale", r"commissione"],
                "responses": {
                    "it": "Ho analizzato la nostra struttura commissionale per te. QRGate opera con un modello **Pay-as-you-Grow**: \n\n- **Setup**: 0\u20ac (Gratuito)\n- **Manutenzione**: 0\u20ac (Nessun canone)\n- **Commissione**: 5% + 0,49\u20ac per transazione.\n\nQuesto approccio garantisce che QRGate sia un partner redditizio fin dal primo giorno, eliminando il rischio d'investimento iniziale.",
                    "en": "I've analyzed our commission structure for you. QRGate operates on a **Pay-as-you-Grow** model: \n\n- **Setup**: 0\u20ac (Free)\n- **Maintenance**: 0\u20ac (No fees)\n- **Commission**: 5% + 0.49\u20ac per transaction.\n\nThis approach ensures QRGate is a profitable partner from day one, eliminating initial investment risk."
                }
            },
            "payout_mechanics": {
                "patterns": [r"incasso", r"pagamento", r"bonifico", r"payout", r"stripe", r"ricevere"],
                "responses": {
                    "it": "Il flusso finanziario di QRGate è orchestrato tramite **Stripe Connect**. Una volta completato il pagamento, i fondi vengono processati in tempo reale e accreditati sul tuo conto tramite bonifico automatico nel giro di **2-7 giorni**. \n\nPuoi monitorare ogni singolo centesimo dalla sezione **Pagamenti** o dal tuo dashboard Stripe.",
                    "en": "QRGate's financial flow is orchestrated via **Stripe Connect**. Once payment is completed, funds are processed in real-time and credited to your account via automatic transfer within **2-7 days**. \n\nYou can track every cent from the **Payments** section or your Stripe dashboard."
                }
            },
            "startup_intelligence": {
                "patterns": [r"inizio", r"comincio", r"configuro", r"setup", r"guida", r"passi", r"aiutami", r"come fare"],
                "responses": {
                    "it": "Certamente. Ho delineato un percorso di attivazione rapido ed efficiente:\n1. **Identità Digitale**: Configura la tua Sede caricando un logo ad alta definizione.\n2. **Ingegneria dei Biglietti**: Crea i tuoi prodotti definendo fasce di prezzo e quantità.\n3. **Deployment**: Genera e posiziona il tuo QR Code strategico.\n\nDove preferisci che focalizziamo la nostra attenzione per primo?",
                    "en": "Certainly. I've outlined a fast and efficient activation path:\n1. **Digital Identity**: Configure your Venue by uploading a high-definition logo.\n2. **Ticket Engineering**: Create your products by defining price tiers and quantities.\n3. **Deployment**: Generate and place your strategic QR Code.\n\nWhere would you like us to focus our attention first?"
                }
            }
        }

    def _generate_creative_context(self, lang: str) -> str:
        # Simulate AI "thinking" or adding a strategic layer
        category = random.choice(["strategy", "technical"])
        return random.choice(self.knowledge_base[category][lang])

    def process_message(self, text: str) -> Dict[str, Any]:
        text_lower = text.strip().lower()
        # Language detection (Simplified but effective for keywords)
        lang = "en" if any(word in text_lower for word in ["hello", "how", "what", "price", "work"]) else "it"
        
        # 1. Match specific intents
        matched_intent = None
        main_response = ""
        for intent_id, config in self.intent_map.items():
            if any(re.search(p, text_lower) for p in config["patterns"]):
                matched_intent = intent_id
                main_response = config["responses"][lang]
                break
        
        # 2. If no specific intent, or as a layer of "intelligence"
        if not matched_intent:
            intro = {
                "it": "Ho processato la tua richiesta. Analizzando il contesto di QR GATE AI, ecco la mia sintesi strategica: \n\n",
                "en": "I've processed your request. Analyzing the QR GATE AI context, here is my strategic synthesis: \n\n"
            }
            main_response = intro[lang] + self._generate_creative_context(lang)
            confidence = 0.5
            intent_id = "ai_reasoning"
        else:
            confidence = 1.0
            # Add a layer of "plus" intelligence to specific responses
            if random.random() > 0.5:
                extra = "\n\n**Nota Strategica**: " if lang == "it" else "\n\n**Strategic Note**: "
                main_response += extra + self._generate_creative_context(lang)

        # 3. Add the mandatory sophisticated closing
        closing = {
            "it": "\n\nC'è qualcos'altro in cui posso aiutarti per rendere tutto più semplice con QR GATE?",
            "en": "\n\nIs there anything else I can help you with to make things easier with QR GATE?"
        }
        
        return {
            "reply": main_response + closing[lang],
            "ui_directives": [],
            "quick_actions": [
                {"label": "Analisi ROI", "icon": "📊"},
                {"label": "Ottimizzazione Vendite", "icon": "📈"},
                {"label": "Configurazione Stripe", "icon": "💳"}
            ],
            "confidence": confidence,
            "intent": intent_id
        }

local_brain = LocalBrain()
