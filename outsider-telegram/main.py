"""
Outsider Telegram Bot — Entry Point
Starts the scheduler and keeps the process alive.
"""

import asyncio
import logging
import signal
from scheduler.jobs import build_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


async def main():
    logger.info("Starting Outsider Telegram Bot...")
    scheduler = build_scheduler()
    scheduler.start()
    logger.info("Scheduler started. Jobs:")
    for job in scheduler.get_jobs():
        logger.info(f"  • {job.name} — next: {job.next_run_time}")

    # Keep running until SIGTERM / SIGINT
    stop_event = asyncio.Event()

    def handle_signal():
        logger.info("Shutdown signal received.")
        stop_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, handle_signal)

    logger.info("Bot is running. Press Ctrl+C to stop.")
    await stop_event.wait()

    scheduler.shutdown()
    logger.info("Scheduler stopped. Goodbye.")


if __name__ == "__main__":
    asyncio.run(main())
