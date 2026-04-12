"""
All scheduled jobs.

Schedule (UTC):
  06:00  — Daily Brief → Intel + Community
  10:00  — News Digest → Intel
  14:00  — News Digest → Intel
  18:00  — News Digest → Intel
  Every 15 min — Alert cycle (price + subnet movers)
"""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from config import settings

logger = logging.getLogger(__name__)


async def job_daily_brief():
    from agents.daily_brief import build_daily_brief
    from telegram.publisher import post_to_intel
    logger.info("Running daily brief job...")
    try:
        brief = await build_daily_brief()
        await post_to_intel(brief)
        logger.info("Daily brief posted.")
    except Exception as e:
        logger.error(f"Daily brief failed: {e}", exc_info=True)


async def job_news_digest():
    from agents.content import generate_news_digest
    from telegram.publisher import post_to_intel
    logger.info("Running news digest job...")
    try:
        digest = await generate_news_digest()
        if digest:
            await post_to_intel(digest)
            logger.info("News digest posted.")
        else:
            logger.info("No relevant news — digest skipped.")
    except Exception as e:
        logger.error(f"News digest failed: {e}", exc_info=True)


async def job_alert_cycle():
    from agents.alerts import run_alert_cycle
    from telegram.publisher import post_alert
    try:
        messages = await run_alert_cycle()
        for msg in messages:
            await post_alert(msg)
            logger.info("Alert posted.")
    except Exception as e:
        logger.error(f"Alert cycle failed: {e}", exc_info=True)


def build_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone=settings.timezone)

    # Daily brief at configured time (default 06:00 UTC)
    scheduler.add_job(
        job_daily_brief,
        CronTrigger(
            hour=settings.daily_brief_hour,
            minute=settings.daily_brief_minute,
            timezone=settings.timezone,
        ),
        id="daily_brief",
        name="Daily Brief",
        replace_existing=True,
    )

    # News digests throughout the day
    for hour in [10, 14, 18]:
        scheduler.add_job(
            job_news_digest,
            CronTrigger(hour=hour, minute=0, timezone=settings.timezone),
            id=f"news_digest_{hour}",
            name=f"News Digest {hour}:00",
            replace_existing=True,
        )

    # Alert cycle every 15 minutes
    scheduler.add_job(
        job_alert_cycle,
        IntervalTrigger(minutes=15),
        id="alert_cycle",
        name="Alert Cycle",
        replace_existing=True,
    )

    return scheduler
