"""Stopwatch and timing context managers for AMRS."""

from __future__ import annotations

import time
from types import TracebackType


class Stopwatch:
    """Context manager and manual stopwatch measuring elapsed wall-clock seconds."""

    def __init__(self) -> None:
        self.start_time: float = 0.0
        self.end_time: float = 0.0
        self.elapsed: float = 0.0

    def start(self) -> Stopwatch:
        self.start_time = time.perf_counter()
        self.end_time = 0.0
        self.elapsed = 0.0
        return self

    def stop(self) -> float:
        self.end_time = time.perf_counter()
        self.elapsed = self.end_time - self.start_time
        return self.elapsed

    def __enter__(self) -> Stopwatch:
        self.start()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        self.stop()
