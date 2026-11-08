"""Unit tests for safe model state_dict loader, architecture matching, and RCE prevention (BE-4 / DM-3.1)."""

import io
import os
import pickle
from pathlib import Path

import pytest
import torch
import torch.nn as nn

from amrs.errors import (
    ForbiddenError,
    ModelArchMismatchError,
    UnsafeOrInvalidCheckpointError,
)
from amrs.models.loader import (
    build_and_load,
    detect_architecture,
    load_from_module,
    load_state_dict_safe,
)
from amrs.models.registry import build


def test_load_state_dict_safe_valid_raw_dict() -> None:
    model = build("mlp_small")
    buf = io.BytesIO()
    torch.save(model.state_dict(), buf)
    buf.seek(0)

    loaded = load_state_dict_safe(buf)
    assert isinstance(loaded, dict)
    assert set(loaded.keys()) == set(model.state_dict().keys())
    assert all(isinstance(v, torch.Tensor) for v in loaded.values())


def test_load_state_dict_safe_wrapped_in_dict() -> None:
    model = build("mlp_small")
    buf = io.BytesIO()
    torch.save({"state_dict": model.state_dict(), "epoch": 5}, buf)
    buf.seek(0)

    loaded = load_state_dict_safe(buf)
    assert isinstance(loaded, dict)
    assert set(loaded.keys()) == set(model.state_dict().keys())


def test_load_state_dict_safe_rejects_malicious_pickle_without_execution(tmp_path: Path) -> None:
    """Security verification: arbitrary pickled objects must be rejected and must NEVER execute."""
    sentinel_file = tmp_path / "RCE_SENTINEL_TRIGGERED.txt"

    class ExploitPayload:
        def __reduce__(self):
            # Attempt to write a sentinel file if unpickled
            return (os.system, (f'echo "RCE" > "{sentinel_file}"',))

    # Save malicious pickle payload
    malicious_buf = io.BytesIO()
    pickle.dump(ExploitPayload(), malicious_buf)
    malicious_buf.seek(0)

    with pytest.raises(UnsafeOrInvalidCheckpointError) as exc_info:
        load_state_dict_safe(malicious_buf)

    assert exc_info.value.status_code == 415
    assert exc_info.value.code == "UNSAFE_OR_INVALID_CHECKPOINT"

    # Assert sentinel file was NEVER created
    assert not sentinel_file.exists(), (
        "CRITICAL SECURITY FAILURE: Arbitrary pickled object executed code!"
    )


def test_load_state_dict_safe_rejects_non_tensor_entries() -> None:
    buf = io.BytesIO()
    # Save a dictionary with a non-tensor value
    torch.save({"fc.weight": "not_a_tensor", "fc.bias": 1234}, buf)
    buf.seek(0)

    with pytest.raises(UnsafeOrInvalidCheckpointError) as exc_info:
        load_state_dict_safe(buf)

    assert exc_info.value.status_code == 415
    assert "not a Tensor" in str(exc_info.value.message)


def test_load_state_dict_safe_rejects_symlink(tmp_path: Path) -> None:
    real_file = tmp_path / "real_weights.pt"
    model = build("mlp_small")
    torch.save(model.state_dict(), real_file)

    symlink_file = tmp_path / "symlink_weights.pt"
    try:
        os.symlink(real_file, symlink_file)
    except OSError:
        pytest.skip("Symlinks require administrator privileges on Windows")

    with pytest.raises(UnsafeOrInvalidCheckpointError) as exc_info:
        load_state_dict_safe(symlink_file)

    assert "symbolic link" in str(exc_info.value.message).lower()


def test_build_and_load_success() -> None:
    model = build("mlp_small")
    buf = io.BytesIO()
    torch.save(model.state_dict(), buf)
    buf.seek(0)

    loaded_model = build_and_load("mlp_small", buf)
    assert isinstance(loaded_model, nn.Module)


def test_build_and_load_mismatch_raises_model_arch_mismatch() -> None:
    # Save weights from resnet18_cifar, try to load into mlp_small
    resnet = build("resnet18_cifar")
    buf = io.BytesIO()
    torch.save(resnet.state_dict(), buf)
    buf.seek(0)

    with pytest.raises(ModelArchMismatchError) as exc_info:
        build_and_load("mlp_small", buf)

    err = exc_info.value
    assert err.status_code == 422
    assert err.code == "MODEL_ARCH_MISMATCH"
    assert "missing_keys" in err.details
    assert "unexpected_keys" in err.details
    assert len(err.details["missing_keys"]) <= 20
    assert len(err.details["unexpected_keys"]) <= 20


def test_load_from_module_prohibited_when_custom_code_disabled() -> None:
    with pytest.raises(ForbiddenError) as exc_info:
        load_from_module("custom_model.py:create_model", allow_custom_code=False)

    assert exc_info.value.status_code == 403
    assert exc_info.value.code == "FORBIDDEN"


def test_load_from_module_allowed_when_custom_code_enabled(tmp_path: Path) -> None:
    factory_code = """
import torch.nn as nn

def make_test_model():
    return nn.Linear(8, 2)
"""
    mod_file = tmp_path / "custom_factory.py"
    mod_file.write_text(factory_code)

    model = load_from_module(f"{mod_file}:make_test_model", allow_custom_code=True)
    assert isinstance(model, nn.Linear)
    assert model.in_features == 8
    assert model.out_features == 2


def test_detect_architecture_mlp_small() -> None:
    model = build("mlp_small")
    buf = io.BytesIO()
    torch.save(model.state_dict(), buf)
    buf.seek(0)

    arch, conf, details = detect_architecture(buf, filename="mnist_model.pt")
    assert arch == "mlp_small"
    assert conf >= 0.95
    assert details["suggested_dataset"] == "MNIST sample"


def test_detect_architecture_resnet18() -> None:
    model = build("resnet18_cifar")
    buf = io.BytesIO()
    torch.save(model.state_dict(), buf)
    buf.seek(0)

    arch, conf, details = detect_architecture(buf, filename="weights.pt")
    assert arch == "resnet18_cifar"
    assert conf >= 0.95
    assert details["suggested_dataset"] == "CIFAR-10 sample"


def test_detect_architecture_small_cnn() -> None:
    model = build("small_cnn")
    buf = io.BytesIO()
    torch.save(model.state_dict(), buf)
    buf.seek(0)

    arch, conf, details = detect_architecture(buf, filename="cnn_weights.pth")
    assert arch == "small_cnn"
    assert conf >= 0.95


def test_build_and_load_dynamic_mlp_auto_adapts_to_user_weights() -> None:
    # User checkpoint: 2-layer MLP (784 -> 64 -> 10)
    user_checkpoint = {
        "fc1.weight": torch.randn(64, 784),
        "fc1.bias": torch.randn(64),
        "fc2.weight": torch.randn(10, 64),
        "fc2.bias": torch.randn(10),
    }
    buf = io.BytesIO()
    torch.save(user_checkpoint, buf)
    buf.seek(0)

    # Should automatically adapt to the user's exact weights and biases
    model = build_and_load("mlp_small", buf)
    assert isinstance(model, nn.Module)
    
    # Verify forward pass
    x = torch.randn(4, 784)
    out = model(x)
    assert out.shape == (4, 10)


