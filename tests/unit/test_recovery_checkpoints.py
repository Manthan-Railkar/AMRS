"""Unit tests for CheckpointReversionStrategy, CheckpointAveragingStrategy, tensor arithmetic, buffer handling, and immutability (ML-5)."""

import copy
import hashlib
from collections import OrderedDict
from pathlib import Path

import pytest
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from amrs.config import load_config
from amrs.models.adapter import ModelAdapter
from amrs.models.registry import build
from amrs.recovery.base import RecoveryContext
from amrs.recovery.checkpoints import (
    CheckpointAveragingStrategy,
    CheckpointReversionStrategy,
    average_state_dicts,
    validate_checkpoint,
)


def _compute_file_sha256(path: Path | str) -> str:
    """Compute sha256 hash of a file on disk."""
    hasher = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def _hash_model_weights(model: nn.Module) -> str:
    """Compute sha256 hash of all model parameters."""
    hasher = hashlib.sha256()
    for name, param in sorted(model.named_parameters()):
        hasher.update(name.encode("utf-8"))
        hasher.update(param.detach().cpu().numpy().tobytes())
    return hasher.hexdigest()


class SimpleNet(nn.Module):
    """Simple linear network with an integer buffer for buffer testing."""

    def __init__(self) -> None:
        super().__init__()
        self.fc = nn.Linear(4, 2, bias=True)
        self.register_buffer("num_batches_tracked", torch.tensor(0, dtype=torch.long))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.fc(x)


# ---------------------------------------------------------------------------
# Tensor Averaging and Buffer Rule Tests
# ---------------------------------------------------------------------------


def test_tensor_averaging_arithmetic():
    """average_state_dicts must compute the exact arithmetic mean of floating-point tensors."""
    sd1: OrderedDict[str, torch.Tensor] = OrderedDict(
        [
            ("weight", torch.tensor([[1.0, 2.0], [3.0, 4.0]], dtype=torch.float32)),
            ("bias", torch.tensor([1.0, 2.0], dtype=torch.float32)),
        ]
    )
    sd2: OrderedDict[str, torch.Tensor] = OrderedDict(
        [
            ("weight", torch.tensor([[2.0, 4.0], [6.0, 8.0]], dtype=torch.float32)),
            ("bias", torch.tensor([2.0, 4.0], dtype=torch.float32)),
        ]
    )
    sd3: OrderedDict[str, torch.Tensor] = OrderedDict(
        [
            ("weight", torch.tensor([[3.0, 6.0], [9.0, 12.0]], dtype=torch.float32)),
            ("bias", torch.tensor([3.0, 6.0], dtype=torch.float32)),
        ]
    )

    averaged = average_state_dicts([sd1, sd2, sd3])

    expected_weight = torch.tensor([[2.0, 4.0], [6.0, 8.0]], dtype=torch.float32)
    expected_bias = torch.tensor([2.0, 4.0], dtype=torch.float32)

    assert torch.allclose(averaged["weight"], expected_weight, atol=1e-7)
    assert torch.allclose(averaged["bias"], expected_bias, atol=1e-7)


def test_integer_and_non_floating_buffer_handling():
    """Non-floating buffers must be deterministically copied from the latest (last) checkpoint."""
    sd1: OrderedDict[str, torch.Tensor] = OrderedDict(
        [
            ("weight", torch.tensor([1.0, 2.0], dtype=torch.float32)),
            ("num_batches_tracked", torch.tensor(10, dtype=torch.long)),
        ]
    )
    sd2: OrderedDict[str, torch.Tensor] = OrderedDict(
        [
            ("weight", torch.tensor([3.0, 4.0], dtype=torch.float32)),
            ("num_batches_tracked", torch.tensor(20, dtype=torch.long)),
        ]
    )
    sd3: OrderedDict[str, torch.Tensor] = OrderedDict(
        [
            ("weight", torch.tensor([5.0, 6.0], dtype=torch.float32)),
            ("num_batches_tracked", torch.tensor(30, dtype=torch.long)),
        ]
    )

    averaged = average_state_dicts([sd1, sd2, sd3])

    # Weight is averaged: (1+3+5)/3 = 3.0, (2+4+6)/3 = 4.0
    assert torch.allclose(averaged["weight"], torch.tensor([3.0, 4.0], dtype=torch.float32))
    # Non-floating buffer is copied from the latest state dict (sd3 -> 30)
    assert averaged["num_batches_tracked"].dtype == torch.long
    assert averaged["num_batches_tracked"].item() == 30


# ---------------------------------------------------------------------------
# Checkpoint Compatibility and Validation Tests
# ---------------------------------------------------------------------------


def test_checkpoint_validation_catches_nan_inf(tmp_path: Path):
    """Checkpoints containing NaN or Inf must be flagged as NON_FINITE."""
    model = SimpleNet()
    bad_state = copy.deepcopy(model.state_dict())
    bad_state["fc.weight"][0, 0] = float("nan")

    ckpt_path = tmp_path / "ckpt_nan.pt"
    torch.save(bad_state, ckpt_path)

    is_valid, reason, _ = validate_checkpoint(ckpt_path, model)
    assert is_valid is False
    assert reason == "NON_FINITE"


