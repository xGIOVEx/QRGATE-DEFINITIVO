import asyncio
import os
import logging
from arq import worker
from arq.connections import RedisSettings
from services.email_service import EmailService
from arq.cron import cron
from automation_jobs import run_onboarding_drops, run_monthly_reports

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("arq.worker")

# Define tasks that will be executed by ARQ workers
async def task_send_single_order_confirmation(ctx, *args, **kwargs):
    logger.info(f"Executing task_send_single_order_confirmation for {kwargs.get('buyer_email')}")
    await EmailService.send_single_order_confirmation(*args, **kwargs)

async def task_send_group_order_confirmation(ctx, *args, **kwargs):
    logger.info(f"Executing task_send_group_order_confirmation for {kwargs.get('buyer_email')}")
    await EmailService.send_group_order_confirmation(*args, **kwargs)

async def task_send_onboarding_drop_1h(ctx, *args, **kwargs):
    logger.info(f"Executing task_send_onboarding_drop_1h for {kwargs.get('venue_email')}")
    await EmailService.send_onboarding_drop_1h(*args, **kwargs)

async def task_send_onboarding_drop_24h(ctx, *args, **kwargs):
    logger.info(f"Executing task_send_onboarding_drop_24h for {kwargs.get('venue_email')}")
    await EmailService.send_onboarding_drop_24h(*args, **kwargs)

async def task_send_onboarding_drop_72h_founder(ctx, *args, **kwargs):
    logger.info(f"Executing task_send_onboarding_drop_72h_founder for {kwargs.get('venue_email')}")
    await EmailService.send_onboarding_drop_72h_founder(*args, **kwargs)

async def task_send_first_sale_alert(ctx, *args, **kwargs):
    logger.info(f"Executing task_send_first_sale_alert for {kwargs.get('venue_email')}")
    await EmailService.send_first_sale_alert(*args, **kwargs)

async def task_send_monthly_report(ctx, *args, **kwargs):
    logger.info(f"Executing task_send_monthly_report for {kwargs.get('venue_email')}")
    await EmailService.send_monthly_report(*args, **kwargs)

async def task_send_visit_confirmation(ctx, *args, **kwargs):
    logger.info(f"Executing task_send_visit_confirmation for {kwargs.get('visitor_email')}")
    await EmailService.send_visit_confirmation(*args, **kwargs)

async def task_generate_stories(ctx, venue_id: str, guide_id: str):
    logger.info(f"Executing task_generate_stories for venue {venue_id}, guide {guide_id}")
    from services.stories_service import StoriesService
    from server import get_db
    db = get_db()
    await StoriesService.generate_full_guide(db, venue_id, guide_id)

async def task_stories_auto_update(ctx):
    logger.info("Executing weekly stories auto-update check")
    from services.stories_service import StoriesService
    from server import get_db
    db = get_db()
    # Logic to find venues with stories and check for updates
    venues = await db.venues.find({"status": "active"}).to_list(100)
    for venue in venues:
        await StoriesService.check_for_updates(db, venue["id"])

async def startup(ctx):
    logger.info("ARQ Worker starting up...")

async def shutdown(ctx):
    logger.info("ARQ Worker shutting down...")

# Worker Settings
class WorkerSettings:
    functions = [
        task_send_single_order_confirmation,
        task_send_group_order_confirmation,
        task_send_onboarding_drop_1h,
        task_send_onboarding_drop_24h,
        task_send_onboarding_drop_72h_founder,
        task_send_first_sale_alert,
        task_send_monthly_report,
        task_send_visit_confirmation,
        task_generate_stories
    ]
    cron_jobs = [
        # Email 5: 1st of every month at 09:00
        cron(run_monthly_reports, day=1, hour=9, minute=0),
        # Email 3: run every hour at minute 0
        cron(run_onboarding_drops, minute=0),
        # Stories Auto-update: every Sunday at 03:00
        cron(task_stories_auto_update, weekday=6, hour=3, minute=0)
    ]
    redis_settings = RedisSettings(
        host=os.environ.get("REDIS_HOST", "localhost"),
        port=int(os.environ.get("REDIS_PORT", 6379))
    )
    on_startup = startup
    on_shutdown = shutdown
    # Automatically retry jobs up to 3 times on failure
    max_tries = 3
    # Wait 30s before retrying (exponential backoff handled explicitly if needed, ARQ has fixed delays default)
    retry_jobs = True
    job_timeout = 60 # 60 seconds max per job

if __name__ == '__main__':
    worker.run_worker(WorkerSettings)
