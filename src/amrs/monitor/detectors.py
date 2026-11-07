"""Live training failure detectors for overfitting and instability (Section ML-9, BR13)."""

from __future__ import annotations

from typing import Any
from amrs.schemas import MonitorInstabilityConfig, MonitorOverfitConfig


class OverfitDetector:
    """Detects generalization gap expansion and validation loss rise on smoothed metrics."""

    def __init__(self, config: MonitorOverfitConfig | None = None) -> None:
        self.config = config or MonitorOverfitConfig()
        self.min_val_loss: float = float("inf")
        self.initial_gap: float | None = None
        self.min_gap: float = float("inf")

    def update(
        self,
        epoch: int,
        train_loss: float,
        train_acc: float,
        val_loss: float,
        val_acc: float,
    ) -> tuple[bool, dict[str, Any]]:
        """Update detector with current epoch metrics and evaluate condition.
        
        Returns:
            (condition_met, details_dict)
        """
        gap = train_acc - val_acc
        if self.initial_gap is None:
            self.initial_gap = gap

        if gap < self.min_gap:
            self.min_gap = gap

        if val_loss < self.min_val_loss:
            self.min_val_loss = val_loss

        gap_rise = gap - self.min_gap
        val_loss_rising = val_loss > self.min_val_loss

        condition = False
        if self.config.val_loss_rise:
            condition = (gap_rise >= self.config.gap_rise_min) and val_loss_rising
        else:
            condition = gap_rise >= self.config.gap_rise_min

        details = {
            "epoch": epoch,
            "gap": round(gap, 4),
            "gap_rise": round(gap_rise, 4),
            "gap_rise_min": self.config.gap_rise_min,
            "val_loss": round(val_loss, 4),
            "min_val_loss": round(self.min_val_loss, 4),
            "val_loss_rising": val_loss_rising,
        }

        return condition, details


class InstabilityDetector:
    """Detects loss spikes exceeding configured spike_ratio on smoothed metrics."""

    def __init__(self, config: MonitorInstabilityConfig | None = None) -> None:
        self.config = config or MonitorInstabilityConfig()
        self.min_loss: float = float("inf")

    def update(
        self,
        epoch: int,
        loss: float,
    ) -> tuple[bool, dict[str, Any]]:
        """Update detector with current epoch loss and check for spike condition.
        
        Returns:
            (condition_met, details_dict)
        """
        if loss < self.min_loss and loss > 0.0:
            self.min_loss = loss

        base_loss = max(1e-6, self.min_loss)
        ratio = loss / base_loss

        condition = ratio >= self.config.spike_ratio

        details = {
            "epoch": epoch,
            "current_loss": round(loss, 4),
            "min_loss": round(self.min_loss, 4),
            "ratio": round(ratio, 4),
            "spike_ratio_threshold": self.config.spike_ratio,
        }

        return condition, details
