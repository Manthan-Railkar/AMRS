"""Unit tests for AMRS metrics: classification, retention, paired bootstrap, and compute accounting (DM-1.1).

Covers all six acceptance criteria, edge cases (empty batch raises, single class,
all-wrong original), and Hypothesis property-based tests (accuracy ∈ [0,1],
ECE ∈ [0,1], bootstrap CI low ≤ delta ≤ high).
"""

from __future__ import annotations

import numpy as np
import pytest
import torch
import torch.nn as nn
import torch.nn.functional as F
from hypothesis import given, settings
from hypothesis import strategies as st
from torch.utils.data import DataLoader, TensorDataset

from amrs.metrics.bootstrap import paired_bootstrap_delta
from amrs.metrics.classification import (
    accuracy,
    ece,
    metric_bundle,
    nll,
    per_sample_correct,
    predict_logits,
)
from amrs.metrics.compute import ComputeMeter, NullMeter, meter_scope
from amrs.metrics.retention import retained_correct_rate, top1_agreement

# ═══════════════════════════════════════════════════════════════════════════
# ACCEPTANCE CRITERION 1 — ECE boundary values
# ═══════════════════════════════════════════════════════════════════════════


class TestECEAcceptanceCriterion1:
    """ECE of hand-built calibrated and uncalibrated examples."""

    def test_perfectly_calibrated_ece_is_zero(self) -> None:
        """A model whose confidence exactly equals its accuracy has ECE = 0."""
        # 100 samples, all predict class 0 with confidence p=0.8.
        # Exactly 80 of them ARE class 0 → perfectly calibrated.
        p = 0.8
        log_p = float(np.log(p))
        log_q = float(np.log(1.0 - p))
        logits = torch.tensor([[log_p, log_q]] * 100, dtype=torch.float64)
        labels = torch.tensor([0] * 80 + [1] * 20, dtype=torch.long)

        ece_val = ece(logits, labels, n_bins=10)
        assert abs(ece_val) < 1e-9, f"Expected ECE ≈ 0, got {ece_val}"

    def test_overconfident_50pct_accurate_ece_is_half(self) -> None:
        """A 100 %-confident, 50 %-accurate model has ECE = 0.5."""
        logits = torch.tensor([[100.0, -100.0]] * 100, dtype=torch.float64)
        labels = torch.tensor([0] * 50 + [1] * 50, dtype=torch.long)

        ece_val = ece(logits, labels, n_bins=15)
        assert abs(ece_val - 0.5) < 1e-9, f"Expected ECE ≈ 0.5, got {ece_val}"


# ═══════════════════════════════════════════════════════════════════════════
# ACCEPTANCE CRITERION 2 — NLL matches F.cross_entropy
# ═══════════════════════════════════════════════════════════════════════════


class TestNLLAcceptanceCriterion2:
    """NLL equals torch.nn.functional.cross_entropy on random logits within 1e-6."""

    def test_nll_matches_cross_entropy_random_logits(self) -> None:
        torch.manual_seed(42)
        logits = torch.randn(100, 10, dtype=torch.float32)
        labels = torch.randint(0, 10, (100,), dtype=torch.long)

        expected = float(F.cross_entropy(logits, labels).item())
        computed = nll(logits, labels)
        assert abs(computed - expected) < 1e-6

    def test_nll_matches_cross_entropy_binary(self) -> None:
        """Binary classification case."""
        torch.manual_seed(99)
        logits = torch.randn(50, 2, dtype=torch.float32)
        labels = torch.randint(0, 2, (50,), dtype=torch.long)

        expected = float(F.cross_entropy(logits, labels).item())
        computed = nll(logits, labels)
        assert abs(computed - expected) < 1e-6

    def test_accuracy_and_nll_basic(self) -> None:
        """Basic correctness of accuracy and NLL together."""
        # 3 samples, 2 classes: preds [0, 1, 1], truth [0, 1, 0] → 2/3 correct
        logits = torch.tensor([[2.0, 0.0], [0.0, 3.0], [1.0, 2.0]], dtype=torch.float32)
        labels = torch.tensor([0, 1, 0], dtype=torch.long)

        acc = accuracy(logits, labels)
        assert pytest.approx(acc, abs=1e-5) == 2.0 / 3.0

        expected_nll = float(F.cross_entropy(logits, labels).item())
        assert pytest.approx(nll(logits, labels), abs=1e-6) == expected_nll


