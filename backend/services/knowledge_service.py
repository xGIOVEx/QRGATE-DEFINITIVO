import asyncio
import httpx
import os
import logging
from bs4 import BeautifulSoup
from typing import Dict, Any, List, Optional
from urllib.parse import quote

logger = logging.getLogger("knowledge_service")

class KnowledgeService:
    """Phase 1: Knowledge Acquisition from 8 sources"""
    
    @staticmethod
    async def fetch_all(venue_name: str, venue_type: str, city: str, country: str, website: Optional[str] = None) -> Dict[str, Any]:
        """Fetch knowledge from 8 sources in parallel with individual 10s timeouts"""
        
        source_keys = [
            "wikipedia", "wikidata", "europeana", "getty", 
            "google_kg", "dbpedia", "persee", "website"
        ]
        
        tasks = [
            KnowledgeService.fetch_wikipedia(venue_name),
            KnowledgeService.fetch_wikidata(venue_name, city),
            KnowledgeService.fetch_europeana(venue_name),
            KnowledgeService.fetch_getty(venue_name),
            KnowledgeService.fetch_google_kg(venue_name),
            KnowledgeService.fetch_dbpedia(venue_name),
            KnowledgeService.fetch_persee(venue_name),
            KnowledgeService.fetch_website(website) if website else asyncio.sleep(0, result={})
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        knowledge = {
            "venue_name": venue_name,
            "venue_type": venue_type,
            "city": city,
            "country": country,
            "raw_sources": []
        }
        
        for i, key in enumerate(source_keys):
            res = results[i]
            if isinstance(res, Exception):
                logger.error(f"Source {key} failed: {res}")
                knowledge[key] = {}
            else:
                knowledge[key] = res
        
        return knowledge

    @staticmethod
    async def fetch_wikipedia(name: str) -> Dict[str, Any]:
        """Source 1: Wikipedia REST API"""
        url = f"https://it.wikipedia.org/api/rest_v1/page/summary/{quote(name)}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "extract": data.get("extract"),
                        "thumbnail": data.get("thumbnail", {}).get("source"),
                        "coordinates": data.get("coordinates"),
                        "pageid": data.get("pageid")
                    }
        except Exception as e:
            logger.error(f"Wikipedia Fetch Error: {e}")
        return {}

    @staticmethod
    async def fetch_wikidata(name: str, city: str) -> Dict[str, Any]:
        return {"note": "Wikidata placeholder"}

    @staticmethod
    async def fetch_europeana(name: str) -> Dict[str, Any]:
        api_key = os.environ.get("EUROPEANA_API_KEY")
        if not api_key: return {}
        url = f"https://api.europeana.eu/record/v2/search.json?wskey={api_key}&query=\"{quote(name)}\"&type=IMAGE&rows=10"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    return resp.json()
        except Exception:
            pass
        return {}

    @staticmethod
    async def fetch_getty(name: str) -> Dict[str, Any]:
        return {"note": "Getty placeholder"}

    @staticmethod
    async def fetch_google_kg(name: str) -> Dict[str, Any]:
        api_key = os.environ.get("GOOGLE_KG_API_KEY")
        if not api_key: return {}
        url = f"https://kgsearch.googleapis.com/v1/entities:search?query={quote(name)}&key={api_key}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    return resp.json()
        except Exception:
            pass
        return {}

    @staticmethod
    async def fetch_dbpedia(name: str) -> Dict[str, Any]:
        return {"note": "DBpedia placeholder"}

    @staticmethod
    async def fetch_persee(name: str) -> Dict[str, Any]:
        return {"note": "Persee placeholder"}

    @staticmethod
    async def fetch_website(url: str) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, 'html.parser')
                    return {"text_excerpt": soup.get_text()[:2000]}
        except Exception:
            pass
        return {}
