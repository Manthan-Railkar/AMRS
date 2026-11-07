"""Unit tests for WeightInterpolationStrategy, boundary alphas, arithmetic, buffer policy, and mismatch checks (ML-8)."""

from collections import OrderedDict

import pytest
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from amrs.config import load_config
from amrs.models.adapter import ModelAdapter
from amrs.recovery.base import RecoveryContext
from amrs.recovery.interpolation import (
    WeightInterpolationStrategy,
    evaluate_interpolation_sweep,
    interpolate_state_dicts,
    interpolate_weights,
    validate_interpolation_compatibility,
)


class ModelWithBuffers(nn.Module):
    """Model containing floating parameters, floating buffers, and integer buffers."""

    def __init__(self) -> None:
        super().__init__()
        self.fc = nn.Linear(4, 2)
        self.bn = nn.BatchNorm1d(2)
        self.register_buffer("custom_step", torch.tensor(10, dtype=torch.long))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out = self.fc(x)
        return self.bn(out)


class IncompatibleShapeModel(nn.Module):
    """Model with mismatching linear layer shape."""

    def __init__(self) -> None:
        super().__init__()
        self.fc = nn.Linear(4, 5)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.fc(x)


class IncompatibleKeyModel(nn.Module):
    """Model with different layer naming."""

    def __init__(self) -> None:
        super().__init__()
        self.classifier = nn.Linear(4, 2)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.classifier(x)


def _generate_synthetic_data(
    n_samples: int = 100,
    in_features: int = 4,
    num_classes: int = 2,
    seed: int = 42,
) -> tuple[DataLoader, DataLoader]:
    """Generate simple synthetic dataset."""
    torch.manual_seed(seed)
    x = torch.randn(n_samples, in_features)
    y = (x.sum(dim=1) > 0.0).long()

    train_loader = DataLoader(TensorDataset(x[:60], y[:60]), batch_size=20, shuffle=False)
    val_loader = DataLoader(TensorDataset(x[60:], y[60:]), batch_size=20, shuffle=False)
    return train_loader, val_loader


# ---------------------------------------------------------------------------
# 1. Boundary Alpha and Exact Arithmetic Tests
# ---------------------------------------------------------------------------


def test_boundary_alpha_zero_reproduces_original_exact():
    """Alpha 0.0 must exactly reproduce original floating weights and buffers."""
    m_orig = ModelWithBuffers()
    m_cand = ModelWithBuffers()

    # Modify candidate parameters and buffers
    with torch.no_grad():
        m_cand.fc.weight.add_(1.5)
        m_cand.fc.bias.add_(-0.8)
        m_cand.bn.running_mean.fill_(3.0)
        m_cand.bn.running_var.fill_(5.0)
        m_cand.custom_step.fill_(99)

    m_interp = interpolate_weights(m_orig, m_cand, alpha=0.0)

    # Floating parameters & buffers must be bitwise identical to original
    for (k_orig, v_orig), (k_interp, v_interp) in zip(
        m_orig.state_dict().items(), m_interp.state_dict().items()
    ):
        assert k_orig == k_interp
        assert torch.equal(v_orig, v_interp), f"Mismatch at alpha=0.0 for key {k_orig}"


def test_boundary_alpha_one_reproduces_candidate_exact():
    """Alpha 1.0 must exactly reproduce candidate floating weights and buffers."""
    m_orig = ModelWithBuffers()
    m_cand = ModelWithBuffers()

    with torch.no_grad():
        m_cand.fc.weight.add_(2.5)
        m_cand.fc.bias.add_(-1.2)
        m_cand.bn.running_mean.fill_(7.0)
        m_cand.bn.running_var.fill_(9.0)
        m_cand.custom_step.fill_(123)

    m_interp = interpolate_weights(m_orig, m_cand, alpha=1.0)

    # Floating parameters & buffers must be bitwise identical to candidate
    for (k_cand, v_cand), (k_interp, v_interp) in zip(
        m_cand.state_dict().items(), m_interp.state_dict().items()
    ):
        assert k_cand == k_interp
        assert torch.equal(v_cand, v_interp), f"Mismatch at alpha=1.0 for key {k_cand}"