# ═══════════════════════════════════════════════════════════════════════════
# ACCEPTANCE CRITERION 3 — retained_correct_rate glossary example
# ═══════════════════════════════════════════════════════════════════════════


class TestRetainedCorrectRateCriterion3:
    """retained_correct_rate = |orig correct AND cand correct| / |orig correct|."""

    def test_glossary_worked_example(self) -> None:
        # orig correct at indices {0, 1, 3} (3 samples)
        # cand correct at indices {0, 2, 3}
        # both correct at indices  {0, 3}    (2 samples)
        # rate = 2 / 3
        orig = [True, True, False, True, False]
        cand = [True, False, True, True, False]

        rate, zero_flag = retained_correct_rate(orig, cand)
        assert pytest.approx(rate, abs=1e-9) == 2.0 / 3.0
        assert zero_flag is False

    def test_all_wrong_original_returns_one_with_flag(self) -> None:
        """If the original had zero correct samples, returns (1.0, True)."""
        orig = [False, False, False]
        cand = [True, False, True]
        rate, flag = retained_correct_rate(orig, cand)
        assert rate == 1.0
        assert flag is True

    def test_perfect_retention(self) -> None:
        """Candidate preserves every originally-correct prediction."""
        orig = [True, True, False, True]
        cand = [True, True, True, True]
        rate, flag = retained_correct_rate(orig, cand)
        assert rate == 1.0
        assert flag is False

    def test_zero_retention(self) -> None:
        """Candidate flips every originally-correct prediction."""
        orig = [True, True, True]
        cand = [False, False, False]
        rate, flag = retained_correct_rate(orig, cand)
        assert rate == 0.0
        assert flag is False

    def test_length_mismatch_raises(self) -> None:
        with pytest.raises(ValueError, match="mismatch"):
            retained_correct_rate([True], [True, False])


# ═══════════════════════════════════════════════════════════════════════════
# ACCEPTANCE CRITERION 4 — Bootstrap CI
# ═══════════════════════════════════════════════════════════════════════════


class TestBootstrapCICriterion4:
    """Paired bootstrap CI with identical and strictly-better candidates."""

    def test_identical_models_delta_zero_ci_contains_zero(self) -> None:
        scores = np.array([1, 0, 1, 1, 0, 1, 0, 0, 1, 1] * 10, dtype=float)
        res = paired_bootstrap_delta(scores, scores, n_boot=1000, confidence=0.95, seed=42)

        assert pytest.approx(res["delta"], abs=1e-9) == 0.0
        assert res["ci_low"] <= 0.0 <= res["ci_high"]

    def test_strictly_better_candidate_ci_low_positive(self) -> None:
        orig = np.zeros(100, dtype=float)
        cand = np.ones(100, dtype=float)

        res = paired_bootstrap_delta(
            orig, cand, n_boot=500, confidence=0.95, seed=42, higher_is_better=True
        )
        assert res["delta"] == 1.0
        assert res["ci_low"] > 0.0

    def test_lower_is_better_direction(self) -> None:
        """For lower-is-better metrics, positive delta still means improvement."""
        orig = np.full(100, 0.5, dtype=float)  # original error = 0.5
        cand = np.full(100, 0.2, dtype=float)  # candidate error = 0.2

        res = paired_bootstrap_delta(
            orig, cand, n_boot=500, confidence=0.95, seed=42, higher_is_better=False
        )
        # delta = orig - cand = 0.5 - 0.2 = 0.3 (positive = improvement)
        assert res["delta"] == pytest.approx(0.3, abs=1e-9)
        assert res["ci_low"] > 0.0


# ═══════════════════════════════════════════════════════════════════════════
# ACCEPTANCE CRITERION 5 — Seed reproducibility
# ═══════════════════════════════════════════════════════════════════════════


