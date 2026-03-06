import os
import logging
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class EmailService:
    """Class exposing static methods for sending templated emails via Postmark."""
    
    POSTMARK_URL = "https://api.postmarkapp.com/email"
    
    @staticmethod
    def _get_api_key() -> str:
        return os.environ.get('POSTMARK_SERVER_TOKEN', '')
    
    @staticmethod
    def _get_from_email() -> str:
        return os.environ.get('FROM_EMAIL', 'hello@qrgate.com')

    @staticmethod
    async def _send_async(to: str, subject: str, html_body: str, message_stream: str = "outbound") -> bool:
        """Asynchronously send an email via Postmark API directly."""
        api_key = EmailService._get_api_key()
        if not api_key:
            logger.info("=" * 60)
            logger.info(f"[POSTMARK MOCK] To: {to} | Stream: {message_stream}")
            logger.info(f"Subject: {subject}")
            logger.info("=" * 60)
            return True
            
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": api_key
        }
        
        payload = {
            "From": EmailService._get_from_email(),
            "To": to,
            "Subject": subject,
            "HtmlBody": html_body,
            "MessageStream": message_stream
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(EmailService.POSTMARK_URL, json=payload, headers=headers)
                response.raise_for_status()
                logger.info(f"Postmark sent to {to}: {subject}")
                return True
        except Exception as e:
            logger.error(f"Postmark delivery failed to {to}: {str(e)}")
            raise e # Let ARQ handle retries

    # =========================================================================
    # EMAIL 1: CONFERMA ORDINE SINGOLO
    # =========================================================================
    @staticmethod
    async def send_single_order_confirmation(
        buyer_email: str,
        venue_name: str,
        venue_image_url: str,
        visit_date_formatted: str,
        qr_base64: str,
        pdf_download_url: str,
        guide_pwa_url: Optional[str] = None,
        venue_address: str = "",
        venue_maps_url: str = ""
    ) -> bool:
        subject = f"Il tuo biglietto per {venue_name} è pronto ✓"
        
        guide_section = ""
        if guide_pwa_url:
            guide_section = f"""
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 24px; margin: 32px 0;">
                <h3 style="margin-top: 0; color: #0F172A; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                    🎧 La tua Audio Guida è pronta
                </h3>
                <p style="color: #475569; margin-bottom: 20px; font-size: 15px;">
                    Apri il link ora: al museo si caricherà istantaneamente e funzionerà anche senza WiFi.
                </p>
                <a href="{guide_pwa_url}" style="display: block; width: 100%; text-align: center; background-color: #D4AF37; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Scarica la guida ora
                </a>
            </div>
            """

        html = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #F1F5F9;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; overflow: hidden;">
                <!-- Hero -->
                <div style="height: 200px; background-image: url('{venue_image_url}'); background-size: cover; background-position: center; position: relative;">
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); padding: 24px;">
                        <h1 style="color: white; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">{venue_name}</h1>
                    </div>
                </div>

                <div style="padding: 32px 24px;">
                    <p style="font-size: 18px; color: #0F172A; font-weight: 500; margin-top: 0;">
                        Tutto pronto per {visit_date_formatted}
                    </p>
                    
                    <div style="text-align: center; margin: 32px 0;">
                        <img src="data:image/png;base64,{qr_base64}" width="250" height="250" style="border: 1px solid #E2E8F0; border-radius: 16px; padding: 16px;" alt="Ticket QR" />
                    </div>

                    <a href="{pdf_download_url}" style="display: block; width: 100%; text-align: center; background-color: #0F172A; color: white; padding: 16px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin-bottom: 16px;">
                        Scarica come PDF
                    </a>

                    {guide_section}
                </div>

                <!-- Footer -->
                <div style="background-color: #F8FAFC; padding: 32px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
                    <p style="margin: 0 0 8px 0; color: #0F172A; font-weight: bold;">{venue_name}</p>
                    <p style="margin: 0 0 16px 0; color: #475569; font-size: 14px;">{venue_address}</p>
                    <a href="{venue_maps_url}" style="color: #2563EB; text-decoration: none; font-size: 14px; font-weight: 500;">Apri in Google Maps →</a>
                </div>
            </div>
        </body>
        </html>
        """
        return await EmailService._send_async(buyer_email, subject, html, "transactional")

    # =========================================================================
    # EMAIL 2: CONFERMA ORDINE GRUPPO (Single Email)
    # =========================================================================
    @staticmethod
    async def send_group_order_confirmation(
        buyer_email: str,
        venue_name: str,
        tickets_list: List[Dict[str, Any]], # { qr_base64, share_url, guide_url }
    ) -> bool:
        total = len(tickets_list)
        subject = f"Il tuo gruppo è pronto — {total} biglietti per {venue_name}"
        
        tickets_html = ""
        for idx, t in enumerate(tickets_list):
            guide_btn = f'<a href="{t["guide_url"]}" style="display:inline-block; margin-top:12px; color:#D4AF37; font-weight:bold; text-decoration:none;">🎧 Apri Audio Guida</a>' if t.get("guide_url") else ""
            tickets_html += f"""
            <div style="border: 1px solid #E2E8F0; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
                <p style="margin: 0 0 16px 0; color: #475569; font-weight: bold; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Biglietto {idx + 1} di {total}</p>
                <img src="data:image/png;base64,{t['qr_base64']}" width="200" height="200" style="margin-bottom: 16px;" alt="QR" />
                <br/>
                <a href="{t['share_url']}" style="display:inline-block; background-color:#25D366; color:white; padding:10px 20px; text-decoration:none; border-radius:8px; font-weight:bold; font-size:14px;">
                    Condividi su WhatsApp
                </a>
                <br/>
                {guide_btn}
            </div>
            """

        html = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, sans-serif; margin: 0; padding: 0; background-color: #F1F5F9;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; padding: 32px 24px;">
                <h1 style="color: #0F172A; margin: 0 0 32px 0; font-size: 24px; text-align: center;">
                    {total} biglietti pronti per {venue_name}
                </h1>
                
                {tickets_html}

                <a href="https://wa.me/?text=Ecco i nostri biglietti per {venue_name}" style="display: block; width: 100%; text-align: center; background-color: #0F172A; color: white; padding: 16px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin-top: 32px;">
                    Condividi tutto il gruppo su WhatsApp
                </a>
            </div>
        </body>
        </html>
        """
        return await EmailService._send_async(buyer_email, subject, html, "transactional")

    # =========================================================================
    # EMAIL 3: ONBOARDING DROP (AUTOMATIC SEQUENCE)
    # =========================================================================
    @staticmethod
    async def send_onboarding_drop_1h(venue_email: str, venue_name: str, checkout_preview_url: str) -> bool:
        subject = f"{venue_name} — il tuo link è già pronto"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0F172A;">Manca pochissimo.</h2>
            <p>Il setup di <strong>{venue_name}</strong> è quasi completo — mancano solo 3 minuti.</p>
            <div style="background: #F1F5F9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <p style="color: #475569; margin-bottom: 16px;">Questa è l'anteprima della tua biglietteria:</p>
                <img src="{checkout_preview_url}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
            </div>
            <a href="https://qrgate.com/onboarding" style="display: inline-block; background: #000; color: #fff; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Riprendi il setup
            </a>
            <p style="font-size: 12px; color: #94A3B8; margin-top: 40px; text-align: center;">
                <a href="{{{{unsubscribe_url}}}}" style="color: #94A3B8;">Annulla iscrizione</a>
            </p>
        </div>
        """
        return await EmailService._send_async(venue_email, subject, html, "marketing")

    @staticmethod
    async def send_onboarding_drop_24h(venue_email: str, venue_name: str) -> bool:
        subject = f"Hai 10 minuti? {venue_name} non è ancora attivo"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1E293B; line-height: 1.6;">
            <p>Ieri, musei simili al tuo in Europa hanno venduto biglietti online incrementando l'affluenza del 12%.</p>
            <p>Ogni giorno senza QRGate equivale a visitatori che non possono comprare in anticipo e finiscono per rinunciare.</p>
            <br>
            <a href="https://qrgate.com/onboarding" style="display: inline-block; background: #000; color: #fff; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Completa ora in 10 minuti
            </a>
            <p style="font-size: 12px; color: #94A3B8; margin-top: 40px; text-align: center;">
                <a href="{{{{unsubscribe_url}}}}" style="color: #94A3B8;">Annulla iscrizione</a>
            </p>
        </div>
        """
        return await EmailService._send_async(venue_email, subject, html, "marketing")

    @staticmethod
    async def send_onboarding_drop_72h_founder(venue_email: str, venue_name: str) -> bool:
        subject = "Possiamo aiutarti? (risposta garantita entro 1 ora)"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1E293B; line-height: 1.6;">
            <p>Ciao,</p>
            <p>Sono Giovanni, founder di QRGate.</p>
            <p>Ho visto che hai iniziato il setup di {venue_name} tre giorni fa, ma non l'hai ancora attivato.</p>
            <p>Posso aiutarti a completarlo in una chiamata di 10 minuti? Spesso basta un clic per risolvere eventuali dubbi su Stripe o sui prezzi.</p>
            <br>
            <a href="https://calendly.com/giovanni-qrgate" style="display: inline-block; background: #2563EB; color: #fff; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Prenota una call con me
            </a>
            <p style="margin-top: 30px;">A presto,<br>Giovanni</p>
            <p style="font-size: 12px; color: #94A3B8; margin-top: 40px; text-align: center;">
                <a href="{{{{unsubscribe_url}}}}" style="color: #94A3B8;">Annulla iscrizione</a>
            </p>
        </div>
        """
        return await EmailService._send_async(venue_email, subject, html, "marketing")

    # =========================================================================
    # EMAIL 4: PRIMO BIGLIETTO VENDUTO
    # =========================================================================
    @staticmethod
    async def send_first_sale_alert(
        venue_email: str, 
        amount_net_euro: str, 
        visitor_name: str,
        stories_enabled: bool = False
    ) -> bool:
        subject = "🎉 Il tuo primo biglietto su QRGate!"
        
        upsell = ""
        if not stories_enabled:
            upsell = f"""
            <div style="margin-top: 30px; padding: 20px; background-color: #FEF9C3; border: 1px solid #FDE047; border-radius: 8px;">
                <h4 style="margin-top: 0; color: #854D0E; font-size: 16px;">Vendi il 40% in più senza sforzo</h4>
                <p style="color: #A16207; font-size: 14px; margin-bottom: 16px;">
                    Aggiungi l'audio guida al tuo venue: i musei che la usano generano in media EUR 1.500 extra al mese. Ci pensiamo noi a generarla dall'AI.
                </p>
                <a href="https://qrgate.com/dashboard/audio-guides" style="display: inline-block; background: #CA8A04; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
                    Attiva l'Audio Guida
                </a>
            </div>
            """

        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1E293B;">
            <div style="text-align: center; padding: 40px 0;">
                <span style="font-size: 48px;">💰</span>
                <h2 style="margin-top: 16px; color: #0F172A;">Questo è solo l'inizio.</h2>
            </div>
            
            <p>Il tuo link QRGate funziona alla perfezione. Hai appena generato <strong>{amount_net_euro}</strong> netti da {visitor_name or 'Un Visitatore'}.</p>
            
            <p>Assicurati di aver stampato i cartelli per l'ingresso e collegato il tuo account Instagram al link della biglietteria.</p>
            
            {upsell}
            
            <p style="font-size: 12px; color: #94A3B8; margin-top: 40px; text-align: center;">
                <a href="{{{{unsubscribe_url}}}}" style="color: #94A3B8;">Annulla iscrizione</a>
            </p>
        </div>
        """
        return await EmailService._send_async(venue_email, subject, html, "transactional")

    # =========================================================================
    # EMAIL 5: REPORT MENSILE VENUE
    # =========================================================================
    @staticmethod
    async def send_monthly_report(
        venue_email: str,
        venue_name: str,
        month_year: str,
        tickets_sold: int,
        net_revenue_euro: str,
        stories_active: bool,
        guides_sold: int,
        guides_revenue_euro: str,
        top_country: str,
        growth_percent: str # e.g. "+15%"
    ) -> bool:
        subject = f"{venue_name} — Report {month_year}: {net_revenue_euro} generati"
        
        stories_section = ""
        if stories_active:
            stories_section = f"""
            <div style="margin-top: 20px; border-top: 1px solid #E2E8F0; padding-top: 20px;">
                <p style="color: #64748B; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; font-weight: bold;">Audio Guide</p>
                <div style="display: flex; justify-content: space-between;">
                    <p style="margin: 0; font-size: 16px;">Guide vendute: <strong>{guides_sold}</strong></p>
                    <p style="margin: 0; font-size: 16px; color: #D4AF37; font-weight: bold;">{guides_revenue_euro}</p>
                </div>
            </div>
            """
        else:
            stories_section = f"""
            <div style="margin-top: 30px; padding: 20px; background-color: #FEF9C3; border-radius: 8px;">
                <p style="margin: 0; color: #854D0E; font-size: 14px;"><strong>Insights:</strong> Hai ricevuto traffico internazionale. L'aggiunta di una PWA Audio Guida potrebbe generare > €500 extra il prossimo mese.</p>
            </div>
            """

        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1E293B;">
            <div style="background-color: #0F172A; color: white; padding: 40px 24px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">Il tuo mese in rassegna</h1>
                <p style="margin: 8px 0 0 0; opacity: 0.8;">{month_year} per {venue_name}</p>
            </div>
            
            <div style="padding: 32px 24px; border: 1px solid #E2E8F0; border-top: none;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 24px;">
                    <div>
                        <p style="color: #64748B; font-size: 14px; margin: 0 0 4px 0; text-transform: uppercase; font-weight: bold;">Revenue Netta</p>
                        <p style="font-size: 32px; font-weight: bold; margin: 0; color: #0F172A;">{net_revenue_euro}</p>
                    </div>
                    <div style="text-align: right;">
                        <span style="display: inline-block; background-color: #DCFCE7; color: #166534; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px;">
                            {growth_percent} vs mese prec.
                        </span>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between;">
                    <p style="margin: 0; font-size: 16px;">Biglietti venduti: <strong>{tickets_sold}</strong></p>
                    <p style="margin: 0; font-size: 16px; color: #64748B;">Top Visitor: <strong>{top_country}</strong></p>
                </div>

                {stories_section}

                <a href="https://qrgate.com/dashboard/analytics" style="display: block; width: 100%; text-align: center; background-color: #F1F5F9; color: #0F172A; padding: 16px 0; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin-top: 32px;">
                    Apri Dashboard Dettagliata
                </a>
            </div>
        </div>
        """
        return await EmailService._send_async(venue_email, subject, html, "transactional")

    # =========================================================================
    # EMAIL 6: WAITLIST NOTIFICATION & MOCK LEGACY
    # =========================================================================
    @staticmethod
    def send_waitlist_notification(
        visitor_email: str, visitor_name: str, venue_name: str, venue_slug: str,
        ticket_name: str, slot_date: str, slot_time: str, quantity: int
    ) -> bool:
        subject = f"🎫 Il tuo posto per {venue_name} è ora disponibile!"
        html = f"""
        <html>
        <body style="font-family: sans-serif; padding: 20px; text-align: center;">
            <h2 style="color: #1e3a5f;">Ciao {visitor_name}, abbiamo ottime notizie!</h2>
            <p>Si sono liberati dei posti per <b>{ticket_name}</b> a <b>{venue_name}</b>.</p>
            <p>Data: {slot_date} | Ora: {slot_time} | Biglietti: {quantity}</p>
            <p>Hai 24 ore per completare l'acquisto prima che vengano assegnati al prossimo in lista d'attesa.</p>
            <a href="https://qrgate.io/{venue_slug}" style="display: inline-block; padding: 15px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;">Acquista Ora</a>
        </body>
        </html>
        """
        logger.info(f"[SYNC MOCK] Sending Waitlist to {visitor_email}")
        return True

    @staticmethod
    async def send_visit_confirmation(
        visitor_email: str,
        venue_name: str,
        scanned_at_iso: str
    ) -> bool:
        subject = f"Grazie per la tua visita a {venue_name}!"
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1E293B;">
            <h2 style="color: #0F172A;">Speriamo ti sia piaciuto!</h2>
            <p>Il tuo biglietto è stato validato il {scanned_at_iso}.</p>
            <p>Se hai acquistato l'audio guida, puoi continuare ad ascoltare le storie anche da casa.</p>
            <br/>
            <a href="https://qrgate.com/feedback" style="display: inline-block; background: #0F172A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Lascia un commento
            </a>
        </div>
        """
        return await EmailService._send_async(visitor_email, subject, html, "transactional")
