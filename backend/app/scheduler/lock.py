"""Single-instance process locking and per-source concurrency gates."""

import asyncio
import os
from pathlib import Path
from typing import Dict, Optional
from backend.app.config import settings
from backend.app.core.logging import logger

LOCK_FILE = Path(settings.data_dir) / "scheduler.lock"


class SchedulerProcessLock:
    """Guarantees only one dedicated scheduler process runs per Blueprint Section 16.2."""

    def __init__(self, lock_path: Path = LOCK_FILE):
        self.lock_path = lock_path
        self._acquired = False

    def acquire(self) -> bool:
        """Attempts to acquire the scheduler lock using current PID."""
        import psutil
        pid = os.getpid()
        if self.lock_path.exists():
            try:
                old_pid = int(self.lock_path.read_text().strip())
                if old_pid == pid:
                    self._acquired = True
                    return True
                # Check if process is still running
                if psutil.pid_exists(old_pid):
                    logger.warning(
                        f"Scheduler lock is held by active PID {old_pid}. Single-instance scheduler will not start."
                    )
                    return False
                else:
                    logger.info(f"Detected stale scheduler lock from inactive PID {old_pid}. Re-claiming lock.")
            except Exception as e:
                logger.warning(f"Error checking existing lock file: {e}")

        try:
            self.lock_path.parent.mkdir(parents=True, exist_ok=True)
            self.lock_path.write_text(str(pid))
            self._acquired = True
            logger.info(f"Acquired single-instance scheduler lock for PID {pid}.")
            return True
        except Exception as e:
            logger.error(f"Failed to acquire scheduler lock: {e}")
            return False

    def release(self) -> None:
        """Releases the lock upon shutdown."""
        if self._acquired and self.lock_path.exists():
            try:
                self.lock_path.unlink()
                logger.info("Released single-instance scheduler lock.")
            except Exception:
                pass
            self._acquired = False


class PerSourceLockManager:
    """Prevents overlapping discovery runs for the same government source."""

    def __init__(self):
        self._locks: Dict[str, asyncio.Lock] = {}
        self._global_lock = asyncio.Lock()

    async def get_lock(self, source_id: str) -> asyncio.Lock:
        async with self._global_lock:
            if source_id not in self._locks:
                self._locks[source_id] = asyncio.Lock()
            return self._locks[source_id]

    async def is_locked(self, source_id: str) -> bool:
        async with self._global_lock:
            lock = self._locks.get(source_id)
            return lock.locked() if lock else False


process_lock = SchedulerProcessLock()
source_lock_manager = PerSourceLockManager()
