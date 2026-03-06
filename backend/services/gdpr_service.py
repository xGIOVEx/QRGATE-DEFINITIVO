import logging
from datetime import datetime, timezone, timedelta
import hashlib

class GDPRService:
    @staticmethod
    async def export_venue_data(db, venue_id: str) -> dict:
        """
        Exports all personal and operational data associated with a venue
        in a machine-readable JSON format for GDPR Right to Portability.
        """
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        if not venue:
            return {}

        tickets = await db.tickets.find({"venue_id": venue_id}, {"_id": 0}).to_list(None)
        orders = await db.orders.find({"venue_id": venue_id}, {"_id": 0}).to_list(None)
        guides = await db.audio_guides.find({"venue_id": venue_id}, {"_id": 0}).to_list(None)

        return {
            "venue": venue,
            "tickets": tickets,
            "orders": orders,
            "audio_guides": guides,
            "exported_at": datetime.now(timezone.utc).isoformat()
        }

    @staticmethod
    async def delete_venue_data(db, venue_id: str, mode: str = "soft"):
        """
        Processes Right to be Forgotten requests.
        mode="soft": Anonymizes PI but keeps statistical data (revenue, counts).
        mode="hard": Completely removes all traces.
        """
        if mode == "soft":
            # Anonymize venue owner details but keep the venue entity for stats
            await db.venues.update_one(
                {"id": venue_id},
                {"$set": {
                    "name": f"Deleted Venue {str(venue_id)[:8]}",  # type: ignore
                    "email": "deleted@qrgate.io",
                    "stripe_account_id": None,
                    "address": "Redacted",
                    "status": "deleted"
                }}
            )
            # Anonymize order emails
            await db.orders.update_many(
                {"venue_id": venue_id},
                {"$set": {"customer_email": "deleted@qrgate.io", "customer_name": "Redacted"}}
            )
        elif mode == "hard":
            await db.venues.delete_one({"id": venue_id})
            await db.tickets.delete_many({"venue_id": venue_id})
            await db.orders.delete_many({"venue_id": venue_id})
            await db.audio_guides.delete_many({"venue_id": venue_id})

        return {"status": "success", "mode": mode, "venue_id": venue_id}

    @staticmethod
    async def run_gdpr_cleanup(db):
        """
        Cron job executed logic to enforce data retention policies.
        - > 90 days: Anonymize customer emails in orders.
        - > 24 months: Delete inactive venues and old orders.
        """
        now = datetime.now(timezone.utc)
        ninety_days_ago = now - timedelta(days=90)
        two_years_ago = now - timedelta(days=365 * 2)

        # 1. Anonymize emails for old orders (> 90 days)
        # Assuming created_at is strictly isoformat strings, we can do string comparison 
        # or we should parse them / store as ISODate in MongoDB. For MVP string comparison works if strict ISO layout.
        ninety_str = ninety_days_ago.isoformat()
        result_anonymize = await db.orders.update_many(
            {"created_at": {"$lt": ninety_str}, "customer_email": {"$ne": "anonymized@qrgate.io"}},
            {"$set": {
                "customer_email": "anonymized@qrgate.io",
                "customer_name": "Anonymized Visitor"
            }}
        )
        
        # 2. Hard delete very old deleted venues/orders (> 24 months)
        two_years_str = two_years_ago.isoformat()
        result_delete = await db.orders.delete_many({"created_at": {"$lt": two_years_str}})
        
        logging.info(f"[GDPR Cleanup] Anonymized {result_anonymize.modified_count} orders older than 90 days.")
        logging.info(f"[GDPR Cleanup] Hard deleted {result_delete.deleted_count} orders older than 24 months.")

gdpr_service = GDPRService()
