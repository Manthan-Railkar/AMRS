"""AMRS training callback with EMA smoothing, patience, cooldown, and recovery actions (Section ML-9, BR13)."""

from __future__ import annotations

import copy
import threading
from typing import Any, Callable
import torch.nn as nn

from amrs.monitor.detectors import InstabilityDetector, OverfitDetector
from amrs.schemas import MonitorConfig, MonitorEventItem


class AMRSCallback:
    """PyTorch-compatible callback tracking metrics and dispatching monitor actions."""

    _global_recovery_lock = threading.Lock()

    def __init__(
        self,
        config: MonitorConfig | None = None,
        run_id: str | None = None,
        action: str | None = None,
        on_trigger: Callable[[MonitorEventItem], None] | None = None,
    ) -> None:
        self.config = config or MonitorConfig()
        self.run_id = run_id or "live-monitor"
        self.action = action or self.config.action
        self.on_trigger = on_trigger

        self.ema_beta = float(self.config.ema_beta)
        self.patience = int(self.config.patience)
        self.cooldown_epochs = int(self.config.cooldown_epochs)

        self.overfit_detector = OverfitDetector(self.config.overfit)
        self.instability_detector = InstabilityDetector(self.config.instability)

        self.events: list[MonitorEventItem] = []
        self.series: dict[str, list[float]] = {
            "train_loss": [],
            "train_acc": [],
            "val_loss": [],
            "val_acc": [],
            "train_loss_ema": [],
            "train_acc_ema": [],
            "val_loss_ema": [],
            "val_acc_ema": [],
        }

        self.streak: int = 0
        self.cooldown_remaining: int = 0
        self.should_stop: bool = False

        self.best_epoch: int = 0
        self.best_val_loss: float = float("inf")
        self.best_state_dict: dict[str, Any] | None = None

        self.recovery_triggered: bool = False

    def _calc_ema(self, series_name: str, current_val: float) -> float:
        """Compute exponential moving average: beta * prev + (1 - beta) * curr."""
        ema_name = f"{series_name}_ema"
        past_ema = self.series[ema_name]
        if not past_ema:
            return float(current_val)
        prev = past_ema[-1]
        return float(self.ema_beta * prev + (1.0 - self.ema_beta) * current_val)

    def on_epoch_end(
        self,
        epoch: int,
        train_loss: float,
        train_acc: float,
        val_loss: float,
        val_acc: float,
        model: nn.Module | None = None,
    ) -> dict[str, Any]:
        """Update metrics at epoch end, track EMA, and evaluate trigger conditions."""
        # 1. Update series and smoothed EMAs
        tl_ema = self._calc_ema("train_loss", train_loss)
        ta_ema = self._calc_ema("train_acc", train_acc)
        vl_ema = self._calc_ema("val_loss", val_loss)
        va_ema = self._calc_ema("val_acc", val_acc)

        self.series["train_loss"].append(round(train_loss, 4))
        self.series["train_acc"].append(round(train_acc, 4))
        self.series["val_loss"].append(round(val_loss, 4))
        self.series["val_acc"].append(round(val_acc, 4))

        self.series["train_loss_ema"].append(round(tl_ema, 4))
        self.series["train_acc_ema"].append(round(ta_ema, 4))
        self.series["val_loss_ema"].append(round(vl_ema, 4))
        self.series["val_acc_ema"].append(round(va_ema, 4))

        # Track best model checkpoint
        if val_loss < self.best_val_loss and model is not None:
            self.best_val_loss = val_loss
            self.best_epoch = epoch
            self.best_state_dict = copy.deepcopy(model.state_dict())

        # 2. Check cooldown window
        if self.cooldown_remaining > 0:
            self.cooldown_remaining -= 1
            self.streak = 0
            event = MonitorEventItem(
                epoch=epoch,
                kind="cooldown",
                details={"cooldown_remaining": self.cooldown_remaining},
            )
            self.events.append(event)
            return {"status": "cooldown", "cooldown_remaining": self.cooldown_remaining}

        # 3. Evaluate failure detectors on smoothed metrics
        overfit_met, overfit_details = self.overfit_detector.update(
            epoch=epoch,
            train_loss=tl_ema,
            train_acc=ta_ema,
            val_loss=vl_ema,
            val_acc=va_ema,
        )

        instability_met, inst_details = self.instability_detector.update(
            epoch=epoch,
            loss=tl_ema,
        )

        condition_active = overfit_met or instability_met

        if condition_active:
            self.streak += 1
            if overfit_met:
                self.events.append(
                    MonitorEventItem(epoch=epoch, kind="overfit_warning", details=overfit_details)
                )
            if instability_met:
                self.events.append(
                    MonitorEventItem(epoch=epoch, kind="instability_warning", details=inst_details)
                )

            # Check patience threshold
            if self.streak >= self.patience:
                # Trigger fires!
                reason = "overfit" if overfit_met else "instability"
                trigger_event = MonitorEventItem(
                    epoch=epoch,
                    kind="trigger",
                    details={
                        "reason": reason,
                        "streak": self.streak,
                        "patience": self.patience,
                        "overfit_details": overfit_details if overfit_met else None,
                        "instability_details": inst_details if instability_met else None,
                    },
                )
                self.events.append(trigger_event)

                if self.on_trigger:
                    try:
                        self.on_trigger(trigger_event)
                    except Exception:
                        pass

                # Enter cooldown window and reset streak
                self.cooldown_remaining = self.cooldown_epochs
                self.streak = 0

                # Execute configured action
                action_event = MonitorEventItem(
                    epoch=epoch,
                    kind="action",
                    details={"action": self.action, "reason": reason},
                )
                self.events.append(action_event)

                if self.action == "early_stop":
                    self.should_stop = True
                elif self.action == "recover":
                    self._dispatch_recovery_action(epoch, model)

                return {"status": "triggered", "action": self.action, "reason": reason}

            return {"status": "warning", "streak": self.streak, "patience": self.patience}

        # Condition not met: reset patience streak
        self.streak = 0
        return {"status": "healthy"}

    def _dispatch_recovery_action(self, epoch: int, model: nn.Module | None) -> None:
        """Safely trigger snapshot recovery, guarding against concurrent executions."""
        with self._global_recovery_lock:
            if self.recovery_triggered:
                return
            self.recovery_triggered = True

        # Recovery triggered: signal early stop so training loop yields to recovery
        self.should_stop = True
