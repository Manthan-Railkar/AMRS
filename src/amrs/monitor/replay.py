"""Replay recorded metric series through live training monitor callback (Section ML-9, BE-6)."""

from __future__ import annotations

from typing import Any
import uuid

from amrs.monitor.callback import AMRSCallback
from amrs.schemas import MonitorConfig, MonitorReplayDetailResponse


def replay_metric_series(
    series: dict[str, list[float]],
    config: MonitorConfig | None = None,
    scenario_id: str = "custom",
    replay_id: str | None = None,
    action: str = "log",
) -> MonitorReplayDetailResponse:
    """Replay recorded metric series step-by-step through AMRSCallback.
    
    Returns:
        MonitorReplayDetailResponse with emitted monitor events and smoothed series.
    """
    rep_id = replay_id or str(uuid.uuid4())
    cfg = config or MonitorConfig()
    callback = AMRSCallback(config=cfg, run_id=rep_id, action=action)

    train_loss = series.get("train_loss", [])
    train_acc = series.get("train_acc", [])
    val_loss = series.get("val_loss", [])
    val_acc = series.get("val_acc", [])

    n_epochs = min(len(train_loss), len(train_acc), len(val_loss), len(val_acc))

    for epoch in range(1, n_epochs + 1):
        tl = train_loss[epoch - 1]
        ta = train_acc[epoch - 1]
        vl = val_loss[epoch - 1]
        va = val_acc[epoch - 1]

        callback.on_epoch_end(
            epoch=epoch,
            train_loss=tl,
            train_acc=ta,
            val_loss=vl,
            val_acc=va,
        )

        if callback.should_stop:
            break

    return MonitorReplayDetailResponse(
        replay_id=rep_id,
        scenario_id=scenario_id,
        status="succeeded",
        events=callback.events,
        series=callback.series,
    )
