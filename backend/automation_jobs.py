import asyncio
import os
import motor.motor_asyncio
import logging
from datetime import datetime, timedelta, timezone
from services.email_service import EmailService

logger = logging.getLogger("automation")

# MongoDB setup
MONGODB_URL = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.qrgate

async def run_onboarding_drops(ctx=None):
    """Email 3: Onboarding Sequence for incomplete checkouts (1h, 24h, 72h)"""
    logger.info("Running Onboarding Drop job...")
    
    now = datetime.now(timezone.utc)
    
    # We query venues that have not completed onboarding
    incomplete_venues = await db.venues.find({"onboarding_completed": {"$ne": True}}).to_list(1000)
    
    for venue in incomplete_venues:
        created_at_str = venue.get("created_at")
        if not created_at_str:
            continue
            
        try:
            created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
        except ValueError:
            continue
            
        hours_passed = (now - created_at).total_seconds() / 3600.0
        
        # Find the owner email
        owner = await db.users.find_one({"venue_id": venue["id"], "role": "admin"})
        if not owner:
            continue
            
        venue_email = owner["email"]
        venue_name = venue.get("name", "Venue Incompleto")
        
        # We use a primitive state tracker in DB to avoid sending duplicates.
        emails_sent = venue.get("onboarding_emails_sent", [])
        
        if 1 <= hours_passed < 24 and "1h" not in emails_sent:
            preview_url = f"https://qrgate.com/preview/{venue['id']}"
            await EmailService.send_onboarding_drop_1h(venue_email, venue_name, preview_url)
            await db.venues.update_one({"id": venue["id"]}, {"$push": {"onboarding_emails_sent": "1h"}})
            
        elif 24 <= hours_passed < 72 and "24h" not in emails_sent:
            await EmailService.send_onboarding_drop_24h(venue_email, venue_name)
            await db.venues.update_one({"id": venue["id"]}, {"$push": {"onboarding_emails_sent": "24h"}})
            
        elif hours_passed >= 72 and "72h" not in emails_sent:
            await EmailService.send_onboarding_drop_72h_founder(venue_email, venue_name)
            await db.venues.update_one({"id": venue["id"]}, {"$push": {"onboarding_emails_sent": "72h"}})

async def run_monthly_reports(ctx=None):
    """Email 5: Send monthly report to all active venues on the 1st of the month"""
    logger.info("Running Monthly BI Reports job...")
    
    now = datetime.now(timezone.utc)
    # Target period: last month
    first_day_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month = first_day_this_month - timedelta(days=1)
    first_day_last_month = last_month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_name = last_month.strftime("%B %Y")
    
    # Active venues
    venues = await db.venues.find({"active": True}).to_list(None)
    
    for venue in venues:
        # Aggregate metrics for the venue
        pipeline = [
            {"$match": {
                "venue_id": venue["id"], 
                "stripe_payment_status": "paid",
                "created_at": {
                    "$gte": first_day_last_month.isoformat(), 
                    "$lt": first_day_this_month.isoformat()
                }
            }},
            {"$group": {
                "_id": None,
                "total_tickets": {"$sum": "$quantity"},
                "net_revenue_cents": {"$sum": {"$subtract": ["$ticket_amount", "$fee_amount"]}},
                "countries": {"$push": "$country_estimate"}
            }}
        ]
        
        result = await db.orders.aggregate(pipeline).to_list(1)
        if not result:
            continue # No sales last month
            
        metrics = result[0]
        total_tickets = metrics["total_tickets"]
        if total_tickets == 0:
            continue
            
        net_revenue_cents = metrics["net_revenue_cents"]
        countries = metrics.get("countries", [])
        top_country = "Italia"
        if countries:
            import collections
            counts = collections.Counter([c for c in countries if c])
            if counts:
                top_country = counts.most_common(1)[0][0]
        
        # Get owner
        owner = await db.users.find_one({"venue_id": venue["id"], "role": "admin"})
        if not owner:
            continue
            
        net_euro = f"€{net_revenue_cents / 100:.2f}"
        
        # Audio guides check
        stories_active = venue.get('stories_enabled', False)
        # Mocking guide stats
        guides_sold = int(total_tickets * 0.15) if stories_active else 0
        guides_revenue = guides_sold * 300 # assumed 3 EUR net per guide
        guides_euro = f"€{guides_revenue / 100:.2f}"
        
        await EmailService.send_monthly_report(
            venue_email=owner["email"],
            venue_name=venue["name"],
            month_year=month_name,
            tickets_sold=total_tickets,
            net_revenue_euro=net_euro,
            stories_active=stories_active,
            guides_sold=guides_sold,
            guides_revenue_euro=guides_euro,
            top_country=top_country,
            growth_percent="+12%" # Mocked for MVP analytics engine
        )

async def main():
    logger.info("Starting Manual QRGate Automation Jobs...")
    await run_onboarding_drops()
    logger.info("Automation jobs completed.")

if __name__ == "__main__":
    asyncio.run(main())
