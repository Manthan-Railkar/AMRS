"""Unit tests for TemperatureScalingStrategy, CalibratedModel, and calibration serialization (ML-3)."""

import hashlib
from pathlib import Path

import numpy as np
import pytest
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from amrs.config import load_config
from amrs.metrics.classification import accuracy, ece, nll
from amrs.models.adapter import ModelAdapter
from amrs.recovery.base import RecoveryContext
from amrs.recovery.temperature import (
    CalibratedModel,
    CalibrationArtifact,
    TemperatureScalingStrategy,
    fit_temperature,
)


def _hash_model_weights(model: nn.Module) -> str:
    """Compute sha256 hash of a model's state_dict tensors for immutability verification."""
    hasher = hashlib.sha256()
    for name, param in sorted(model.state_dict().items()):
        hasher.update(name.encode("utf-8"))
        hasher.update(param.detach().cpu().numpy().tobytes())
    return hasher.hexdigest()


def _generate_synthetic_classification_data(
    n_samples: int = 500,
    n_classes: int = 5,
    seed: int = 42,
    overconfidence_scale: float = 1.0,
) -> tuple[torch.Tensor, torch.Tensor]:
    """Generate synthetic logits and ground-truth targets with controlled miscalibration."""
    torch.manual_seed(seed)
    # Generate random logits with varying scales
    base_logits = torch.randn(n_samples, n_classes) * overconfidence_scale
    # Sample true classes partially correlated with logits
    probs = torch.softmax(base_logits / max(0.1, overconfidence_scale), dim=-1)
    y = torch.multinomial(probs, num_samples=1).squeeze(-1)
    return base_logits, y


def _make_loader(x: torch.Tensor, y: torch.Tensor, batch_size: int = 64) -> DataLoader:
    return DataLoader(TensorDataset(x, y), batch_size=batch_size, shuffle=False)


