"""Unit tests for BnRecalibrationStrategy, parameter immutability, mode restoration, and shift adaptation (ML-4)."""

import copy
import hashlib
from pathlib import Path
import pytest
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from amrs.config import load_config
from amrs.models.adapter import ModelAdapter
from amrs.models.registry import build
from amrs.recovery.base import RecoveryContext
from amrs.recovery.bn_recal import (
    BnRecalibrationStrategy,
    recalibrate_bn_stats,
)


def _hash_model_weights(model: nn.Module) -> str:
    """Compute sha256 hash of all learned parameters (weights and biases) to verify strict immutability."""
    hasher = hashlib.sha256()
    for name, param in sorted(model.named_parameters()):
        hasher.update(name.encode("utf-8"))
        hasher.update(param.detach().cpu().numpy().tobytes())
    return hasher.hexdigest()


class ModelWithDropoutAndBN(nn.Module):
    """Network with Conv2d, BatchNorm2d, Dropout2d, and Linear head for mode testing."""
    def __init__(self) -> None:
        super().__init__()
        self.conv = nn.Conv2d(1, 8, kernel_size=3, padding=1)
        self.bn = nn.BatchNorm2d(8)
        self.dropout = nn.Dropout2d(p=0.5)
        self.fc = nn.Linear(8 * 16 * 16, 10)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.conv(x)
        x = self.bn(x)
        x = torch.relu(x)
        x = self.dropout(x)
        x = x.flatten(1)
        return self.fc(x)


class ModelWithoutBN(nn.Module):
    """Network without any BatchNorm layers."""
    def __init__(self) -> None:
        super().__init__()
        self.conv = nn.Conv2d(1, 8, kernel_size=3, padding=1)
        self.fc = nn.Linear(8 * 16 * 16, 10)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = torch.relu(self.conv(x))
        x = x.flatten(1)
        return self.fc(x)


def _make_loader(
    n_samples: int = 128,
    mean: float = 0.0,
    std: float = 1.0,
    batch_size: int = 32,
    seed: int = 42,
) -> DataLoader:
    torch.manual_seed(seed)
    x = torch.randn(n_samples, 1, 16, 16) * std + mean
    y = torch.randint(0, 10, (n_samples,))
    return DataLoader(TensorDataset(x, y), batch_size=batch_size, shuffle=False)


# ---------------------------------------------------------------------------
# Shift Adaptation and Parameter Immutability Tests
# ---------------------------------------------------------------------------

def test_bn_recalibration_updates_running_stats_on_shifted_inputs():
    """Recalibration on distribution-shifted inputs must update running means/variances while preserving all parameters."""
    model = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))
    adapter = ModelAdapter(model)
    bn_layers = adapter.bn_layers()
    assert len(bn_layers) > 0, "small_cnn should have BatchNorm layers"

    # 1. Warm-up initial stats with standard normal inputs
    norm_loader = _make_loader(n_samples=100, mean=0.0, std=1.0)
    warm_model, _ = recalibrate_bn_stats(model, norm_loader, max_batches=10)
    warm_adapter = ModelAdapter(warm_model)

    initial_means = [bn.running_mean.detach().clone() for bn in warm_adapter.bn_layers()]
    initial_vars = [bn.running_var.detach().clone() for bn in warm_adapter.bn_layers()]
    weights_hash_before = _hash_model_weights(warm_model)

    # 2. Recalibrate on strongly shifted inputs (mean=4.0, std=2.5)
    shifted_loader = _make_loader(n_samples=200, mean=4.0, std=2.5)
    recal_model, stats = recalibrate_bn_stats(
        warm_model, shifted_loader, max_batches=20, momentum=None
    )
    recal_adapter = ModelAdapter(recal_model)

    # 3. Running stats must change significantly
    recal_means = [bn.running_mean.detach().clone() for bn in recal_adapter.bn_layers()]
    recal_vars = [bn.running_var.detach().clone() for bn in recal_adapter.bn_layers()]

    mean_diffs = [torch.mean(torch.abs(m_new - m_old)).item() for m_new, m_old in zip(recal_means, initial_means)]
    var_diffs = [torch.mean(torch.abs(v_new - v_old)).item() for v_new, v_old in zip(recal_vars, initial_vars)]

    assert max(mean_diffs) > 0.1, f"Running means should shift significantly, max diff: {max(mean_diffs)}"
    assert max(var_diffs) > 0.1, f"Running variances should shift significantly, max diff: {max(var_diffs)}"
    assert stats["mean_divergence"] > 0.05
    assert stats["var_divergence"] > 0.05

    # 4. Learned parameters (both BN affine weights/biases and Conv/Linear weights/biases) must be strictly identical
    weights_hash_after = _hash_model_weights(recal_model)
    assert weights_hash_before == weights_hash_after, "Learned weights changed during BatchNorm recalibration!"

    # Explicit tensor-level parameter comparison
    for (name_orig, p_orig), (name_recal, p_recal) in zip(
        warm_model.named_parameters(), recal_model.named_parameters()
    ):
        assert name_orig == name_recal
        assert torch.equal(p_orig, p_recal), f"Parameter '{name_orig}' differed after recalibration!"


def test_parameter_immutability_original_model_unchanged():
    """Verify that recalibration operates on a copy and never mutates the original model in place."""
    original_model = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))
    adapter_orig = ModelAdapter(original_model)
    orig_means = [bn.running_mean.detach().clone() for bn in adapter_orig.bn_layers()]
    orig_hash = _hash_model_weights(original_model)

    shifted_loader = _make_loader(n_samples=128, mean=3.0, std=2.0)
    candidate_model, _ = recalibrate_bn_stats(original_model, shifted_loader)

    # Original model's running stats and weights must be 100% untouched
    for bn, init_m in zip(adapter_orig.bn_layers(), orig_means):
        assert torch.equal(bn.running_mean, init_m)
    assert _hash_model_weights(original_model) == orig_hash


