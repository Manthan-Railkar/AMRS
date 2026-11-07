"""Unit tests for AMRS live training monitor, detectors, patience, cooldown, and callback (ML-9, BR13)."""

import pytest
import torch
import torch.nn as nn

from amrs.monitor.callback import AMRSCallback
from amrs.monitor.detectors import InstabilityDetector, OverfitDetector
from amrs.monitor.replay import replay_metric_series
from amrs.schemas import MonitorConfig, MonitorInstabilityConfig, MonitorOverfitConfig


# ---------------------------------------------------------------------------
# 1. Detector Unit Tests
# ---------------------------------------------------------------------------

def test_overfit_detector_condition():
    """OverfitDetector should flag when gap rises above threshold and val loss rises."""
    cfg = MonitorOverfitConfig(gap_rise_min=0.03, val_loss_rise=True)
    detector = OverfitDetector(config=cfg)

    # Epoch 1: baseline (train_acc=0.80, val_acc=0.80, val_loss=0.50)
    cond1, _ = detector.update(1, train_loss=0.50, train_acc=0.80, val_loss=0.50, val_acc=0.80)
    assert cond1 is False

    # Epoch 2: train_acc=0.82, val_acc=0.80 -> gap=0.02 (gap_rise=0.02 < 0.03)
    cond2, _ = detector.update(2, train_loss=0.45, train_acc=0.82, val_loss=0.51, val_acc=0.80)
    assert cond2 is False

    # Epoch 3: train_acc=0.85, val_acc=0.80 -> gap=0.05 (gap_rise=0.05 >= 0.03) and val_loss=0.53 > 0.50
    cond3, details = detector.update(3, train_loss=0.40, train_acc=0.85, val_loss=0.53, val_acc=0.80)
    assert cond3 is True
    assert details["gap_rise"] >= 0.03
    assert details["val_loss_rising"] is True


def test_instability_detector_spike_ratio():
    """InstabilityDetector should flag when loss exceeds spike_ratio * min_loss."""
    cfg = MonitorInstabilityConfig(spike_ratio=2.0)
    detector = InstabilityDetector(config=cfg)

    # Epoch 1: loss 0.40 (min=0.40)
    cond1, _ = detector.update(1, loss=0.40)
    assert cond1 is False

    # Epoch 2: loss 0.35 (new min=0.35)
    cond2, _ = detector.update(2, loss=0.35)
    assert cond2 is False

    # Epoch 3: loss 0.60 (ratio 0.60 / 0.35 = 1.71 < 2.0)
    cond3, _ = detector.update(3, loss=0.60)
    assert cond3 is False

    # Epoch 4: loss 0.75 (ratio 0.75 / 0.35 = 2.14 >= 2.0)
    cond4, details = detector.update(4, loss=0.75)
    assert cond4 is True
    assert details["ratio"] >= 2.0


# ---------------------------------------------------------------------------
# 2. EMA Smoothing Tests
# ---------------------------------------------------------------------------

def test_callback_ema_smoothing():
    """Metrics should be smoothed via EMA formula: beta * prev + (1 - beta) * curr."""
    cfg = MonitorConfig(ema_beta=0.6, patience=3, cooldown_epochs=5)
    cb = AMRSCallback(config=cfg)

    # Epoch 1: initial EMA equals value
    cb.on_epoch_end(1, train_loss=1.0, train_acc=0.7, val_loss=1.0, val_acc=0.7)
    assert cb.series["train_loss_ema"][-1] == 1.0

    # Epoch 2: 0.6 * 1.0 + 0.4 * 0.5 = 0.8
    cb.on_epoch_end(2, train_loss=0.5, train_acc=0.7, val_loss=1.0, val_acc=0.7)
    assert pytest.approx(cb.series["train_loss_ema"][-1], abs=1e-3) == 0.8


# ---------------------------------------------------------------------------
# 3. Patience & Cooldown Integration Tests
# ---------------------------------------------------------------------------

def test_callback_patience_triggers_only_after_consecutive_epochs():
    """Trigger must fire only after condition holds for patience consecutive epochs."""
    # Patience = 3, cooldown = 5
    cfg = MonitorConfig(patience=3, cooldown_epochs=5, overfit={"gap_rise_min": 0.03, "val_loss_rise": False})
    cb = AMRSCallback(config=cfg, action="log")

    # Baseline epoch 1: gap = 0.0
    cb.on_epoch_end(1, train_loss=0.5, train_acc=0.8, val_loss=0.5, val_acc=0.8)
    assert cb.streak == 0
    assert not any(e.kind == "trigger" for e in cb.events)

    # Epoch 2: gap = 0.10 (condition met, streak = 1)
    cb.on_epoch_end(2, train_loss=0.5, train_acc=0.9, val_loss=0.5, val_acc=0.8)
    assert cb.streak == 1
    assert not any(e.kind == "trigger" for e in cb.events)

    # Epoch 3: gap = 0.10 (condition met, streak = 2)
    cb.on_epoch_end(3, train_loss=0.5, train_acc=0.9, val_loss=0.5, val_acc=0.8)
    assert cb.streak == 2
    assert not any(e.kind == "trigger" for e in cb.events)

    # Epoch 4: gap = 0.10 (condition met, streak = 3 -> TRIGGER FIRES!)
    res = cb.on_epoch_end(4, train_loss=0.5, train_acc=0.9, val_loss=0.5, val_acc=0.8)
    assert res["status"] == "triggered"
    assert any(e.kind == "trigger" for e in cb.events)