def test_intermediate_alpha_matches_exact_hand_calculation():
    """Intermediate alpha arithmetic must match manual hand calculation.

    Hand calculation:
        t_orig = [1.0, 4.0, -2.0]
        t_cand = [3.0, -2.0, 6.0]

        alpha = 0.25:
            (1 - 0.25) * [1.0, 4.0, -2.0] + 0.25 * [3.0, -2.0, 6.0]
            = [0.75, 3.0, -1.5] + [0.75, -0.5, 1.5]
            = [1.50, 2.50, 0.0]

        alpha = 0.50:
            0.5 * [1.0, 4.0, -2.0] + 0.5 * [3.0, -2.0, 6.0]
            = [2.0, 1.0, 2.0]

        alpha = 0.75:
            0.25 * [1.0, 4.0, -2.0] + 0.75 * [3.0, -2.0, 6.0]
            = [0.25, 1.0, -0.5] + [2.25, -1.5, 4.5]
            = [2.50, -0.50, 4.0]
    """
    orig_sd = OrderedDict({"w": torch.tensor([1.0, 4.0, -2.0])})
    cand_sd = OrderedDict({"w": torch.tensor([3.0, -2.0, 6.0])})

    # Test alpha = 0.25
    interp_25 = interpolate_state_dicts(orig_sd, cand_sd, alpha=0.25)
    expected_25 = torch.tensor([1.50, 2.50, 0.0])
    assert torch.allclose(interp_25["w"], expected_25, atol=1e-7)

    # Test alpha = 0.50
    interp_50 = interpolate_state_dicts(orig_sd, cand_sd, alpha=0.50)
    expected_50 = torch.tensor([2.0, 1.0, 2.0])
    assert torch.allclose(interp_50["w"], expected_50, atol=1e-7)

    # Test alpha = 0.75
    interp_75 = interpolate_state_dicts(orig_sd, cand_sd, alpha=0.75)
    expected_75 = torch.tensor([2.50, -0.50, 4.0])
    assert torch.allclose(interp_75["w"], expected_75, atol=1e-7)


def test_alpha_out_of_bounds_raises_error():
    """Alpha outside [0.0, 1.0] must raise ValueError."""
    orig_sd = OrderedDict({"w": torch.tensor([1.0])})
    cand_sd = OrderedDict({"w": torch.tensor([2.0])})

    with pytest.raises(ValueError, match=r"\[0\.0, 1\.0\]"):
        interpolate_state_dicts(orig_sd, cand_sd, alpha=-0.1)

    with pytest.raises(ValueError, match=r"\[0\.0, 1\.0\]"):
        interpolate_state_dicts(orig_sd, cand_sd, alpha=1.01)


# ---------------------------------------------------------------------------
# 2. Buffer Policy Tests (Floating & Non-Floating)
# ---------------------------------------------------------------------------


def test_buffer_policy_non_floating_buffers():
    """Non-floating buffers are copied from candidate when alpha >= 0.5, else original."""
    m_orig = ModelWithBuffers()
    m_cand = ModelWithBuffers()

    with torch.no_grad():
        m_orig.custom_step.fill_(10)
        m_cand.custom_step.fill_(80)
        m_orig.bn.num_batches_tracked.fill_(5)
        m_cand.bn.num_batches_tracked.fill_(50)

    # Alpha 0.25 (< 0.5) -> takes from original
    interp_low = interpolate_weights(m_orig, m_cand, alpha=0.25)
    assert interp_low.custom_step.item() == 10
    assert interp_low.bn.num_batches_tracked.item() == 5

    # Alpha 0.50 (>= 0.5) -> takes from candidate
    interp_mid = interpolate_weights(m_orig, m_cand, alpha=0.50)
    assert interp_mid.custom_step.item() == 80
    assert interp_mid.bn.num_batches_tracked.item() == 50

    # Alpha 0.75 (>= 0.5) -> takes from candidate
    interp_high = interpolate_weights(m_orig, m_cand, alpha=0.75)
    assert interp_high.custom_step.item() == 80
    assert interp_high.bn.num_batches_tracked.item() == 50


def test_batchnorm_running_stats_floating_interpolation():
    """BatchNorm running_mean and running_var are floating buffers and must linearly interpolate."""
    m_orig = ModelWithBuffers()
    m_cand = ModelWithBuffers()

    with torch.no_grad():
        m_orig.bn.running_mean.copy_(torch.tensor([0.0, 10.0]))
        m_cand.bn.running_mean.copy_(torch.tensor([4.0, 2.0]))
        m_orig.bn.running_var.copy_(torch.tensor([1.0, 3.0]))
        m_cand.bn.running_var.copy_(torch.tensor([5.0, 7.0]))

    interp = interpolate_weights(m_orig, m_cand, alpha=0.5)

    expected_mean = torch.tensor([2.0, 6.0])
    expected_var = torch.tensor([3.0, 5.0])

    assert torch.allclose(interp.bn.running_mean, expected_mean)
    assert torch.allclose(interp.bn.running_var, expected_var)


# ---------------------------------------------------------------------------
# 3. Model Compatibility & Mismatch Tests
# ---------------------------------------------------------------------------


def test_compatibility_key_mismatch_rejected():
    """Models with mismatched state_dict keys must be rejected with KEY_MISMATCH."""
    m1 = ModelWithBuffers()
    m2 = IncompatibleKeyModel()

    compat, reason = validate_interpolation_compatibility(m1, m2)
    assert compat is False
    assert "KEY_MISMATCH" in reason


def test_compatibility_shape_mismatch_rejected():
    """Models with mismatched tensor shapes must be rejected with SHAPE_MISMATCH."""
    m1 = nn.Linear(4, 2)
    m2 = nn.Linear(4, 5)

    compat, reason = validate_interpolation_compatibility(m1, m2)
    assert compat is False
    assert "SHAPE_MISMATCH" in reason


