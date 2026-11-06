"""Unit tests for AMRS metrics: classification, retention, paired bootstrap, and compute accounting (BE-5 / DM-1.1)."""

import numpy as np
import pytest
import torch
import torch.nn.functional as F

from amrs.metrics.bootstrap import paired_bootstrap_delta
from amrs.metrics.classification import (
    accuracy,
    ece,
    metric_bundle,
    nll,
    per_sample_correct,
)
from amrs.metrics.compute import ComputeMeter, NullMeter
from amrs.metrics.retention import retained_correct_rate, top1_agreement


def test_accuracy_and_nll_correctness() -> None:
    # 3 samples, 2 classes
    logits = torch.tensor([[2.0, 0.0], [0.0, 3.0], [1.0, 2.0]], dtype=torch.float32)
    labels = torch.tensor([0, 1, 0], dtype=torch.long)

    # Predictions: [0, 1, 1], Ground truth: [0, 1, 0] -> 2 correct out of 3
    acc = accuracy(logits, labels)
    assert pytest.approx(acc, abs=1e-5) == 2.0 / 3.0

    # NLL must match cross_entropy
    expected_nll = float(F.cross_entropy(logits, labels).item())
    assert pytest.approx(nll(logits, labels), abs=1e-5) == expected_nll


def test_ece_perfectly_calibrated_equals_zero() -> None:
    """Criterion 1: ECE of a perfectly calibrated example equals 0 within 1e-9."""
    # Construct 100 samples with confidence 0.8 where exactly 80 are correct
    # Logits with softmax [0.8, 0.2]
    p = 0.8
    log_p = float(np.log(p))
    log_q = float(np.log(1.0 - p))
    logits = torch.tensor([[log_p, log_q]] * 100, dtype=torch.float64)

    # 80 correct (class 0), 20 incorrect (class 1)
    labels = torch.tensor([0] * 80 + [1] * 20, dtype=torch.long)

    ece_val = ece(logits, labels, n_bins=10)
    assert abs(ece_val) < 1e-9


def test_ece_overconfident_uncalibrated_example() -> None:
    """Criterion 1 (part 2): 100% confident but 50% accurate model has ECE = 0.5."""
    # Extreme logits -> 100% confidence
    logits = torch.tensor([[100.0, -100.0]] * 100, dtype=torch.float32)
    # 50 correct, 50 wrong
    labels = torch.tensor([0] * 50 + [1] * 50, dtype=torch.long)

    ece_val = ece(logits, labels, n_bins=15)
    assert pytest.approx(ece_val, abs=1e-5) == 0.5


def test_retained_correct_rate_and_edge_cases() -> None:
    """Criterion 3: retained_correct_rate = |orig correct AND cand correct| / |orig correct|."""
    orig = [True, True, False, True, False]  # 3 correct
    cand = [True, False, True, True, False]  # Both correct: indices 0 and 3 (2)

    rate, zero_flag = retained_correct_rate(orig, cand)
    assert pytest.approx(rate, abs=1e-5) == 2.0 / 3.0
    assert not zero_flag

    # Edge case: original has 0 correct samples -> returns 1.0 and zero_flag=True
    orig_zero = [False, False, False]
    cand_some = [True, False, True]
    rate_zero, flag_zero = retained_correct_rate(orig_zero, cand_some)
    assert rate_zero == 1.0
    assert flag_zero


def test_paired_bootstrap_identical_models() -> None:
    """Criterion 4: Bootstrap with identical models returns delta 0 and CI containing 0."""
    scores = np.array([1, 0, 1, 1, 0, 1, 0, 0, 1, 1] * 10, dtype=float)
    res = paired_bootstrap_delta(scores, scores, n_boot=500, confidence=0.95, seed=42)

    assert pytest.approx(res["delta"], abs=1e-6) == 0.0
    assert res["ci_low"] <= 0.0 <= res["ci_high"]


def test_paired_bootstrap_strictly_better_candidate() -> None:
    """Criterion 4 (part 2): Candidate strictly better on every sample gives ci_low > 0."""
    orig = np.zeros(100, dtype=float)
    cand = np.ones(100, dtype=float)

    res = paired_bootstrap_delta(orig, cand, n_boot=500, confidence=0.95, seed=42, higher_is_better=True)
    assert res["delta"] == 1.0
    assert res["ci_low"] > 0.0


def test_paired_bootstrap_seed_reproducibility() -> None:
    """Criterion 5: Same seed produces identical CI."""
    orig = np.random.default_rng(1).binomial(1, 0.7, size=200)
    cand = np.random.default_rng(2).binomial(1, 0.75, size=200)

    res1 = paired_bootstrap_delta(orig, cand, n_boot=500, confidence=0.95, seed=777)
    res2 = paired_bootstrap_delta(orig, cand, n_boot=500, confidence=0.95, seed=777)

    assert res1["delta"] == res2["delta"]
    assert res1["ci_low"] == res2["ci_low"]
    assert res1["ci_high"] == res2["ci_high"]


def test_compute_meter_accounting() -> None:
    """Criterion 6: ComputeMeter units = fwd + 3 * bwd exactly."""
    meter = ComputeMeter()
    meter.add_fwd(1000)
    meter.add_bwd(500)
    meter.add_grad_step(10)

    # 1000 + 3 * 500 = 2500
    assert meter.fwd_samples == 1000
    assert meter.bwd_samples == 500
    assert meter.grad_steps == 10
    assert meter.units == 2500.0

    # NullMeter returns 0
    null_m = NullMeter()
    null_m.add_fwd(100)
    null_m.add_bwd(100)
    assert null_m.units == 0.0
