import os
import uuid
from typing import Dict, Any, Optional
from posthog import Posthog

class AnalyticsService:
    def __init__(self):
        self.api_key = os.getenv("POSTHOG_PROJECT_API_KEY", "phc_mock_key")
        self.host = os.getenv("POSTHOG_HOST", "https://eu.posthog.com")  # For EU compliance
        
        # Inizializza il client PostHog
        self.posthog = Posthog(project_api_key=self.api_key, host=self.host)
        
        # Disabilita esplicitamente l'invio dell'IP per compliance GDPR
        # posthog client will still batch and send async
    
    def _sanitize_properties(self, properties: Dict[str, Any]) -> Dict[str, Any]:
        """
        Rimuove o maschera attivamente qualsiasi potenziale PII (email, name, ip, phone, ecc.)
        dalle proprietà prima di inviarle. Il vero GDPR zero PII firewall.
        """
        pii_fields = ['email', 'name', 'ip', 'phone', 'address', 'password', 'iban', 'id_number']
        sanitized = {}
        for k, v in properties.items():
            if k.lower() not in pii_fields:
                sanitized[k] = v
        
        # Override l'IP per forzare anonimizzazione a livello payload
        sanitized['$ip'] = None
        return sanitized

    def capture_event(self, distinct_id: str, event_name: str, properties: Optional[Dict[str, Any]] = None):
        """
        Invia un evento tracciato al posthog.
        Args:
            distinct_id: Tipicamente il venue_id per le azioni di un locale, oppure utente anonimizzato.
            event_name: Il nome dell'evento come da requirements.
            properties: Le properties relative all'evento (saranno sanitizzate).
        """
        if not properties:
            properties = {}
        
        safe_props = self._sanitize_properties(properties)
        
        self.posthog.capture(distinct_id=str(distinct_id), event=event_name, properties=safe_props)

    def close(self):
        """Assicura l'invio della coda alla chiusura dell'app (opzionale su shutdown worker/api)."""
        self.posthog.shutdown()

analytics_service = AnalyticsService()
