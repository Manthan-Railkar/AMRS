"""Structured JSON logging with run_id context binding for AMRS."""

from __future__ import annotations

import contextvars
import json
import logging
import sys
from typing import Any

_current_run_id: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "current_run_id", default=None
)


def bind_run_id(run_id: str | None) -> None:
    """Bind current run ID to contextvars for structured logging."""
    _current_run_id.set(run_id)


def get_run_id() -> str | None:
    """Retrieve active run ID from contextvars."""
    return _current_run_id.get()


class JsonFormatter(logging.Formatter):
    """Format logs as JSON objects with timestamp, level, message, and run_id."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
            "run_id": get_run_id(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload)


def get_logger(name: str = "amrs") -> logging.Logger:
    """Return configured structured logger."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger
