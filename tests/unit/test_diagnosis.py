"""Unit tests for AMRS Diagnosis Engine, pure rules, probes, and holdout isolation (ML-1 / Section 2.8)."""

from __future__ import annotations

import pytest
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from amrs.diagnosis.engine import TIE_BREAK_ORDER, DiagnosisEngine
from amrs.diagnosis.rules import (
    check_bn_drift,
    check_head_degradation,
    check_healthy,
    check_instability,
    check_miscalibration,
    check_overfitting,
)
from amrs.evaluation.evaluator import HoldoutIsolatedContext
from amrs.models.registry import build
from amrs.schemas import (
    DiagnosisBnDriftConfig,
    DiagnosisConfig,
    DiagnosisHeadDegradationConfig,
    DiagnosisInstabilityConfig,
    DiagnosisMiscalibrationConfig,
    DiagnosisOverfittingConfig,
    DiagnosisReport,
)


def _make_loader(x: torch.Tensor, y: torch.Tensor, batch_size: int = 16) -> DataLoader:
    return DataLoader(TensorDataset(x, y), batch_size=batch_size, shuffle=False)


def _train_model(
    model: nn.Module,
    x_train: torch.Tensor,
    y_train: torch.Tensor,
    epochs: int = 30,
    lr: float = 0.05,
) -> None:
    """Train model to convergence on given dataset so head is fitted."""
    opt = torch.optim.SGD(model.parameters(), lr=lr, momentum=0.9)
    loss_fn = nn.CrossEntropyLoss()
    model.train()
    for _ in range(epochs):
        opt.zero_grad()
        out = model(x_train)
        loss = loss_fn(out, y_train)
        loss.backward()
        opt.step()
    model.eval()


# ---------------------------------------------------------------------------
# 1. Pure Rules Tests (Positive, Negative, Boundary)
# ---------------------------------------------------------------------------


def test_overfitting_rule_positive_negative_boundary() -> None:
    cfg = DiagnosisOverfittingConfig(gap_min=0.10, train_acc_min=0.90, val_loss_rise_epochs=3)

    # Positive: train_acc=0.95, gap=0.20 -> fired
    fired, item, raw_conf = check_overfitting(0.95, 0.75, None, cfg)
    assert fired is True
    assert item.label == "overfitting"
    assert pytest.approx(item.confidence, abs=1e-4) == 0.20 / (0.10 * 2.0)  # 1.0
    assert item.evidence.not_evaluable is False

    # Positive with history boost (+0.2)
    history_res = {"condition_met": True}
    fired_boost, item_boost, _ = check_overfitting(0.92, 0.80, history_res, cfg)
    assert fired_boost is True
    # gap = 0.12, base_conf = 0.12 / 0.20 = 0.60, with boost = 0.80
    assert pytest.approx(item_boost.confidence, abs=1e-4) == 0.80

    # Negative 1: train_acc < train_acc_min
    fired_neg1, item_neg1, _ = check_overfitting(0.85, 0.60, None, cfg)
    assert fired_neg1 is False
    assert item_neg1.confidence == 0.0

    # Negative 2: gap < gap_min
    fired_neg2, item_neg2, _ = check_overfitting(0.95, 0.90, None, cfg)
    assert fired_neg2 is False
    assert item_neg2.confidence == 0.0

    # Boundary at exact equality: train_acc == 0.90, gap == 0.10 -> must fire
    fired_bound, item_bound, _ = check_overfitting(0.90, 0.80, None, cfg)
    assert fired_bound is True
    assert pytest.approx(item_bound.confidence, abs=1e-4) == 0.10 / 0.20  # 0.50


