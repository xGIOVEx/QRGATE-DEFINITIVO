import logging
from services.email_service import EmailService

logger = logging.getLogger(__name__)

class NurtureService:
    """Handles logic for the 7-Day Welcome Sequence and the 30-Day Re-engagement Sequence"""

    @staticmethod
    async def send_day_0_welcome(venue_email: str, venue_name: str, language: str = "it") -> bool:
        """Giorno 0: Benvenuto + Micro-Impegno (Reciprocità)"""
        subject = {
            "it": "Benvenuto in QRGate! Fai il primo passo 🚀",
            "en": "Welcome to QRGate! Take your first step 🚀"
        }.get(language, "Benvenuto in QRGate! Fai il primo passo 🚀")

        content = {
            "it": f"Ciao {venue_name}, benvenuto a bordo! Hai l'opportunità di digitalizzare il tuo ingresso oggi stesso. Aggiungi il tuo primo biglietto in meno di 60 secondi.",
            "en": f"Hi {venue_name}, welcome aboard! You have the opportunity to digitize your entrance today. Add your first ticket in under 60 seconds."
        }.get(language)

        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
            <h2 style="color: #1E3A5F;">{subject}</h2>
            <p style="color: #333; line-height: 1.6;">{content}</p>
            <a href="https://qrgate.com/dashboard/tickets" style="display: inline-block; padding: 12px 24px; background: #00C896; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Crea il tuo primo biglietto</a>
        </div>
        """
        return await EmailService._send_async(venue_email, subject, html)

    @staticmethod
    async def send_day_1_case_study(venue_email: str, venue_name: str, language: str = "it") -> bool:
        """Giorno 1: Case Study (Riprova Sociale)"""
        subject = {
            "it": "Come il Museo X ha aumentato gli incassi del +34%",
            "en": "How Museum X increased revenue by +34%"
        }.get(language, "Come il Museo X ha aumentato gli incassi del +34%")

        content = {
            "it": f"Ciao {venue_name}, lo sapevi che introducendo un QR rapido all'ingresso, il Museo Civico di Storia ha visto un incremento del 34% nelle vendite dirette il primo weekend? Leggi il nostro caso studio veloce.",
            "en": f"Hi {venue_name}, did you know that by introducing a quick QR at the entrance, the Civic History Museum saw a 34% increase in direct sales their first weekend? Read our quick case study."
        }.get(language)

        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
            <h2 style="color: #1E3A5F;">{subject}</h2>
            <p style="color: #333; line-height: 1.6;">{content}</p>
            <div style="background: #F8F9FB; padding: 15px; border-left: 4px solid #1E3A5F; margin: 20px 0;">
                <p style="margin:0; font-style: italic;">"Da quando abbiamo esposto il QR QRGate, le code sono sparite e gli incassi aumentati." - Direttore Museo Civico</p>
            </div>
        </div>
        """
        return await EmailService._send_async(venue_email, subject, html)

    @staticmethod
    async def send_day_3_loss_aversion(venue_email: str, venue_name: str, language: str = "it") -> bool:
        """Giorno 3: La Paura di Perdere (Avversione alla Perdita)"""
        subject = {
            "it": "Stai perdendo donazioni preziose...",
            "en": "You are losing valuable donations..."
        }.get(language, "Stai perdendo donazioni preziose...")

        content = {
            "it": f"Ogni giorno senza QRGate attivo, la tua struttura({venue_name}) sta perdendo centinaia di euro in biglietti last-minute e micro-donazioni spontanee. Guarda quanto potresti raccogliere nel nostro simulatore.",
            "en": f"Every day without QRGate active, your venue ({venue_name}) is losing hundreds in last-minute tickets and spontaneous micro-donations. See how much you could collect in our simulator."
        }.get(language)

        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
            <h2 style="color: #E11D48;">{subject}</h2>
            <p style="color: #333; line-height: 1.6;">{content}</p>
            <a href="https://qrgate.com/dashboard/settings" style="display: inline-block; padding: 12px 24px; background: #E11D48; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Attiva le Donazioni Ora</a>
        </div>
        """
        return await EmailService._send_async(venue_email, subject, html)

    @staticmethod
    async def send_day_7_zeigarnik(venue_email: str, venue_name: str, language: str = "it") -> bool:
        """Giorno 7: L'Ultima Chiamata (Zeigarnik Effect)"""
        subject = {
            "it": "⚠️ Il tuo profilo QRGate è incompleto",
            "en": "⚠️ Your QRGate profile is incomplete"
        }.get(language, "⚠️ Il tuo profilo QRGate è incompleto")

        content = {
            "it": f"{venue_name}, hai fatto quasi tutto il lavoro duro! Sei al 90% dell'attivazione. Ti manca letteralmente 1 solo passo per poter iniziare a incassare automaticamente.",
            "en": f"{venue_name}, you did almost all the hard work! You are 90% activated. You literally miss 1 single step to start collecting automatically."
        }.get(language)

        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
            <h2 style="color: #F59E0B;">{subject}</h2>
            <p style="color: #333; line-height: 1.6;">{content}</p>
            
            <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="font-weight: bold; margin: 0 0 10px 0;">Completamento: 90%</p>
                <div style="width: 100%; height: 8px; background: #FEF3C7; border-radius: 4px;">
                    <div style="width: 90%; height: 100%; background: #F59E0B; border-radius: 4px;"></div>
                </div>
            </div>

            <a href="https://qrgate.com/dashboard" style="display: inline-block; padding: 12px 24px; background: #1E3A5F; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">Completa l'ultimo step</a>
        </div>
        """
        return await EmailService._send_async(venue_email, subject, html)

    # ---------------- 30-Day Re-engagement Sequence ----------------

    @staticmethod
    async def send_reengage_email_1(venue_email: str, venue_name: str, language: str = "it") -> bool:
        """Email 1: Tutto bene? (Helpful tone)"""
        subject = {
            "it": "Tutto bene con il tuo account QRGate?",
            "en": "Everything okay with your QRGate account?"
        }.get(language, "Tutto bene con il tuo account QRGate?")
        html = f"<p>Ciao {venue_name}, abbiamo notato che hai creato l'account ma non hai ancora scansionato il tuo primo biglietto. Ti serve aiuto per configurare le tue tariffe?</p>"
        return await EmailService._send_async(venue_email, subject, html)

    @staticmethod
    async def send_reengage_email_2(venue_email: str, venue_name: str, language: str = "it") -> bool:
        """Email 2: Nuova Funzione"""
        subject = {
            "it": "✨ Novità per te: Donazioni dirette attivate",
            "en": "✨ News for you: Direct donations enabled"
        }.get(language, "✨ Novità per te: Donazioni dirette attivate")
        html = f"<p>{venue_name}, hai visto la nuova funzione Donazioni? Entra per scoprirla!</p>"
        return await EmailService._send_async(venue_email, subject, html)

    @staticmethod
    async def send_reengage_email_3(venue_email: str, venue_name: str, language: str = "it") -> bool:
        """Email 3: Scarsità"""
        subject = {
            "it": "⏳ Il tuo account gratuito rischia l'archiviazione",
            "en": "⏳ Your free account risks archiving"
        }.get(language, "⏳ Il tuo account gratuito rischia l'archiviazione")
        html = f"<p>Attenzione {venue_name}! A causa di inattività, il tuo account verrà limitato tra 7 giorni. Accedi ora per mantenerlo attivo.</p>"
        return await EmailService._send_async(venue_email, subject, html)

    @staticmethod
    async def send_reengage_email_4(venue_email: str, venue_name: str, language: str = "it") -> bool:
        """Email 4: Addio + Ultimatum"""
        subject = {
            "it": "👋 Addio. Stiamo chiudendo il tuo account.",
            "en": "👋 Goodbye. We are closing your account."
        }.get(language, "👋 Addio. Stiamo chiudendo il tuo account.")
        html = f"<p>È stato bello conoscerti, {venue_name}. Stiamo procedendo alla chiusura dell'account per inattività. Se si tratta di un errore, clicca il link sotto entro 24 ore.</p>"
        return await EmailService._send_async(venue_email, subject, html)
