"""Unit tests for the Verification Gate, acceptance rules, and holdout protection (BE-5)."""

import pytest
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from amrs.errors import ConflictError, ForbiddenError, HoldoutTooSmallError
from amrs.evaluation.evaluator import HoldoutIsolatedContext, ModelEvaluator
from amrs.evaluation.gate import VerificationGate
from amrs.schemas import GateConfig, GateMinGainConfig, GateMaxRegressionConfig


def create_dummy_dataset(n_samples: int = 500, in_features: int = 10, num_classes: int = 2) -> DataLoader:
    torch.manual_seed(42)
    x = torch.randn(n_samples, in_features)
    y = torch.randint(0, num_classes, (n_samples,))
    return DataLoader(TensorDataset(x, y), batch_size=64, shuffle=False)


def test_holdout_direct_access_is_forbidden() -> None:
    loader = create_dummy_dataset(250)
    ctx = HoldoutIsolatedContext(
        train_loader=loader,
        val_loader=loader,
        target_loader=loader,
        holdout_loader=loader,
        split_id="split_001",
    )

    # Calling holdout_loader directly MUST raise ForbiddenError
    with pytest.raises(ForbiddenError) as exc_info:
        _ = ctx.holdout_loader
    assert "Direct access to holdout dataset is prohibited" in str(exc_info.value.message)

    # Calling get_candidate_selection_loaders does NOT include holdout
    candidate_loaders = ctx.get_candidate_selection_loaders()
    assert "train" in candidate_loaders
    assert "val" in candidate_loaders
    assert "target" in candidate_loaders
    assert "holdout" not in candidate_loaders


def test_gate_evaluations_count_cap_raises_conflict() -> None:
    loader = create_dummy_dataset(500)
    ctx = HoldoutIsolatedContext(holdout_loader=loader)

    # Model definition
    model = nn.Linear(10, 2)
    gate = VerificationGate(config=GateConfig(max_holdout_evaluations=2))

    # Evaluation 1: allowed
    _ = gate.evaluate_candidate(model, model, ctx, primary_metric="accuracy", candidate_idx=1, total_candidates=3)
    assert ctx.holdout_evaluations_count == 1

    # Evaluation 2: allowed
    _ = gate.evaluate_candidate(model, model, ctx, primary_metric="accuracy", candidate_idx=2, total_candidates=3)
    assert ctx.holdout_evaluations_count == 2

    # Evaluation 3: must be rejected with ConflictError
    with pytest.raises(ConflictError) as exc_info:
        gate.evaluate_candidate(model, model, ctx, primary_metric="accuracy", candidate_idx=3, total_candidates=3)
    assert exc_info.value.status_code == 409
    assert "Exceeded maximum permitted holdout evaluations" in str(exc_info.value.message)


def test_holdout_below_min_samples_raises_holdout_too_small() -> None:
    # 150 samples (< 200)
    small_loader = create_dummy_dataset(150)
    ctx = HoldoutIsolatedContext(holdout_loader=small_loader)

    model = nn.Linear(10, 2)
    gate = VerificationGate(config=GateConfig(allow_small_holdout=False))

    with pytest.raises(HoldoutTooSmallError) as exc_info:
        gate.evaluate_candidate(model, model, ctx)
    assert exc_info.value.status_code == 422
    assert "Holdout size" in str(exc_info.value.message)


def test_gate_rejects_candidate_when_gain_below_min() -> None:
    loader = create_dummy_dataset(500)
    ctx = HoldoutIsolatedContext(holdout_loader=loader)

    # Identical models -> delta = 0.0 < min_gain (0.005)
    model = nn.Linear(10, 2)
    gate = VerificationGate(config=GateConfig(min_gain=GateMinGainConfig(accuracy=0.005)))

    decision = gate.evaluate_candidate(model, model, ctx, primary_metric="accuracy")
    assert decision.decision == "REJECT"
    assert not decision.passed_all
    assert any("GAIN_BELOW_MIN" in r for r in decision.reasons)


def test_gate_accepts_candidate_meeting_all_acceptance_criteria() -> None:
    # Construct synthetic data where candidate is strictly better than original
    torch.manual_seed(123)
    x = torch.randn(500, 4)
    y = torch.zeros(500, dtype=torch.long)

    loader = DataLoader(TensorDataset(x, y), batch_size=500)
    ctx = HoldoutIsolatedContext(holdout_loader=loader)

    # Original model outputs class 1 (0% accurate)
    orig_model = nn.Linear(4, 2)
    with torch.no_grad():
        orig_model.weight.zero_()
        orig_model.bias.copy_(torch.tensor([-10.0, 10.0]))

    # Candidate model outputs class 0 (100% accurate)
    cand_model = nn.Linear(4, 2)
    with torch.no_grad():
        cand_model.weight.zero_()
        cand_model.bias.copy_(torch.tensor([10.0, -10.0]))

    gate = VerificationGate(
        config=GateConfig(
            min_gain=GateMinGainConfig(accuracy=0.01),
            bootstrap_samples=300,
        )
    )

    decision = gate.evaluate_candidate(
        orig_model=orig_model,
        cand_model=cand_model,
        context=ctx,
        primary_metric="accuracy",
        candidate_idx=1,
        total_candidates=1,
    )

    assert decision.decision == "ACCEPT"
    assert decision.passed_all
    assert decision.delta_primary > 0.9
    assert decision.ci_low > 0.9
    assert any("GAIN_THRESHOLD_MET" in r for r in decision.reasons)
    assert any("CI_LOWER_BOUND_NON_NEGATIVE" in r for r in decision.reasons)
    assert any("RETENTION_MET" in r for r in decision.reasons)


def test_gate_multiple_comparison_bonferroni_adjustment() -> None:
    loader = create_dummy_dataset(500)
    ctx = HoldoutIsolatedContext(holdout_loader=loader)
    model = nn.Linear(10, 2)

    gate = VerificationGate(config=GateConfig(family_alpha=0.05, bootstrap_samples=200))

    # k = 1 candidate -> confidence = 1 - 0.05/1 = 0.95
    dec1 = gate.evaluate_candidate(model, model, ctx, total_candidates=1)
    assert pytest.approx(dec1.confidence_level, abs=1e-4) == 0.95

    # Reset ctx count
    ctx._holdout_eval_count = 0
    # k = 2 candidates -> confidence = 1 - 0.05/2 = 0.975
    dec2 = gate.evaluate_candidate(model, model, ctx, total_candidates=2)
    assert pytest.approx(dec2.confidence_level, abs=1e-4) == 0.975