def test_miscalibration_rule_positive_negative_boundary() -> None:
    cfg = DiagnosisMiscalibrationConfig(ece_min=0.05, ece_bins=15)

    # Positive: ECE=0.08, |T - 1| = 0.5
    temp_res_pos = {"ece": 0.08, "fitted_temperature": 1.5, "temperature_divergence": 0.5}
    fired, item, _ = check_miscalibration(temp_res_pos, cfg)
    assert fired is True
    assert item.label == "miscalibration"
    assert pytest.approx(item.confidence, abs=1e-4) == 0.08 / (2.0 * 0.05)  # 0.80

    # Negative 1: low ECE
    temp_res_neg1 = {"ece": 0.02, "fitted_temperature": 1.5, "temperature_divergence": 0.5}
    fired_neg1, item_neg1, _ = check_miscalibration(temp_res_neg1, cfg)
    assert fired_neg1 is False
    assert item_neg1.confidence == 0.0

    # Negative 2: temperature divergence < 0.15
    temp_res_neg2 = {"ece": 0.08, "fitted_temperature": 1.05, "temperature_divergence": 0.05}
    fired_neg2, item_neg2, _ = check_miscalibration(temp_res_neg2, cfg)
    assert fired_neg2 is False
    assert item_neg2.confidence == 0.0

    # Boundary at exact equality: ECE == 0.05, |T - 1| == 0.15 -> must fire
    temp_res_bound = {"ece": 0.05, "fitted_temperature": 1.15, "temperature_divergence": 0.15}
    fired_bound, item_bound, _ = check_miscalibration(temp_res_bound, cfg)
    assert fired_bound is True
    assert pytest.approx(item_bound.confidence, abs=1e-4) == 0.05 / 0.10  # 0.50


def test_bn_drift_rule_positive_negative_boundary_and_missing() -> None:
    cfg = DiagnosisBnDriftConfig(divergence_min=0.5, acc_drop_min=0.03)

    # Positive: divergence=0.8 >= 0.5 and acc_drop = 0.90 - 0.85 = 0.05 >= 0.03
    bn_pos = {"evaluable": True, "divergence": 0.8, "num_bn_layers": 3}
    fired, item, _ = check_bn_drift(bn_pos, 0.90, 0.85, cfg)
    assert fired is True
    assert item.label == "bn_drift"
    assert pytest.approx(item.confidence, abs=1e-4) == 0.8 / (2.0 * 0.5)  # 0.80

    # Negative 1: divergence < divergence_min
    bn_neg1 = {"evaluable": True, "divergence": 0.3, "num_bn_layers": 3}
    fired_neg1, item_neg1, _ = check_bn_drift(bn_neg1, 0.90, 0.85, cfg)
    assert fired_neg1 is False
    assert item_neg1.confidence == 0.0

    # Negative 2: acc_drop < acc_drop_min
    fired_neg2, item_neg2, _ = check_bn_drift(bn_pos, 0.90, 0.89, cfg)
    assert fired_neg2 is False
    assert item_neg2.confidence == 0.0

    # Boundary at exact equality: divergence == 0.5, acc_drop == 0.03 -> must fire
    bn_bound = {"evaluable": True, "divergence": 0.5, "num_bn_layers": 3}
    fired_bound, item_bound, _ = check_bn_drift(bn_bound, 0.90, 0.87, cfg)
    assert fired_bound is True
    assert pytest.approx(item_bound.confidence, abs=1e-4) == 0.5 / 1.0  # 0.50

    # Missing BN layers: evaluable = False -> not_evaluable marked
    bn_missing = {"evaluable": False, "reason": "NO_BN_LAYERS"}
    fired_miss, item_miss, _ = check_bn_drift(bn_missing, 0.90, 0.70, cfg)
    assert fired_miss is False
    assert item_miss.evidence.not_evaluable is True
    assert item_miss.evidence.not_evaluable_reason == "NO_BN_LAYERS"