def test_checkpoint_validation_catches_architecture_mismatch(tmp_path: Path):
    """Checkpoints with missing keys or mismatched shapes must be flagged as ARCH_MISMATCH."""
    model = SimpleNet()

    # Mismatched shape
    mismatched_state = copy.deepcopy(model.state_dict())
    mismatched_state["fc.weight"] = torch.randn(5, 5)  # Expected (2, 4)

    ckpt_path = tmp_path / "ckpt_shape_mismatch.pt"
    torch.save(mismatched_state, ckpt_path)

    is_valid, reason, _ = validate_checkpoint(ckpt_path, model)
    assert is_valid is False
    assert reason == "ARCH_MISMATCH"

    # Missing keys
    missing_key_state = copy.deepcopy(model.state_dict())
    del missing_key_state["fc.bias"]
    ckpt_missing = tmp_path / "ckpt_missing_key.pt"
    torch.save(missing_key_state, ckpt_missing)

    is_valid_m, reason_m, _ = validate_checkpoint(ckpt_missing, model)
    assert is_valid_m is False
    assert reason_m == "ARCH_MISMATCH"


# ---------------------------------------------------------------------------
# Reversion Strategy Tests (Known-Best Fixture)
# ---------------------------------------------------------------------------


def test_checkpoint_reversion_selects_known_best_fixture(tmp_path: Path):
    """CheckpointReversionStrategy must evaluate on validation data and pick the known best checkpoint."""
    # Build model: 16x16 input, 10 classes
    model = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))

    # Synthetic validation dataset: 100 samples
    torch.manual_seed(1234)
    x_val = torch.randn(100, 1, 16, 16)
    y_val = torch.randint(0, 10, (100,))
    val_loader = DataLoader(TensorDataset(x_val, y_val), batch_size=32, shuffle=False)

    # 1. Checkpoint 1 (Epoch 1): poor random weights
    model_ckpt1 = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))
    ckpt1_path = tmp_path / "ckpt_epoch001.pt"
    torch.save(model_ckpt1.state_dict(), ckpt1_path)

    # 2. Checkpoint 2 (Epoch 2): KNOWN BEST - trained to high accuracy on validation data
    model_ckpt2 = copy.deepcopy(model)
    model_ckpt2.train()
    opt = torch.optim.Adam(model_ckpt2.parameters(), lr=0.01)
    for _ in range(60):
        opt.zero_grad()
        loss = torch.nn.functional.cross_entropy(model_ckpt2(x_val), y_val)
        loss.backward()
        opt.step()
    model_ckpt2.eval()

    ckpt2_path = tmp_path / "ckpt_epoch002.pt"
    torch.save(model_ckpt2.state_dict(), ckpt2_path)

    # 3. Checkpoint 3 (Epoch 3): degraded weights
    model_ckpt3 = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))
    with torch.no_grad():
        # Scramble weights
        for p in model_ckpt3.parameters():
            p.mul_(0.01)
    ckpt3_path = tmp_path / "ckpt_epoch003.pt"
    torch.save(model_ckpt3.state_dict(), ckpt3_path)

    # Current model is degraded (Epoch 3)
    current_model = copy.deepcopy(model_ckpt3)

    strategy = CheckpointReversionStrategy()
    context = RecoveryContext(
        model=current_model,
        val_loader=val_loader,
        checkpoints=[ckpt1_path, ckpt2_path, ckpt3_path],
        config=load_config(),
    )

    candidate, result = strategy.apply(current_model, context)

    # Checkpoint 2 must be selected as the best checkpoint
    assert result.success is True
    assert result.params["selected_checkpoint"] == "ckpt_epoch002.pt"
    assert result.artifact_metadata["selected_epoch"] == 2
    assert result.artifact_metadata["val_acc_after"] > 0.80
    assert result.artifact_metadata["val_acc_after"] > result.artifact_metadata["val_acc_before"]


# ---------------------------------------------------------------------------
# Averaging Strategy Tests (Weight Interpolation and BN Recalibration)
# ---------------------------------------------------------------------------


def test_checkpoint_averaging_full_workflow(tmp_path: Path):
    """CheckpointAveragingStrategy averages weights and recalibrates BatchNorm stats."""
    model = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))

    x_val = torch.randn(80, 1, 16, 16)
    y_val = torch.randint(0, 10, (80,))
    val_loader = DataLoader(TensorDataset(x_val, y_val), batch_size=32, shuffle=False)

    ckpt_paths: list[Path | str] = []
    state_dicts: list[dict[str, torch.Tensor]] = []

    for ep in range(1, 4):
        m_ep = copy.deepcopy(model)
        with torch.no_grad():
            for p in m_ep.parameters():
                p.add_(torch.randn_like(p) * 0.05)
        path = tmp_path / f"ckpt_epoch00{ep}.pt"
        torch.save(m_ep.state_dict(), path)
        ckpt_paths.append(path)
        state_dicts.append(m_ep.state_dict())

    # Record expected theoretical average for one parameter
    expected_weight = (
        state_dicts[0]["block1.0.weight"]
        + state_dicts[1]["block1.0.weight"]
        + state_dicts[2]["block1.0.weight"]
    ) / 3.0

    strategy = CheckpointAveragingStrategy()
    context = RecoveryContext(
        model=model,
        val_loader=val_loader,
        checkpoints=ckpt_paths,
        config=load_config(),
    )

    candidate, result = strategy.apply(model, context)

    assert result.success is True
    assert result.params["k_averaged"] == 3
    assert result.artifact_metadata["bn_recalibrated"] is True
    assert result.artifact_metadata["k_averaged"] == 3

    # Check that floating weights matched arithmetic average
    cand_weight = candidate.state_dict()["block1.0.weight"]
    assert torch.allclose(cand_weight, expected_weight, atol=1e-6)


