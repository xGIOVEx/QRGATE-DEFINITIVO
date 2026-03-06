import os
import logging
from supabase import create_client, Client
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class SupabaseService:
    """Service to interact with Supabase for Realtime updates and Storage"""
    
    _client: Optional[Client] = None
    
    @classmethod
    def get_client(cls) -> Optional[Client]:
        if cls._client is None:
            url = os.environ.get("SUPABASE_URL")
            key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Use service role for backend
            
            if not url or not key:
                logger.warning("Supabase credentials missing — Realtime updates will be skipped.")
                return None
                
            cls._client = create_client(url, key)
        return cls._client

    @staticmethod
    async def update_progress(guide_id: str, phase: str, percent: int, message: str):
        """Update the generation progress in Supabase to trigger Realtime broadcast"""
        client = SupabaseService.get_client()
        if not client:
            return
            
        payload = {
            "guide_id": guide_id,
            "phase": phase,
            "percent": percent,
            "message": message,
            "updated_at": "now()"
        }
        
        try:
            # We assume a table 'generation_progress' exists with guide_id as primary key (or upsertable)
            # This triggers Supabase Realtime for the dashboard listener
            client.table("generation_progress").upsert(payload, on_conflict="guide_id").execute()
        except Exception as e:
            logger.error("Supabase progress update error: %s", e, exc_info=True)