def test_instability_rule_positive_negative_boundary_and_missing() -> None:
    cfg = DiagnosisInstabilityConfig(spike_ratio=2.0, cv_min=0.35)

    # Positive 1: spike ratio fired
    res_spike = {
        "evaluable": True,
        "max_spike_ratio": 2.6,
        "cv_detrended": 0.20,
        "spike_fired": True,
        "cv_fired": False,
        "fired": True,
    }
    fired, item, _ = check_instability(res_spike, cfg)
    assert fired is True
    assert item.label == "instability"
    assert pytest.approx(item.confidence, abs=1e-4) == 2.6 / (2.0 * 2.0)  # 0.65

    # Positive 2: detrended CV fired
    res_cv = {
        "evaluable": True,
        "max_spike_ratio": 1.2,
        "cv_detrended": 0.50,
        "spike_fired": False,
        "cv_fired": True,
        "fired": True,
    }
    fired_cv, item_cv, _ = check_instability(res_cv, cfg)
    assert fired_cv is True
    assert pytest.approx(item_cv.confidence, abs=1e-4) == 0.50 / (2.0 * 0.35)  # 0.7142

    # Negative: stable
    res_neg = {
        "evaluable": True,
        "max_spike_ratio": 1.2,
        "cv_detrended": 0.15,
        "spike_fired": False,
        "cv_fired": False,
        "fired": False,
    }
    fired_neg, item_neg, _ = check_instability(res_neg, cfg)
    assert fired_neg is False
    assert item_neg.confidence == 0.0

    # Boundary at exact equality: spike_ratio == 2.0
    res_bound = {
        "evaluable": True,
        "max_spike_ratio": 2.0,
        "cv_detrended": 0.10,
        "spike_fired": True,
        "cv_fired": False,
        "fired": True,
    }
    fired_bound, item_bound, _ = check_instability(res_bound, cfg)
    assert fired_bound is True
    assert pytest.approx(item_bound.confidence, abs=1e-4) == 2.0 / 4.0  # 0.50

    # Missing history
    res_missing = {"evaluable": False, "reason": "NO_HISTORY"}
    fired_miss, item_miss, _ = check_instability(res_missing, cfg)
    assert fired_miss is False
    assert item_miss.evidence.not_evaluable is True
    assert item_miss.evidence.not_evaluable_reason == "NO_HISTORY"


def test_head_degradation_rule_positive_negative_boundary_and_missing() -> None:
    cfg = DiagnosisHeadDegradationConfig(probe_gain_min=0.02)

    # Positive: probe gain 0.05 >= 0.02
    res_pos = {"evaluable": True, "probe_gain": 0.05, "probe_val_acc": 0.85, "model_val_acc": 0.80}
    fired, item, _ = check_head_degradation(res_pos, cfg)
    assert fired is True
    assert item.label == "head_degradation"
    assert pytest.approx(item.confidence, abs=1e-4) == 1.0  # Capped at 1.0

    # Negative: probe gain 0.01 < 0.02
    res_neg = {"evaluable": True, "probe_gain": 0.01, "probe_val_acc": 0.81, "model_val_acc": 0.80}
    fired_neg, item_neg, _ = check_head_degradation(res_neg, cfg)
    assert fired_neg is False
    assert item_neg.confidence == 0.0

    # Boundary at exact equality: probe gain == 0.02 -> must fire
    res_bound = {
        "evaluable": True,
        "probe_gain": 0.02,
        "probe_val_acc": 0.82,
        "model_val_acc": 0.80,
    }
    fired_bound, item_bound, _ = check_head_degradation(res_bound, cfg)
    assert fired_bound is True
    assert pytest.approx(item_bound.confidence, abs=1e-4) == 0.02 / 0.04  # 0.50

    # Missing head
    res_missing = {"evaluable": False, "reason": "NO_IDENTIFIABLE_HEAD"}
    fired_miss, item_miss, _ = check_head_degradation(res_missing, cfg)
    assert fired_miss is False
    assert item_miss.evidence.not_evaluable is True
    assert item_miss.evidence.not_evaluable_reason == "NO_IDENTIFIABLE_HEAD"


def test_healthy_rule() -> None:
    # Any fired -> healthy is False
    is_healthy1, _ = check_healthy([0.8, 0.4], any_fired=True)
    assert is_healthy1 is False

    # None fired -> healthy is True with 1 - max(raw_confs)
    is_healthy2, item = check_healthy([0.2, 0.35, 0.1], any_fired=False)
    assert is_healthy2 is True
    assert item.label == "healthy"
    assert pytest.approx(item.confidence, abs=1e-4) == 1.0 - 0.35  # 0.65


# ---------------------------------------------------------------------------
# 2. Multi-Label Ordering and Tie-Break Tests
# ---------------------------------------------------------------------------