class TestBootstrapSeedCriterion5:
    """Same seed produces identical CI."""

    def test_identical_seed_gives_identical_ci(self) -> None:
        orig = np.random.default_rng(1).binomial(1, 0.7, size=200).astype(float)
        cand = np.random.default_rng(2).binomial(1, 0.75, size=200).astype(float)

        res1 = paired_bootstrap_delta(orig, cand, n_boot=500, confidence=0.95, seed=777)
        res2 = paired_bootstrap_delta(orig, cand, n_boot=500, confidence=0.95, seed=777)

        assert res1["delta"] == res2["delta"]
        assert res1["ci_low"] == res2["ci_low"]
        assert res1["ci_high"] == res2["ci_high"]

    def test_different_seed_gives_different_ci(self) -> None:
        orig = np.random.default_rng(1).binomial(1, 0.6, size=200).astype(float)
        cand = np.random.default_rng(2).binomial(1, 0.65, size=200).astype(float)

        res1 = paired_bootstrap_delta(orig, cand, n_boot=500, confidence=0.95, seed=100)
        res2 = paired_bootstrap_delta(orig, cand, n_boot=500, confidence=0.95, seed=200)

        # With different seeds, at least CI bounds should differ
        assert res1["ci_low"] != res2["ci_low"] or res1["ci_high"] != res2["ci_high"]


# ═══════════════════════════════════════════════════════════════════════════
# ACCEPTANCE CRITERION 6 — ComputeMeter units = fwd + 3·bwd exactly
# ═══════════════════════════════════════════════════════════════════════════


class TestComputeMeterCriterion6:
    """ComputeMeter units formula and NullMeter."""

    def test_units_formula_exact(self) -> None:
        meter = ComputeMeter()
        meter.add_fwd(1000)
        meter.add_bwd(500)
        meter.add_grad_step(10)

        assert meter.fwd_samples == 1000
        assert meter.bwd_samples == 500
        assert meter.grad_steps == 10
        assert meter.units == 2500.0  # 1000 + 3 * 500

    def test_null_meter_always_zero(self) -> None:
        nm = NullMeter()
        nm.add_fwd(100)
        nm.add_bwd(200)
        nm.add_grad_step(5)
        assert nm.units == 0.0
        assert nm.wall_s == 0.0

    def test_context_manager(self) -> None:
        with ComputeMeter() as cm:
            cm.add_fwd(10)
            cm.add_bwd(5)
            assert cm.units == 25.0  # 10 + 3*5

    def test_meter_scope_nested_accounting(self) -> None:
        with ComputeMeter() as cm:
            cm.add_fwd(10)
            with cm.meter_scope("sub"):
                cm.add_fwd(20)
            assert cm.units == 30.0  # 10 + 20 + 3*0

    def test_module_level_meter_scope(self) -> None:
        with meter_scope("standalone") as m:
            m.add_fwd(5)
            assert m.units == 5.0

    def test_null_meter_context_manager(self) -> None:
        with NullMeter() as nm:
            nm.add_fwd(50)
            assert nm.units == 0.0

    def test_wall_s_positive(self) -> None:
        meter = ComputeMeter()
        # wall_s should be non-negative since it's time since construction
        assert meter.wall_s >= 0.0

    def test_incremental_accumulation(self) -> None:
        meter = ComputeMeter()
        meter.add_fwd(100)
        assert meter.units == 100.0
        meter.add_bwd(50)
        assert meter.units == 250.0  # 100 + 3*50
        meter.add_fwd(100)
        assert meter.units == 350.0  # 200 + 3*50
        meter.add_bwd(50)
        assert meter.units == 500.0  # 200 + 3*100


# ═══════════════════════════════════════════════════════════════════════════
# EDGE CASES
# ═══════════════════════════════════════════════════════════════════════════


