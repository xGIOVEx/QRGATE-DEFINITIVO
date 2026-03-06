import logging
import anthropic
import os
from datetime import datetime
from typing import Dict, Any

logger = logging.getLogger("report_service")

class ReportService:
    """Monthly AI Report Engine (Claude)"""
    
    @staticmethod
    async def generate_monthly_report(db, venue_id: str, month: str):
        """Aggregate data and generate AI insights for the month"""
        
        # 1. Fetch data snapshots (Mocked for now)
        data = {
            "venue_name": "Museo Test",
            "total_listen_sec": 45000,
            "top_poi": "Sala Grande",
            "worst_poi": "Corridoio Esterno",
            "ai_questions": ["Chi ha dipinto questo?", "Quando è stato costruito?"],
            "visitor_countries": {"IT": 60, "FR": 20, "US": 20}
        }
        
        client = anthropic.AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        if not client.api_key: return
        
        prompt = f"""Sei un analista di experience designer per musei. Analizza questi dati:
{data}
Produci un report professionale in Italiano con:
1. POI con maggiore engagement e perché
2. POI con più drop-off e suggerimento di miglioramento
3. Analisi delle 3 domande AI più frequenti
4. Raccomandazione prioritaria con impatto stimato in EUR."""

        try:
            message = await client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            report_text = message.content[0].text
            await db.monthly_reports.insert_one({
                "venue_id": venue_id,
                "month": month,
                "report_text": report_text,
                "generated_at": datetime.utcnow().isoformat()
            })
            return report_text
        except Exception as e:
            logger.error(f"Report Generation Error: {e}")
            return None