def test_multi_label_ranking_and_tie_breaking() -> None:
    engine = DiagnosisEngine()

    torch.manual_seed(42)
    model = build("mlp_small", num_classes=2, in_shape=(8,))
    x = torch.randn(40, 8)
    y = torch.randint(0, 2, (40,))
    loader = _make_loader(x, y)
    data = {"train": loader, "val": loader}

    cfg = DiagnosisConfig(
        overfitting=DiagnosisOverfittingConfig(gap_min=0.01, train_acc_min=0.1),
        miscalibration=DiagnosisMiscalibrationConfig(ece_min=0.01),
        bn_drift=DiagnosisBnDriftConfig(divergence_min=0.01, acc_drop_min=0.01),
        instability=DiagnosisInstabilityConfig(spike_ratio=1.01, cv_min=0.01),
        head_degradation=DiagnosisHeadDegradationConfig(probe_gain_min=0.001),
    )

    history = [
        {"epoch": 1, "train_loss": 0.5, "val_loss": 0.5},
        {"epoch": 2, "train_loss": 0.4, "val_loss": 0.6},
        {"epoch": 3, "train_loss": 0.3, "val_loss": 0.7},
        {"epoch": 4, "train_loss": 1.5, "val_loss": 1.8},
    ]

    report = engine.diagnose(model, data, history=history, config_override=cfg)
    assert len(report.diagnoses) >= 1
    # Check that rank values are strictly sequential 1, 2, 3...
    for i, diag in enumerate(report.diagnoses):
        assert diag.rank == i + 1

    # Check that confidences are sorted descending
    for i in range(len(report.diagnoses) - 1):
        assert report.diagnoses[i].confidence >= report.diagnoses[i + 1].confidence

    tie_order = TIE_BREAK_ORDER
    assert tie_order.index("bn_drift") < tie_order.index("head_degradation")
    assert tie_order.index("head_degradation") < tie_order.index("instability")
    assert tie_order.index("instability") < tie_order.index("overfitting")
    assert tie_order.index("overfitting") < tie_order.index("miscalibration")


# ---------------------------------------------------------------------------
# 3. No-Holdout-Access Invariant Test
# ---------------------------------------------------------------------------


def test_diagnosis_never_accesses_holdout() -> None:
    torch.manual_seed(42)
    x = torch.randn(30, 8)
    y = torch.randint(0, 2, (30,))
    loader = _make_loader(x, y)

    ctx = HoldoutIsolatedContext(
        train_loader=loader,
        val_loader=loader,
        target_loader=loader,
        holdout_loader=loader,
        split_id="secure_split_1",
    )

    engine = DiagnosisEngine()
    model = build("mlp_small", num_classes=2, in_shape=(8,))

    # Must complete cleanly without touching holdout
    report = engine.diagnose(model, ctx)
    assert isinstance(report, DiagnosisReport)
    assert ctx._holdout_eval_count == 0


# ---------------------------------------------------------------------------
# 4. Tiny Scenarios S1-S6 Verification
# ---------------------------------------------------------------------------


def test_scenario_s1_overfitting_detected() -> None:
    """S1: Overfit model with high train accuracy and high generalization gap."""
    torch.manual_seed(1234)
    model = build("mlp_small", num_classes=2, in_shape=(8,))

    # Train data separable
    x_train = torch.cat([torch.randn(30, 8) + 3.0, torch.randn(30, 8) - 3.0], dim=0)
    y_train = torch.cat([torch.zeros(30, dtype=torch.long), torch.ones(30, dtype=torch.long)])

    # Validation data random noise
    x_val = torch.randn(60, 8)
    y_val = torch.randint(0, 2, (60,))

    _train_model(model, x_train, y_train, epochs=25, lr=0.1)

    data = {"train": _make_loader(x_train, y_train), "val": _make_loader(x_val, y_val)}
    history = [
        {"epoch": 1, "train_loss": 0.50, "train_acc": 0.85, "val_loss": 0.60, "val_acc": 0.70},
        {"epoch": 2, "train_loss": 0.30, "train_acc": 0.95, "val_loss": 0.70, "val_acc": 0.60},
        {"epoch": 3, "train_loss": 0.15, "train_acc": 0.98, "val_loss": 0.85, "val_acc": 0.55},
        {"epoch": 4, "train_loss": 0.05, "train_acc": 1.00, "val_loss": 1.10, "val_acc": 0.50},
    ]

    engine = DiagnosisEngine()
    report = engine.diagnose(model, data, history=history)

    assert report.primary_label == "overfitting"
    assert report.is_healthy is False
    assert report.diagnoses[0].label == "overfitting"
    assert report.diagnoses[0].confidence > 0.8