def test_compatibility_non_finite_tensors_rejected():
    """Models with NaN or Inf tensors must be rejected with NON_FINITE."""
    m1 = ModelWithBuffers()
    m2 = ModelWithBuffers()

    with torch.no_grad():
        m2.fc.weight[0, 0] = float("nan")

    compat, reason = validate_interpolation_compatibility(m1, m2)
    assert compat is False
    assert "NON_FINITE" in reason


# ---------------------------------------------------------------------------
# 4. Validation Sweep & Ranking Tests
# ---------------------------------------------------------------------------


def test_validation_sweep_selects_optimal_alpha_deterministically():
    """Sweep across alphas on validation data must select the highest-scoring candidate deterministically."""
    torch.manual_seed(123)
    train_loader, val_loader = _generate_synthetic_data(n_samples=120, in_features=4, num_classes=2)

    m_orig = ModelWithBuffers()
    m_cand = ModelWithBuffers()

    # Intentionally train/shift candidate so that intermediate blend achieves best score
    with torch.no_grad():
        m_cand.fc.weight.add_(torch.randn_like(m_cand.fc.weight) * 0.5)

    alphas = [0.0, 0.25, 0.5, 0.75, 1.0]

    best_alpha_1, best_model_1, records_1, units_1 = evaluate_interpolation_sweep(
        original_model=m_orig,
        candidate_model=m_cand,
        val_loader=val_loader,
        alphas=alphas,
        primary_metric="accuracy",
    )

    # Repeated sweep with same inputs must produce identical selection (deterministic)
    best_alpha_2, best_model_2, records_2, units_2 = evaluate_interpolation_sweep(
        original_model=m_orig,
        candidate_model=m_cand,
        val_loader=val_loader,
        alphas=alphas,
        primary_metric="accuracy",
    )

    assert best_alpha_1 == best_alpha_2
    assert units_1 == units_2
    assert len(records_1) == len(alphas)

    # Check that best_alpha is indeed the one with the maximum accuracy in the records
    max_acc = max(r["val_acc"] for r in records_1)
    best_record = next(r for r in records_1 if r["alpha"] == best_alpha_1)
    assert best_record["val_acc"] == max_acc

    # Verify model weights match the best alpha
    expected_best = interpolate_weights(m_orig, m_cand, alpha=best_alpha_1)
    for (k1, v1), (k2, v2) in zip(
        best_model_1.state_dict().items(), expected_best.state_dict().items()
    ):
        assert torch.equal(v1, v2)


# ---------------------------------------------------------------------------
# 5. Full WeightInterpolationStrategy Tests
# ---------------------------------------------------------------------------


def test_strategy_apply_with_precomputed_candidate():
    """Strategy application with a provided candidate executes interpolation search and returns result."""
    train_loader, val_loader = _generate_synthetic_data(100, 4, 2)
    m_orig = ModelWithBuffers()
    m_cand = ModelWithBuffers()

    with torch.no_grad():
        m_cand.fc.weight.add_(0.5)

    strategy = WeightInterpolationStrategy()
    context = RecoveryContext(
        model=m_orig,
        val_loader=val_loader,
        config=load_config(),
        seed=1234,
        candidate_model=m_cand,
    )

    app = strategy.is_applicable(ModelAdapter(m_orig), context)
    assert app.can_apply is True

    candidate, result = strategy.apply(m_orig, context)
    assert result.success is True
    assert result.strategy_name == "weight_interpolation"
    assert "selected_alpha" in result.artifact_metadata
    assert "sweep_records" in result.artifact_metadata
    assert result.compute_units > 0.0


def test_strategy_rejects_holdout():
    """Split discipline: passing holdout into WeightInterpolationStrategy must raise ValueError."""
    model = ModelWithBuffers()
    _, loader = _generate_synthetic_data(40, 4, 2)

    with pytest.raises(ValueError, match="[Hh]oldout"):
        RecoveryContext(
            model=model,
            val_loader=loader,
            holdout_loader=loader,
        )


def test_source_models_are_never_mutated():
    """Original model and candidate model state must remain untouched after interpolation."""
    m_orig = ModelWithBuffers()
    m_cand = ModelWithBuffers()

    orig_hashes = [p.detach().cpu().numpy().tobytes() for p in m_orig.parameters()]
    cand_hashes = [p.detach().cpu().numpy().tobytes() for p in m_cand.parameters()]

    _ = interpolate_weights(m_orig, m_cand, alpha=0.5)

    post_orig_hashes = [p.detach().cpu().numpy().tobytes() for p in m_orig.parameters()]
    post_cand_hashes = [p.detach().cpu().numpy().tobytes() for p in m_cand.parameters()]

    assert orig_hashes == post_orig_hashes
    assert cand_hashes == post_cand_hashes
