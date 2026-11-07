"""Safe model state_dict loader and registry verification."""

from __future__ import annotations

import importlib.util
import io
import os
from collections import OrderedDict
from pathlib import Path
from typing import Any

import torch
import torch.nn as nn

from amrs.errors import (
    ForbiddenError,
    ModelArchMismatchError,
    UnsafeOrInvalidCheckpointError,
    ValidationError,
)
from amrs.models.registry import build, is_registered, list_registered


def load_state_dict_safe(
    source: str | Path | io.BytesIO | bytes,
) -> OrderedDict[str, torch.Tensor]:
    """Load a PyTorch state_dict safely using weights_only=True.

    Enforces:
    1. Rejection of symlinks to prevent arbitrary host file reads.
    2. Strict PyTorch safe unpickling (weights_only=True), preventing arbitrary RCE.
    3. Structural validation: accepts raw state_dict or {'state_dict': ...}.
    4. Tensor validation: every value must strictly be an instance of torch.Tensor.

    Raises:
        UnsafeOrInvalidCheckpointError (HTTP 415): If checkpoint fails safety checks or is corrupt.
    """
    # 1. Symlink and file checks if source is a filesystem path
    if isinstance(source, (str, Path)):
        p = Path(source)
        if os.path.islink(p):
            raise UnsafeOrInvalidCheckpointError(
                message=f"Checkpoint path '{p}' is a symbolic link. Symlinks are rejected for security.",
                details={"path": str(p)},
            )
        if not p.exists() or not p.is_file():
            raise UnsafeOrInvalidCheckpointError(
                message=f"Checkpoint file '{p}' does not exist or is not a regular file.",
                details={"path": str(p)},
            )

    # 2. Convert bytes to BytesIO if necessary
    buffer: Any = source
    if isinstance(source, bytes):
        buffer = io.BytesIO(source)

    # 3. Load with weights_only=True
    try:
        loaded = torch.load(buffer, map_location="cpu", weights_only=True)
    except Exception as exc:
        raise UnsafeOrInvalidCheckpointError(
            message=f"Failed to safely load checkpoint: {exc}",
            details={"error_type": type(exc).__name__, "error": str(exc)},
        ) from exc

    # 4. Extract state_dict if wrapped in a dict
    if isinstance(loaded, dict) and "state_dict" in loaded:
        state_dict_candidate = loaded["state_dict"]
    else:
        state_dict_candidate = loaded

    if not isinstance(state_dict_candidate, (dict, OrderedDict)):
        raise UnsafeOrInvalidCheckpointError(
            message=f"Checkpoint payload must be a state_dict or contain a 'state_dict' key; got {type(state_dict_candidate).__name__}.",
            details={"root_type": type(loaded).__name__},
        )

    # 5. Validate that all values are strictly torch.Tensor
    clean_dict: OrderedDict[str, torch.Tensor] = OrderedDict()
    for key, value in state_dict_candidate.items():
        if not isinstance(key, str):
            raise UnsafeOrInvalidCheckpointError(
                message=f"State dict keys must be strings; got key of type {type(key).__name__}.",
                details={"invalid_key": str(key)},
            )
        if not isinstance(value, torch.Tensor):
            raise UnsafeOrInvalidCheckpointError(
                message=f"State dict entry for key '{key}' is not a Tensor (got {type(value).__name__}).",
                details={"key": key, "value_type": type(value).__name__},
            )
        clean_dict[key] = value

    return clean_dict


def build_and_load(
    arch: str,
    weights_source: str
    | Path
    | dict[str, torch.Tensor]
    | OrderedDict[str, torch.Tensor]
    | io.BytesIO
    | bytes,
    num_classes: int = 10,
    in_shape: tuple[int, ...] = (3, 32, 32),
) -> nn.Module:
    """Build model from registry and safely load validated state_dict into it.

    Raises:
        ValidationError: If architecture is not in registry.
        UnsafeOrInvalidCheckpointError: If checkpoint fails safe loading.
        ModelArchMismatchError: If tensor keys or shapes do not match the target architecture.
    """
    if not is_registered(arch):
        raise ValidationError(
            message=f"Architecture '{arch}' is not in the model registry. Allowlisted: {list_registered()}",
            details={"arch": arch, "allowlisted": list_registered()},
        )

    # Load state dict safely if path or bytes provided
    if isinstance(weights_source, (dict, OrderedDict)):
        state_dict = OrderedDict(weights_source)
    else:
        state_dict = load_state_dict_safe(weights_source)

    model = build(arch, num_classes=num_classes, in_shape=in_shape)
    model_state = model.state_dict()

    expected_keys = set(model_state.keys())
    provided_keys = set(state_dict.keys())

    missing_keys = sorted(expected_keys - provided_keys)
    unexpected_keys = sorted(provided_keys - expected_keys)

    # Also check shape mismatches for shared keys
    shape_mismatches: list[str] = []
    for k in expected_keys & provided_keys:
        if model_state[k].shape != state_dict[k].shape:
            shape_mismatches.append(
                f"{k}: expected {list(model_state[k].shape)}, got {list(state_dict[k].shape)}"
            )

    if missing_keys or unexpected_keys or shape_mismatches:
        raise ModelArchMismatchError(
            message=f"Model architecture '{arch}' does not match checkpoint tensors.",
            details={
                "arch": arch,
                "missing_keys": missing_keys[:20],
                "missing_keys_count": len(missing_keys),
                "unexpected_keys": unexpected_keys[:20],
                "unexpected_keys_count": len(unexpected_keys),
                "shape_mismatches": shape_mismatches[:20],
                "shape_mismatches_count": len(shape_mismatches),
            },
        )

    model.load_state_dict(state_dict, strict=True)
    model.eval()
    return model


def load_from_module(
    spec: str,
    allow_custom_code: bool = False,
) -> nn.Module:
    """Load model factory from module path (CLI only).

    Raises:
        ForbiddenError: Always raised when allow_custom_code=False (default for API/dashboard).
    """
    if not allow_custom_code:
        raise ForbiddenError(
            message="Loading models from arbitrary module paths is forbidden on web API. Custom modules are only permitted in local CLI mode with --allow-custom-code.",
            details={"spec": spec},
        )

    if ":" not in spec:
        raise ValidationError(
            message="Module spec must follow 'path/to/file.py:factory_fn' format.",
            details={"spec": spec},
        )

    file_path_str, factory_name = spec.rsplit(":", 1)
    file_path = Path(file_path_str).resolve()

    if not file_path.exists() or not file_path.is_file():
        raise ValidationError(
            message=f"Module file '{file_path}' does not exist.",
            details={"file_path": str(file_path)},
        )

    module_name = f"custom_amrs_module_{abs(hash(str(file_path)))}"
    spec_obj = importlib.util.spec_from_file_location(module_name, file_path)
    if spec_obj is None or spec_obj.loader is None:
        raise ValidationError(
            message=f"Failed to create module spec for '{file_path}'.",
            details={"file_path": str(file_path)},
        )

    module = importlib.util.module_from_spec(spec_obj)
    spec_obj.loader.exec_module(module)

    if not hasattr(module, factory_name):
        raise ValidationError(
            message=f"Factory '{factory_name}' not found in module '{file_path}'.",
            details={"factory": factory_name, "file_path": str(file_path)},
        )

    factory = getattr(module, factory_name)
    model = factory()
    if not isinstance(model, nn.Module):
        raise ValidationError(
            message=f"Factory '{factory_name}' returned '{type(model).__name__}', expected torch.nn.Module.",
            details={"returned_type": type(model).__name__},
        )

    return model