def test_scenario_s2_miscalibration_detected() -> None:
    """S2: Healthy model with final-layer weights scaled x3.5 (inflated confidence, high ECE)."""
    torch.manual_seed(1234)
    model = build("mlp_small", num_classes=2, in_shape=(8,))

    # Balanced data with overlap
    x_pos = torch.randn(50, 8) + 1.2
    x_neg = torch.randn(50, 8) - 1.2
    x_train = torch.cat([x_pos[:30], x_neg[:30]], dim=0)
    y_train = torch.cat([torch.zeros(30, dtype=torch.long), torch.ones(30, dtype=torch.long)])

    x_val = torch.cat([x_pos[30:], x_neg[30:]], dim=0)
    y_val = torch.cat([torch.zeros(20, dtype=torch.long), torch.ones(20, dtype=torch.long)])
    # Flip a few labels in val so accuracy is ~85% while confidence is 99%
    y_val[0] = 1
    y_val[1] = 1
    y_val[2] = 1
    y_val[20] = 0
    y_val[21] = 0
    y_val[22] = 0

    _train_model(model, x_train, y_train, epochs=25, lr=0.05)

    # Scale final layer by 3.5 to create severe overconfidence
    with torch.no_grad():
        model.fc.weight.mul_(3.5)
        if model.fc.bias is not None:
            model.fc.bias.mul_(3.5)

    engine = DiagnosisEngine()
    data = {"train": _make_loader(x_train, y_train), "val": _make_loader(x_val, y_val)}
    report = engine.diagnose(model, data)

    # Primary label must be miscalibration
    assert report.primary_label == "miscalibration"
    assert report.diagnoses[0].label == "miscalibration"
    assert report.diagnoses[0].evidence.metric_values["fitted_temperature"] > 1.15


def test_scenario_s3_bn_drift_detected() -> None:
    """S3: Model with BatchNorm evaluated on shifted target distribution."""
    torch.manual_seed(1234)
    model = build("small_cnn", num_classes=2, in_shape=(1, 16, 16))

    # Clean train data from N(0, 1)
    x_train = torch.cat([torch.randn(32, 1, 16, 16) + 1.0, torch.randn(32, 1, 16, 16) - 1.0], dim=0)
    y_train = torch.cat([torch.zeros(32, dtype=torch.long), torch.ones(32, dtype=torch.long)])

    _train_model(model, x_train, y_train, epochs=15, lr=0.02)

    # Shifted target data from N(5.0, 3.0) -> severe distribution shift
    x_shifted = (torch.randn(64, 1, 16, 16) * 3.0) + 5.0
    y_shifted = torch.randint(0, 2, (64,))

    data = {
        "train": _make_loader(x_train, y_train),
        "val": _make_loader(x_shifted, y_shifted),
        "target": _make_loader(x_shifted, y_shifted),
    }

    cfg = DiagnosisConfig(
        bn_drift=DiagnosisBnDriftConfig(divergence_min=0.2, acc_drop_min=0.0),
    )
    engine = DiagnosisEngine(config=cfg)
    report = engine.diagnose(model, data)

    assert report.primary_label == "bn_drift"
    assert report.diagnoses[0].label == "bn_drift"
    assert report.diagnoses[0].evidence.metric_values["divergence"] >= 0.2


def test_scenario_s4_instability_detected() -> None:
    """S4: Training history with loss spike ratio >= 2.0."""
    torch.manual_seed(1234)
    model = build("mlp_small", num_classes=2, in_shape=(8,))
    x = torch.cat([torch.randn(30, 8) + 1.5, torch.randn(30, 8) - 1.5], dim=0)
    y = torch.cat([torch.zeros(30, dtype=torch.long), torch.ones(30, dtype=torch.long)])
    _train_model(model, x, y, epochs=15, lr=0.05)

    loader = _make_loader(x, y)
    data = {"train": loader, "val": loader}

    # Spike in final epoch
    history = [
        {"epoch": 1, "train_loss": 0.60, "val_loss": 0.62},
        {"epoch": 2, "train_loss": 0.55, "val_loss": 0.58},
        {"epoch": 3, "train_loss": 0.52, "val_loss": 0.54},
        {"epoch": 4, "train_loss": 0.50, "val_loss": 0.51},
        {"epoch": 5, "train_loss": 1.85, "val_loss": 1.90},  # 1.85 / 0.52 = 3.55x spike
    ]

    engine = DiagnosisEngine()
    report = engine.diagnose(model, data, history=history)

    assert report.primary_label == "instability"
    assert report.diagnoses[0].label == "instability"
    assert report.diagnoses[0].evidence.metric_values["max_spike_ratio"] >= 2.0


