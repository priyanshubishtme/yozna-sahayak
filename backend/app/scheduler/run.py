"""Dedicated Single-Instance Scheduler Process Runner.

Enforces Blueprint Section 3.2 & Section 16.2:
- Dedicated worker process isolated from web request handling.
- Acquires process-level lock to guarantee exactly one active scheduler instance.
- Gracefully handles SIGINT/SIGTERM for safe shutdown.
"""

import asyncio
import signal
import sys
from backend.app.core.logging import logger
from backend.app.db.session import AsyncSessionLocal
from backend.app.scheduler.manager import scheduler_manager


async def main():
    logger.info("Starting Yojana Sahayak standalone APScheduler daemon...")

    # Start scheduler instance
    started = scheduler_manager.start()
    if not started:
        logger.error("Failed to start scheduler: another process holds the scheduler lock.")
        sys.exit(1)

    # Initial schedule reconciliation
    try:
        await scheduler_manager.reconcile_source_schedules()
        logger.info("Reconciled all source schedules from registry.")
    except Exception as e:
        logger.error(f"Error during schedule reconciliation: {e}")

    # Set up termination signal handlers
    stop_event = asyncio.Event()

    def signal_handler():
        logger.info("Received termination signal, stopping scheduler...")
        stop_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, signal_handler)
        except NotImplementedError:
            # Windows signal handling fallback
            pass

    try:
        # Keep process alive until termination signal
        while not stop_event.is_set():
            await asyncio.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler interrupted by user.")
    finally:
        logger.info("Shutting down scheduler and releasing lock...")
        scheduler_manager.shutdown()
        logger.info("Scheduler daemon stopped safely.")


if __name__ == "__main__":
    asyncio.run(main())