class DummyClassifier(nn.Module):
    """Simple linear classifier mapping 10 inputs to 5 classes."""

    def __init__(self, in_features: int = 10, num_classes: int = 5) -> None:
        super().__init__()
        self.fc = nn.Linear(in_features, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.fc(x)


# ---------------------------------------------------------------------------
# Core Fitting and Invariant Tests
# ---------------------------------------------------------------------------


def test_synthetic_overconfidence_calibration():
    """An intentionally overconfident model must yield T > 1.0, lower ECE, lower NLL, and identical top-1."""
    # Generate strongly overconfident logits (scaled by 4.0)
    logits, y = _generate_synthetic_classification_data(
        n_samples=1000, n_classes=5, seed=123, overconfidence_scale=4.0
    )

    ece_before = ece(logits, y)
    nll_before = nll(logits, y)
    acc_before = accuracy(logits, y)
    top1_before = torch.argmax(logits, dim=-1)

    # Overconfidence check
    assert ece_before > 0.10, f"Expected high ECE before calibration, got {ece_before}"

    # Fit temperature
    fitted_t, converged, iters = fit_temperature(logits, y, max_iter=50)

    # 1. T is finite and positive
    assert np.isfinite(fitted_t)
    assert fitted_t > 1.0, f"Overconfident logits should produce T > 1.0, got {fitted_t}"

    # 2. Calibration improves: ECE and NLL decrease
    scaled_logits = logits / fitted_t
    ece_after = ece(scaled_logits, y)
    nll_after = nll(scaled_logits, y)
    acc_after = accuracy(scaled_logits, y)
    top1_after = torch.argmax(scaled_logits, dim=-1)

    assert ece_after < ece_before, f"ECE should decrease: {ece_before} -> {ece_after}"
    assert nll_after <= nll_before, f"NLL should not increase: {nll_before} -> {nll_after}"

    # 3. Non-tied top-1 predictions are 100% identical
    assert torch.equal(top1_before, top1_after), "Top-1 predictions must not change"
    assert acc_after == pytest.approx(acc_before, abs=1e-7)


def test_already_calibrated_model():
    """When logits are well-calibrated, fitted T should be close to 1.0 and NLL must not increase."""
    # Generate calibrated logits with temperature ~ 1.0
    logits, y = _generate_synthetic_classification_data(
        n_samples=1000, n_classes=5, seed=42, overconfidence_scale=1.0
    )

    nll_before = nll(logits, y)
    fitted_t, converged, iters = fit_temperature(logits, y, max_iter=50)

    assert np.isfinite(fitted_t)
    assert fitted_t == pytest.approx(1.0, abs=0.25), f"Expected T ~ 1.0, got {fitted_t}"

    scaled_logits = logits / fitted_t
    nll_after = nll(scaled_logits, y)
    # NLL should not increase beyond numerical float tolerance
    assert nll_after <= nll_before + 1e-4


def test_top1_predictions_strictly_preserved_on_random_logits():
    """Verify top-1 predictions are invariant under arbitrary positive temperatures."""
    logits = torch.randn(200, 10)
    top1_orig = torch.argmax(logits, dim=-1)

    for test_t in [0.05, 0.5, 1.0, 2.0, 5.0, 20.0]:
        top1_scaled = torch.argmax(logits / test_t, dim=-1)
        assert torch.equal(top1_orig, top1_scaled), f"Top-1 changed for T={test_t}"


# ---------------------------------------------------------------------------
# Degenerate and Edge Cases
# ---------------------------------------------------------------------------


def test_degenerate_logits_nan_inf_rejected():
    """Inputs with NaN or Inf must raise ValueError."""
    logits = torch.randn(50, 4)
    logits[10, 2] = float("nan")
    y = torch.randint(0, 4, (50,))

    with pytest.raises(ValueError, match="NaN or Inf"):
        fit_temperature(logits, y)

    logits_inf = torch.randn(50, 4)
    logits_inf[5, 1] = float("inf")
    with pytest.raises(ValueError, match="NaN or Inf"):
        fit_temperature(logits_inf, y)


def test_empty_logits_rejected():
    """Empty logits must raise ValueError."""
    empty_logits = torch.empty(0, 5)
    empty_y = torch.empty(0, dtype=torch.long)
    with pytest.raises(ValueError, match="empty"):
        fit_temperature(empty_logits, empty_y)


def test_flat_constant_logits_handled_safely():
    """Constant uniform logits should safely yield finite T > 0 without crashing."""
    logits = torch.zeros(100, 5)
    y = torch.randint(0, 5, (100,))

    fitted_t, converged, iters = fit_temperature(logits, y, max_iter=10)
    assert np.isfinite(fitted_t)
    assert fitted_t > 0.0


def test_convergence_with_low_max_iter():
    """Very low max_iter (e.g. 1) completes safely and reports positive finite T."""
    logits, y = _generate_synthetic_classification_data(n_samples=200, n_classes=4, seed=99)
    fitted_t, converged, iters = fit_temperature(logits, y, max_iter=1)

    assert np.isfinite(fitted_t)
    assert fitted_t > 0.0
    assert iters >= 1


# ---------------------------------------------------------------------------
# CalibratedModel Wrapper and Serialization Tests
# ---------------------------------------------------------------------------


def test_calibrated_model_wrapper_immutability():
    """CalibratedModel wrapper must not mutate base model weights."""
    torch.manual_seed(42)
    base_model = DummyClassifier(in_features=10, num_classes=5)
    hash_before = _hash_model_weights(base_model)

    calibrated = CalibratedModel(base_model, temperature=2.5)

    x = torch.randn(10, 10)
    with torch.no_grad():
        base_out = base_model(x)
        calibrated_out = calibrated(x)

    # Base model output divided by temperature reproduces calibrated output
    assert torch.allclose(calibrated_out, base_out / 2.5, atol=1e-6)

    # Base model weights are unchanged
    hash_after = _hash_model_weights(base_model)
    assert hash_before == hash_after, "Base model weights were mutated!"


def test_calibration_artifact_json_serialization_round_trip(tmp_path: Path):
    """CalibrationArtifact serializes to JSON and deserializes identically."""
    artifact = CalibrationArtifact(
        strategy="temperature_scaling",
        temperature=1.845123,
        raw_temperature=0.987654,
        ece_before=0.185,
        ece_after=0.032,
        nll_before=1.450,
        nll_after=1.120,
        accuracy_before=0.850,
        accuracy_after=0.850,
        top1_changed=False,
        converged=True,
        iterations=18,
        optimizer="LBFGS",
        metadata={"seed": 1234, "n_samples": 500},
    )

    json_path = tmp_path / "calibration.json"
    artifact.save(json_path)

    loaded = CalibrationArtifact.load(json_path)

    assert loaded.strategy == artifact.strategy
    assert loaded.temperature == pytest.approx(artifact.temperature, abs=1e-6)
    assert loaded.raw_temperature == pytest.approx(artifact.raw_temperature, abs=1e-6)
    assert loaded.ece_before == artifact.ece_before
    assert loaded.ece_after == artifact.ece_after
    assert loaded.nll_before == artifact.nll_before
    assert loaded.nll_after == artifact.nll_after
    assert loaded.top1_changed is False
    assert loaded.converged is True
    assert loaded.iterations == 18
    assert loaded.metadata == artifact.metadata


def test_calibrated_model_state_serialization_round_trip(tmp_path: Path):
    """CalibratedModel parameter save/load round-trips correctly."""
    base_model = DummyClassifier(in_features=10, num_classes=5)
    calibrated = CalibratedModel(base_model, temperature=3.14159)

    save_path = tmp_path / "temperature.pt"
    calibrated.save_calibration(save_path)

    new_calibrated = CalibratedModel(base_model, temperature=1.0)
    assert new_calibrated.temperature == pytest.approx(1.0, abs=1e-4)

    new_calibrated.load_calibration(save_path)
    assert new_calibrated.temperature == pytest.approx(3.14159, abs=1e-4)

    # Forward outputs must match
    x = torch.randn(8, 10)
    with torch.no_grad():
        out1 = calibrated(x)
        out2 = new_calibrated(x)
    assert torch.allclose(out1, out2, atol=1e-6)


# ---------------------------------------------------------------------------
# TemperatureScalingStrategy and Context Integration Tests
# ---------------------------------------------------------------------------


def test_strategy_full_apply_workflow():
    """Full execution of TemperatureScalingStrategy on model and validation loader."""
    torch.manual_seed(42)
    # Build model and dataset with 10 features, 5 classes
    model = DummyClassifier(in_features=10, num_classes=5)
    # Manually amplify model weights to create an overconfident classifier
    with torch.no_grad():
        model.fc.weight.mul_(3.0)

    x = torch.randn(200, 10)
    # Targets derived from unamplified model to create confidence mismatch
    y = torch.randint(0, 5, (200,))
    val_loader = _make_loader(x, y)

    strategy = TemperatureScalingStrategy()
    assert strategy.name == "temperature_scaling"

    context = RecoveryContext(
        model=model,
        val_loader=val_loader,
        config=load_config(),
        seed=1234,
    )

    # 1. Applicability
    adapter = ModelAdapter(model)
    app = strategy.is_applicable(adapter, context)
    assert app.can_apply is True

    # 2. Cost estimation
    cost = strategy.estimate_cost(context, adapter)
    assert cost.estimated_units == 200.0
    assert cost.is_estimate is True

    # 3. Model weights hash before
    hash_before = _hash_model_weights(model)

    # 4. Apply
    calibrated_model, result = strategy.apply(model, context)

    # 5. Output model is a CalibratedModel wrapper
    assert isinstance(calibrated_model, CalibratedModel)
    assert calibrated_model.temperature > 1.0

    # 6. Result metadata
    assert result.strategy_name == "temperature_scaling"
    assert result.success is True
    assert result.compute_units == 200.0
    assert result.grad_steps > 0
    assert result.params["temperature"] == pytest.approx(calibrated_model.temperature, abs=1e-4)

    # 7. Immutability: original model weights were never modified
    hash_after = _hash_model_weights(model)
    assert hash_before == hash_after

    # 8. Artifact metadata contains before/after metrics
    meta = result.artifact_metadata
    assert meta["ece_after"] <= meta["ece_before"]
    assert meta["nll_after"] <= meta["nll_before"] + 1e-4
    assert meta["top1_changed"] is False


def test_strategy_holdout_isolation_enforcement():
    """Ensure that passing holdout data is strictly forbidden."""
    model = DummyClassifier(in_features=10, num_classes=5)
    loader = _make_loader(torch.randn(50, 10), torch.randint(0, 5, (50,)))

    # RecoveryContext rejects holdout_loader on init
    with pytest.raises(ValueError, match="Holdout data must never enter RecoveryContext"):
        RecoveryContext(
            model=model,
            val_loader=loader,
            holdout_loader=loader,
        )
