"""Structured logging with contextual request tracing."""

import logging
import sys
from typing import Any, Dict


def setup_logging(level: int = logging.INFO) -> logging.Logger:
    """Configures structured format logger for Yojana Sahayak."""
    logger = logging.getLogger("yojana_sahayak")
    logger.setLevel(level)

    # Avoid adding duplicate handlers on reload
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


logger = setup_logging()