class TestEdgeCases:
    """Empty batch raises, single class, all-wrong original, shape mismatches."""

    def test_empty_accuracy_raises(self) -> None:
        empty_t = torch.empty((0, 2), dtype=torch.float32)
        empty_y = torch.empty((0,), dtype=torch.long)
        with pytest.raises(ValueError, match="empty"):
            accuracy(empty_t, empty_y)

    def test_empty_nll_raises(self) -> None:
        empty_t = torch.empty((0, 2), dtype=torch.float32)
        empty_y = torch.empty((0,), dtype=torch.long)
        with pytest.raises(ValueError, match="empty"):
            nll(empty_t, empty_y)

    def test_empty_ece_raises(self) -> None:
        empty_t = torch.empty((0, 2), dtype=torch.float32)
        empty_y = torch.empty((0,), dtype=torch.long)
        with pytest.raises(ValueError, match="empty"):
            ece(empty_t, empty_y)

    def test_empty_predict_logits_raises(self) -> None:
        with pytest.raises(ValueError, match="empty"):
            predict_logits(nn.Linear(2, 2), [])

    def test_empty_bootstrap_raises(self) -> None:
        with pytest.raises(ValueError, match="empty"):
            paired_bootstrap_delta(np.array([]), np.array([]))

    def test_bootstrap_length_mismatch_raises(self) -> None:
        with pytest.raises(ValueError, match="identical length"):
            paired_bootstrap_delta(np.array([1.0, 2.0]), np.array([1.0]))

    def test_single_class_all_correct(self) -> None:
        """All samples are class 0, model predicts class 0 → accuracy 1.0."""
        logits = torch.tensor([[2.0, -1.0], [3.0, 0.0], [1.5, -0.5]], dtype=torch.float32)
        labels = torch.zeros(3, dtype=torch.long)

        assert accuracy(logits, labels) == 1.0
        assert nll(logits, labels) > 0.0
        assert 0.0 <= ece(logits, labels) <= 1.0

    def test_top1_agreement_identical(self) -> None:
        l1 = torch.tensor([[2.0, 0.0], [0.0, 2.0], [1.0, 0.0]])
        l2 = torch.tensor([[3.0, 0.0], [0.0, 1.0], [1.0, 0.0]])
        assert top1_agreement(l1, l2) == 1.0

    def test_top1_agreement_none(self) -> None:
        l1 = torch.tensor([[2.0, 0.0], [0.0, 2.0], [1.0, 0.0]])
        l3 = torch.tensor([[0.0, 2.0], [2.0, 0.0], [0.0, 1.0]])
        assert top1_agreement(l1, l3) == 0.0

    def test_top1_agreement_length_mismatch_raises(self) -> None:
        l1 = torch.tensor([[2.0, 0.0], [0.0, 2.0]])
        l2 = torch.tensor([[3.0, 0.0]])
        with pytest.raises(ValueError, match="mismatch"):
            top1_agreement(l1, l2)


# ═══════════════════════════════════════════════════════════════════════════
# FUNCTIONAL TESTS — predict_logits, per_sample_correct, metric_bundle
# ═══════════════════════════════════════════════════════════════════════════


class TestFunctional:
    """Functional tests for predict_logits, per_sample_correct, and metric_bundle."""

    def test_predict_logits_across_batches(self) -> None:
        """predict_logits concatenates across batches in eval/inference mode."""
        model = nn.Linear(4, 3)
        x = torch.randn(25, 4)
        y = torch.randint(0, 3, (25,))
        loader = DataLoader(TensorDataset(x, y), batch_size=10, shuffle=False)

        logits, labels = predict_logits(model, loader)
        assert logits.shape == (25, 3)
        assert labels.shape == (25,)
        # Labels should exactly match the original
        assert torch.equal(labels, y)

    def test_predict_logits_dict_batches_and_model_output_object(self) -> None:
        """predict_logits handles dict batches and models returning objects with .logits."""
        from types import SimpleNamespace

        class HuggingFaceStyleModel(nn.Module):
            def __init__(self) -> None:
                super().__init__()
                self.fc = nn.Linear(4, 2)

            def forward(self, input_ids: torch.Tensor, **kwargs: object) -> SimpleNamespace:
                out = self.fc(input_ids)
                return SimpleNamespace(logits=out)

        model = HuggingFaceStyleModel()
        # Format 1: dict batch with "labels"
        batch1 = {"input_ids": torch.randn(5, 4), "labels": torch.tensor([0, 1, 0, 1, 0])}
        # Format 2: dict batch with "label"
        batch2 = {"input_ids": torch.randn(5, 4), "label": torch.tensor([1, 0, 1, 0, 1])}
        # Format 3: (dict_x, y) tuple
        batch3 = ({"input_ids": torch.randn(4, 4)}, torch.tensor([0, 0, 1, 1]))

        class CustomBatch:
            def __init__(self, x: torch.Tensor, y: torch.Tensor) -> None:
                self.x = x
                self.y = y

            def __iter__(self) -> object:
                return iter((self.x, self.y))

        batch4 = CustomBatch(torch.randn(3, 4), torch.tensor([1, 1, 0]))

        logits, labels = predict_logits(model, [batch1, batch2, batch3, batch4])
        assert logits.shape == (17, 2)
        assert labels.shape == (17,)
        assert labels[0] == 0
        assert labels[5] == 1

    def test_per_sample_correct_returns_bool_array(self) -> None:
        logits = torch.tensor([[2.0, 0.0], [0.0, 3.0], [1.0, 2.0]], dtype=torch.float32)
        labels = torch.tensor([0, 1, 0], dtype=torch.long)

        correct = per_sample_correct(logits, labels)
        assert isinstance(correct, np.ndarray)
        assert correct.dtype == bool
        np.testing.assert_array_equal(correct, [True, True, False])

    def test_metric_bundle_contains_all_keys(self) -> None:
        torch.manual_seed(7)
        logits = torch.randn(30, 5)
        labels = torch.randint(0, 5, (30,))

        bundle = metric_bundle(logits, labels)
        assert set(bundle.keys()) == {"accuracy", "nll", "ece", "n"}
        assert bundle["n"] == 30.0
        assert 0.0 <= bundle["accuracy"] <= 1.0
        assert bundle["nll"] > 0.0
        assert 0.0 <= bundle["ece"] <= 1.0

    def test_metric_bundle_consistency(self) -> None:
        """metric_bundle returns the same values as individual function calls."""
        torch.manual_seed(13)
        logits = torch.randn(50, 4)
        labels = torch.randint(0, 4, (50,))

        bundle = metric_bundle(logits, labels, n_bins=10)
        assert bundle["accuracy"] == accuracy(logits, labels)
        assert bundle["nll"] == nll(logits, labels)
        assert bundle["ece"] == ece(logits, labels, n_bins=10)

    def test_bootstrap_with_custom_metric_fn(self) -> None:
        """paired_bootstrap_delta with custom metric_fn recomputes on resampled indices."""
        orig = np.array([0.1, 0.2, 0.3, 0.4, 0.5])
        cand = np.array([0.05, 0.1, 0.15, 0.2, 0.25])

        res = paired_bootstrap_delta(
            orig,
            cand,
            n_boot=200,
            higher_is_better=False,  # Lower is better
            metric_fn=lambda arr: float(np.sum(arr**2)),
        )
        # candidate has lower sum-of-squares → positive delta (improvement)
        assert res["delta"] > 0.0
        assert res["ci_low"] <= res["ci_high"]