def test_scenario_s5_degraded_head_detected() -> None:
    """S5: Penultimate features are clean, but classification head is scrambled."""
    torch.manual_seed(1234)
    model = build("mlp_small", num_classes=2, in_shape=(8,))

    # Well-separated features
    x_train = torch.cat([torch.randn(40, 8) + 2.0, torch.randn(40, 8) - 2.0], dim=0)
    y_train = torch.cat([torch.zeros(40, dtype=torch.long), torch.ones(40, dtype=torch.long)])

    x_val = torch.cat([torch.randn(20, 8) + 2.0, torch.randn(20, 8) - 2.0], dim=0)
    y_val = torch.cat([torch.zeros(20, dtype=torch.long), torch.ones(20, dtype=torch.long)])

    # Zero out head weights and set opposite bias so model accuracy is ~0% while probe recovers ~100%
    with torch.no_grad():
        model.fc.weight.zero_()
        model.fc.bias.copy_(torch.tensor([-5.0, 5.0]))

    data = {"train": _make_loader(x_train, y_train), "val": _make_loader(x_val, y_val)}
    engine = DiagnosisEngine()
    report = engine.diagnose(model, data)

    assert report.primary_label == "head_degradation"
    assert report.diagnoses[0].label == "head_degradation"
    assert report.diagnoses[0].evidence.metric_values["probe_gain"] >= 0.02


def test_scenario_s6_healthy_control() -> None:
    """S6: Well-regularized, well-calibrated model with no failure symptoms."""
    torch.manual_seed(1234)
    model = build("mlp_small", num_classes=2, in_shape=(8,))

    # Clean linearly separable data
    x_train = torch.cat([torch.randn(40, 8) + 2.5, torch.randn(40, 8) - 2.5], dim=0)
    y_train = torch.cat([torch.zeros(40, dtype=torch.long), torch.ones(40, dtype=torch.long)])
    x_val = torch.cat([torch.randn(30, 8) + 2.5, torch.randn(30, 8) - 2.5], dim=0)
    y_val = torch.cat([torch.zeros(30, dtype=torch.long), torch.ones(30, dtype=torch.long)])

    # Train model to convergence so head is well fitted and calibrated
    _train_model(model, x_train, y_train, epochs=35, lr=0.05)

    data = {"train": _make_loader(x_train, y_train), "val": _make_loader(x_val, y_val)}
    history = [
        {"epoch": 1, "train_loss": 0.50, "train_acc": 0.85, "val_loss": 0.52, "val_acc": 0.85},
        {"epoch": 2, "train_loss": 0.20, "train_acc": 0.95, "val_loss": 0.22, "val_acc": 0.95},
        {"epoch": 3, "train_loss": 0.10, "train_acc": 0.98, "val_loss": 0.12, "val_acc": 0.98},
    ]

    engine = DiagnosisEngine()
    report = engine.diagnose(model, data, history=history)

    assert report.is_healthy is True
    assert report.primary_label == "healthy"
    assert len(report.diagnoses) == 1
    assert report.diagnoses[0].label == "healthy"
    assert report.diagnoses[0].confidence > 0.0


def test_determinism_repeated_runs() -> None:
    """Repeated runs with same inputs and seed produce identical labels and confidences."""
    torch.manual_seed(1234)
    model = build("mlp_small", num_classes=2, in_shape=(8,))
    x = torch.randn(40, 8)
    y = torch.randint(0, 2, (40,))
    loader = _make_loader(x, y)
    data = {"train": loader, "val": loader}

    engine = DiagnosisEngine()
    rep1 = engine.diagnose(model, data, seed=42)
    rep2 = engine.diagnose(model, data, seed=42)

    assert rep1.primary_label == rep2.primary_label
    assert rep1.is_healthy == rep2.is_healthy
    assert len(rep1.diagnoses) == len(rep2.diagnoses)
    for d1, d2 in zip(rep1.diagnoses, rep2.diagnoses):
        assert d1.label == d2.label
        assert d1.confidence == d2.confidence
        assert d1.rank == d2.rank