# ---------------------------------------------------------------------------
# Missing BN, Empty Data, and Prerequisite Handling
# ---------------------------------------------------------------------------

def test_no_bn_layers_returns_explicit_skip_reason():
    """Model without BatchNorm layers must return NO_BN_LAYERS and refuse execution."""
    model = ModelWithoutBN()
    adapter = ModelAdapter(model)
    assert not adapter.supports_bn()

    loader = _make_loader(n_samples=64)
    strategy = BnRecalibrationStrategy()
    context = RecoveryContext(model=model, target_loader=loader)

    # 1. Applicability check
    app = strategy.is_applicable(adapter, context)
    assert app.can_apply is False
    assert app.reason == "NO_BN_LAYERS"

    # 2. Functional helper raises ValueError
    with pytest.raises(ValueError, match="NO_BN_LAYERS"):
        recalibrate_bn_stats(model, loader)

    # 3. Strategy apply returns failure safely without crashing
    _, result = strategy.apply(model, context)
    assert result.success is False
    assert "NO_BN_LAYERS" in str(result.error_message)


def test_empty_target_data_fails_safely():
    """Empty data loader must fail safely and report EMPTY_DATA."""
    model = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))
    empty_loader = DataLoader(TensorDataset(torch.empty(0, 1, 16, 16), torch.empty(0, dtype=torch.long)))

    with pytest.raises(ValueError, match="EMPTY_DATA"):
        recalibrate_bn_stats(model, empty_loader)

    strategy = BnRecalibrationStrategy()
    context = RecoveryContext(model=model, target_loader=empty_loader)
    _, result = strategy.apply(model, context)
    assert result.success is False
    assert "EMPTY_DATA" in str(result.error_message)


def test_missing_both_target_and_val_data():
    """Missing both target and validation loaders must be rejected with MISSING_TARGET."""
    model = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))
    adapter = ModelAdapter(model)

    strategy = BnRecalibrationStrategy()
    context = RecoveryContext(model=model, target_loader=None, val_loader=None)

    app = strategy.is_applicable(adapter, context)
    assert app.can_apply is False
    assert app.reason == "MISSING_TARGET"

    _, result = strategy.apply(model, context)
    assert result.success is False
    assert "MISSING_TARGET" in str(result.error_message)


def test_fallback_to_val_loader_when_target_absent():
    """When target_loader is None, recalibration falls back to val_loader and logs data_source='val'."""
    model = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))
    val_loader = _make_loader(n_samples=64, mean=1.5, std=1.2)

    strategy = BnRecalibrationStrategy()
    context = RecoveryContext(model=model, target_loader=None, val_loader=val_loader)

    app = strategy.is_applicable(ModelAdapter(model), context)
    assert app.can_apply is True

    candidate, result = strategy.apply(model, context)
    assert result.success is True
    assert result.params["data_source"] == "val"
    assert result.artifact_metadata["data_source"] == "val"
    assert result.artifact_metadata["samples_processed"] == 64


# ---------------------------------------------------------------------------
# Batch Limit and Accounting Tests
# ---------------------------------------------------------------------------

def test_batch_limit_is_strictly_honored():
    """Recalibration must stop after exactly max_batches batches."""
    model = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))
    # 10 batches of 16 = 160 samples
    loader = _make_loader(n_samples=160, batch_size=16)

    # Set max_batches to 3
    candidate, stats = recalibrate_bn_stats(model, loader, max_batches=3)

    assert stats["batches_processed"] == 3
    assert stats["samples_processed"] == 3 * 16  # 48 samples
    assert stats["compute_units"] == 48.0


# ---------------------------------------------------------------------------
# Module Mode Restoration and Dropout Isolation Tests
# ---------------------------------------------------------------------------

def test_dropout_mode_restoration_and_no_gradient_updates():
    """Dropout must NOT be active during BN recalibration, modes must be restored, and no gradients computed."""
    model = ModelWithDropoutAndBN()
    model.eval()

    # Verify dropout starts in eval mode (p=0.0 active behavior)
    assert model.dropout.training is False
    assert model.bn.training is False

    # Check forward pass consistency (in eval mode, identical inputs yield identical outputs)
    test_x = torch.randn(4, 1, 16, 16)
    with torch.no_grad():
        out1 = model(test_x)
        out2 = model(test_x)
    assert torch.equal(out1, out2), "Eval mode output should be deterministic without dropout"

    loader = _make_loader(n_samples=64, batch_size=16)
    recal_model, stats = recalibrate_bn_stats(model, loader, max_batches=2)

    # 1. Output candidate model must be in eval mode
    assert recal_model.training is False
    assert recal_model.dropout.training is False
    assert recal_model.bn.training is False

    # 2. Output on candidate model is completely deterministic (dropout is inactive)
    with torch.no_grad():
        c_out1 = recal_model(test_x)
        c_out2 = recal_model(test_x)
    assert torch.equal(c_out1, c_out2)

    # 3. Verify zero gradients exist anywhere on the candidate
    for name, param in recal_model.named_parameters():
        assert param.grad is None, f"Gradient unexpectedly computed on '{name}'!"


# ---------------------------------------------------------------------------
# Split Discipline and Holdout Isolation Tests
# ---------------------------------------------------------------------------

def test_bn_recalibration_rejects_holdout():
    """Ensure holdout loader cannot be passed into RecoveryContext."""
    model = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))
    loader = _make_loader(n_samples=32)

    with pytest.raises(ValueError, match="Holdout data must never enter RecoveryContext"):
        RecoveryContext(model=model, target_loader=loader, holdout_loader=loader)

