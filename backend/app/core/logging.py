import logging
import sys
from typing import Any, Dict


def setup_logger(name: str = "ai_chat") -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger


logger = setup_logger()


def log_event(event_type: str, details: Dict[str, Any]):
    sanitized_details = {}
    for k, v in details.items():
        if "key" in k.lower() or "secret" in k.lower() or "password" in k.lower():
            sanitized_details[k] = "[REDACTED]"
        else:
            sanitized_details[k] = v
    logger.info(f"EVENT: {event_type} | {sanitized_details}")