# ═══════════════════════════════════════════════════════════════════════════
# HYPOTHESIS PROPERTY-BASED TESTS
# ═══════════════════════════════════════════════════════════════════════════


class TestHypothesis:
    """Property-based tests using the Hypothesis library."""

    @given(
        preds=st.lists(st.integers(min_value=0, max_value=4), min_size=5, max_size=50),
        labels=st.lists(st.integers(min_value=0, max_value=4), min_size=5, max_size=50),
    )
    @settings(max_examples=50)
    def test_accuracy_in_unit_interval(self, preds: list[int], labels: list[int]) -> None:
        """accuracy ∈ [0, 1] for all valid predictions and labels."""
        min_len = min(len(preds), len(labels))
        p_t = torch.tensor(preds[:min_len], dtype=torch.long)
        l_t = torch.tensor(labels[:min_len], dtype=torch.long)

        logits = F.one_hot(p_t, num_classes=5).float() * 10.0
        acc = accuracy(logits, l_t)
        assert 0.0 <= acc <= 1.0

    @given(
        n_samples=st.integers(min_value=5, max_value=40),
        num_classes=st.integers(min_value=2, max_value=6),
    )
    @settings(max_examples=50)
    def test_ece_in_unit_interval(self, n_samples: int, num_classes: int) -> None:
        """ECE ∈ [0, 1] for any logits and labels."""
        rng = torch.Generator().manual_seed(42)
        logits = torch.randn(n_samples, num_classes, generator=rng)
        labels = torch.randint(0, num_classes, (n_samples,), generator=rng)

        ece_val = ece(logits, labels, n_bins=10)
        assert 0.0 <= ece_val <= 1.0

    @given(
        values=st.lists(
            st.floats(min_value=-5.0, max_value=5.0, allow_nan=False, allow_infinity=False),
            min_size=10,
            max_size=30,
        )
    )
    @settings(max_examples=50)
    def test_bootstrap_ci_low_leq_ci_high(self, values: list[float]) -> None:
        """ci_low ≤ ci_high always holds."""
        orig = np.zeros(len(values), dtype=float)
        cand = np.array(values, dtype=float)

        res = paired_bootstrap_delta(orig, cand, n_boot=200, confidence=0.90, seed=123)
        assert res["ci_low"] <= res["ci_high"]
