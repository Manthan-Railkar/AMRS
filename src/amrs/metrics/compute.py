"""Compute cost accounting and resource metering for model evaluation and recovery."""

from __future__ import annotations

import contextlib
import time
from typing import Generator


class ComputeMeter:
    """Tracks compute cost in forward and backward samples according to BR12."""

    def __init__(self) -> None:
        self.fwd_samples: int = 0
        self.bwd_samples: int = 0
        self.grad_steps: int = 0
        self.start_time: float = time.monotonic()
        self.total_wall_s: float = 0.0

    def add_fwd(self, n: int) -> None:
        """Record forward samples evaluated."""
        self.fwd_samples += n

    def add_bwd(self, n: int) -> None:
        """Record backward samples trained (counts 3x forward cost)."""
        self.bwd_samples += n

    def add_grad_step(self, n: int = 1) -> None:
        """Record optimization gradient step."""
        self.grad_steps += n

    @property
    def units(self) -> float:
        """Total compute units defined as: fwd_samples + 3 * bwd_samples."""
        return float(self.fwd_samples + 3 * self.bwd_samples)

    @property
    def wall_s(self) -> float:
        """Total elapsed wall-clock seconds."""
        return round(time.monotonic() - self.start_time, 3)

    @contextlib.contextmanager
    def meter_scope(self, name: str = "") -> Generator[ComputeMeter, None, None]:
        """Scoped context manager for metering a specific block of computation."""
        t0 = time.monotonic()
        try:
            yield self
        finally:
            self.total_wall_s += (time.monotonic() - t0)


class NullMeter(ComputeMeter):
    """No-op meter for dry runs and unmetered evaluation."""

    def add_fwd(self, n: int) -> None:
        pass

    def add_bwd(self, n: int) -> None:
        pass

    def add_grad_step(self, n: int = 1) -> None:
        pass

    @property
    def units(self) -> float:
        return 0.0

    @property
    def wall_s(self) -> float:
        return 0.0