# ---------------------------------------------------------------------------
# Source Immutability and Skip Isolation Tests
# ---------------------------------------------------------------------------


def test_source_checkpoints_and_model_immutability(tmp_path: Path):
    """Neither source checkpoint files nor input model weights may be mutated."""
    model = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))
    loader = DataLoader(TensorDataset(torch.randn(32, 1, 16, 16), torch.randint(0, 10, (32,))))

    ckpt1 = tmp_path / "ckpt_epoch001.pt"
    ckpt2 = tmp_path / "ckpt_epoch002.pt"
    torch.save(model.state_dict(), ckpt1)
    torch.save(model.state_dict(), ckpt2)

    hash_ckpt1_before = _compute_file_sha256(ckpt1)
    hash_ckpt2_before = _compute_file_sha256(ckpt2)
    hash_model_before = _hash_model_weights(model)

    rev_strat = CheckpointReversionStrategy()
    avg_strat = CheckpointAveragingStrategy()
    context = RecoveryContext(model=model, val_loader=loader, checkpoints=[ckpt1, ckpt2])

    _, _ = rev_strat.apply(model, context)
    _, _ = avg_strat.apply(model, context)

    # Checkpoint files on disk must remain strictly identical
    assert _compute_file_sha256(ckpt1) == hash_ckpt1_before
    assert _compute_file_sha256(ckpt2) == hash_ckpt2_before
    # Input model instance in memory must remain strictly identical
    assert _hash_model_weights(model) == hash_model_before


def test_skipping_corrupt_checkpoints_in_reversion_and_averaging(tmp_path: Path):
    """Corrupt or non-finite checkpoints are skipped without failing the entire run if others are valid."""
    model = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))
    loader = DataLoader(TensorDataset(torch.randn(32, 1, 16, 16), torch.randint(0, 10, (32,))))

    # Valid checkpoint 1
    ckpt1 = tmp_path / "ckpt_epoch001.pt"
    torch.save(model.state_dict(), ckpt1)

    # Valid checkpoint 2
    ckpt2 = tmp_path / "ckpt_epoch002.pt"
    torch.save(model.state_dict(), ckpt2)

    # Corrupt / NaN checkpoint 3
    bad_state = copy.deepcopy(model.state_dict())
    bad_state["fc.bias"][0] = float("nan")
    ckpt_bad = tmp_path / "ckpt_epoch003.pt"
    torch.save(bad_state, ckpt_bad)

    context = RecoveryContext(
        model=model,
        val_loader=loader,
        checkpoints=[ckpt1, ckpt2, ckpt_bad],
    )

    avg_strat = CheckpointAveragingStrategy()
    candidate, result = avg_strat.apply(model, context)

    # Averaging succeeds with the 2 valid checkpoints, skipping the bad one
    assert result.success is True
    assert result.artifact_metadata["k_averaged"] == 2
    assert "ckpt_epoch003.pt" in result.artifact_metadata["skipped_checkpoints"]
    assert result.artifact_metadata["skipped_checkpoints"]["ckpt_epoch003.pt"] == "NON_FINITE"


def test_insufficient_checkpoints_for_averaging(tmp_path: Path):
    """When fewer than 2 valid checkpoints exist, averaging fails safely with a clear message."""
    model = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))
    ckpt1 = tmp_path / "ckpt_epoch001.pt"
    torch.save(model.state_dict(), ckpt1)

    strategy = CheckpointAveragingStrategy()
    context = RecoveryContext(model=model, checkpoints=[ckpt1])

    # is_applicable rejects < 2 checkpoints
    app = strategy.is_applicable(ModelAdapter(model), context)
    assert app.can_apply is False
    assert app.reason == "NO_HISTORY"

    # apply returns success=False
    _, result = strategy.apply(model, context)
    assert result.success is False
    assert "Fewer than 2" in str(result.error_message)


def test_checkpoint_strategies_reject_holdout():
    """Verify that passing holdout data to checkpoint context is strictly forbidden."""
    model = build("small_cnn", num_classes=10, in_shape=(1, 16, 16))
    loader = DataLoader(TensorDataset(torch.randn(10, 1, 16, 16), torch.randint(0, 10, (10,))))

    with pytest.raises(ValueError, match="Holdout data must never enter RecoveryContext"):
        RecoveryContext(model=model, val_loader=loader, holdout_loader=loader)