def test_callback_patience_resets_if_condition_breaks():
    """If condition breaks before patience is reached, the streak counter must reset to 0."""
    cfg = MonitorConfig(patience=3, cooldown_epochs=5, overfit={"gap_rise_min": 0.03, "val_loss_rise": False})
    cb = AMRSCallback(config=cfg)

    # Epoch 1: baseline
    cb.on_epoch_end(1, train_loss=0.5, train_acc=0.8, val_loss=0.5, val_acc=0.8)

    # Epoch 2: gap = 0.10 (streak = 1)
    cb.on_epoch_end(2, train_loss=0.5, train_acc=0.9, val_loss=0.5, val_acc=0.8)
    assert cb.streak == 1

    # Epoch 3: healthy again (gap = 0.0 -> streak resets to 0)
    cb.on_epoch_end(3, train_loss=0.5, train_acc=0.8, val_loss=0.5, val_acc=0.8)
    assert cb.streak == 0

    # Epoch 4: gap = 0.10 (streak = 1 again, NOT 3)
    cb.on_epoch_end(4, train_loss=0.5, train_acc=0.9, val_loss=0.5, val_acc=0.8)
    assert cb.streak == 1
    assert not any(e.kind == "trigger" for e in cb.events)


def test_callback_cooldown_prevents_duplicate_triggers():
    """During cooldown epochs, no triggers or duplicate alerts may fire."""
    cfg = MonitorConfig(patience=2, cooldown_epochs=3, overfit={"gap_rise_min": 0.03, "val_loss_rise": False})
    cb = AMRSCallback(config=cfg)

    # Epoch 1: baseline
    cb.on_epoch_end(1, 0.5, 0.8, 0.5, 0.8)
    # Epoch 2: condition met (streak=1)
    cb.on_epoch_end(2, 0.5, 0.95, 0.5, 0.8)
    # Epoch 3: condition met (streak=2 -> trigger 1 fires, cooldown set to 3)
    cb.on_epoch_end(3, 0.5, 0.95, 0.5, 0.8)
    triggers_count_1 = sum(1 for e in cb.events if e.kind == "trigger")
    assert triggers_count_1 == 1

    # Epoch 4 (cooldown 1): severe gap, but must be suppressed by cooldown
    res4 = cb.on_epoch_end(4, 0.5, 0.99, 0.5, 0.7)
    assert res4["status"] == "cooldown"
    assert sum(1 for e in cb.events if e.kind == "trigger") == 1

    # Epoch 5 (cooldown 2)
    res5 = cb.on_epoch_end(5, 0.5, 0.99, 0.5, 0.7)
    assert res5["status"] == "cooldown"
    assert sum(1 for e in cb.events if e.kind == "trigger") == 1

    # Epoch 6 (cooldown 3)
    res6 = cb.on_epoch_end(6, 0.5, 0.99, 0.5, 0.7)
    assert res6["status"] == "cooldown"
    assert sum(1 for e in cb.events if e.kind == "trigger") == 1

    # Epoch 7: cooldown elapsed! Streak starts counting again (streak=1)
    res7 = cb.on_epoch_end(7, 0.5, 0.99, 0.5, 0.7)
    assert res7["status"] == "warning"
    assert cb.streak == 1


# ---------------------------------------------------------------------------
# 4. Actions: Early Stop & Snapshot Recovery
# ---------------------------------------------------------------------------

def test_callback_action_early_stop():
    """Action 'early_stop' must set should_stop=True upon trigger."""
    cfg = MonitorConfig(patience=1, cooldown_epochs=2, overfit={"gap_rise_min": 0.01, "val_loss_rise": False})
    cb = AMRSCallback(config=cfg, action="early_stop")

    assert cb.should_stop is False
    cb.on_epoch_end(1, 0.5, 0.8, 0.5, 0.8)
    cb.on_epoch_end(2, 0.5, 0.95, 0.5, 0.8)

    assert cb.should_stop is True


def test_callback_tracks_best_model_snapshot():
    """Callback should maintain the state_dict of the epoch with lowest val_loss."""
    cfg = MonitorConfig()
    cb = AMRSCallback(config=cfg)

    model = nn.Linear(2, 2)

    with torch.no_grad():
        model.weight.fill_(1.0)
    cb.on_epoch_end(1, 0.5, 0.8, 0.60, 0.8, model=model)
    assert cb.best_epoch == 1

    with torch.no_grad():
        model.weight.fill_(2.0)
    cb.on_epoch_end(2, 0.4, 0.85, 0.45, 0.85, model=model)
    assert cb.best_epoch == 2

    # Higher val loss should not overwrite best snapshot
    with torch.no_grad():
        model.weight.fill_(3.0)
    cb.on_epoch_end(3, 0.3, 0.90, 0.55, 0.83, model=model)
    assert cb.best_epoch == 2
    assert cb.best_state_dict is not None
    assert torch.allclose(cb.best_state_dict["weight"], torch.full_like(model.weight, 2.0))


# ---------------------------------------------------------------------------
# 5. Replay Service Tests
# ---------------------------------------------------------------------------

def test_replay_metric_series():
    """Replay service should execute metric history through callback and return response."""
    series = {
        "train_loss": [0.60, 0.50, 0.40, 0.30],
        "train_acc": [0.70, 0.80, 0.90, 0.95],
        "val_loss": [0.65, 0.55, 0.60, 0.70],
        "val_acc": [0.68, 0.75, 0.74, 0.72],
    }
    cfg = MonitorConfig(patience=1, cooldown_epochs=5, overfit={"gap_rise_min": 0.05, "val_loss_rise": True})
    resp = replay_metric_series(series, config=cfg, scenario_id="s1_overfit")

    assert resp.status == "succeeded"
    assert resp.scenario_id == "s1_overfit"
    assert len(resp.series["train_loss_ema"]) == 4
    assert len(resp.events) > 0

