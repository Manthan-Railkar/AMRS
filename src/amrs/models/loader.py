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
from amrs.models.registry import (
    DynamicCNN,
    DynamicMLP,
    build,
    build_dynamic_resnet,
    is_registered,
    list_registered,
)


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

    # Strip module. prefix if present (e.g. from torch.nn.DataParallel)
    if any(k.startswith("module.") for k in state_dict.keys()):
        state_dict = OrderedDict((k.removeprefix("module."), v) for k, v in state_dict.items())

    # For mlp_small, allow flexible dynamic architecture adaptation to checkpoint weights
    if arch == "mlp_small":
        has_conv = any("conv" in k.lower() for k in state_dict.keys()) or any(
            len(v.shape) == 4 for v in state_dict.values()
        )
        has_bn = any(
            "bn" in k.lower() or "running_mean" in k.lower() or "running_var" in k.lower()
            for k in state_dict.keys()
        )
        all_linear_shapes = all(len(v.shape) in (1, 2) for v in state_dict.values())
        weight_keys = [
            k for k in state_dict.keys() if k.endswith(".weight") and len(state_dict[k].shape) == 2
        ]

        if not has_conv and not has_bn and all_linear_shapes and len(weight_keys) >= 1:
            dynamic_model = DynamicMLP(state_dict)
            dynamic_model.load_state_dict(state_dict, strict=True)
            dynamic_model.eval()
            return dynamic_model

    # For small_cnn, allow flexible dynamic adaptation to checkpoint weights
    if arch == "small_cnn":
        # First try standard SmallCNN if keys match strictly
        try:
            model = build("small_cnn", num_classes=num_classes, in_shape=in_shape)
            model.load_state_dict(state_dict, strict=True)
            model.eval()
            return model
        except Exception:
            pass

        # Try DynamicCNN for features/classifier or sequential CNN models
        try:
            dyn_cnn = DynamicCNN(state_dict)
            dyn_cnn.load_state_dict(state_dict, strict=True)
            dyn_cnn.eval()
            return dyn_cnn
        except Exception:
            pass

        # If checkpoint has residual layers, gracefully adapt via build_dynamic_resnet
        has_resnet_layers = any(
            k.startswith("layer1.") or k.startswith("layer2.") for k in state_dict.keys()
        )
        if has_resnet_layers:
            try:
                dyn_res = build_dynamic_resnet(state_dict)
                dyn_res.load_state_dict(state_dict, strict=True)
                dyn_res.eval()
                return dyn_res
            except Exception:
                pass

    # For resnet18_cifar, allow flexible dynamic adaptation to checkpoint weights
    if arch == "resnet18_cifar":
        # First try standard resnet18_cifar if keys match strictly
        try:
            model = build("resnet18_cifar", num_classes=num_classes, in_shape=in_shape)
            model.load_state_dict(state_dict, strict=True)
            model.eval()
            return model
        except Exception:
            pass

        # Try dynamic ResNet if residual layers are present
        has_resnet_layers = any(
            k.startswith("layer1.") or k.startswith("layer2.") for k in state_dict.keys()
        )
        if has_resnet_layers:
            try:
                dyn_res = build_dynamic_resnet(state_dict)
                dyn_res.load_state_dict(state_dict, strict=True)
                dyn_res.eval()
                return dyn_res
            except Exception:
                pass

        # Gracefully adapt if user uploaded a CNN under resnet18_cifar
        has_features = any(k.startswith("features.") for k in state_dict.keys())
        has_conv_weights = any(len(v.shape) == 4 for v in state_dict.values())
        if has_features or has_conv_weights:
            try:
                dyn_cnn = DynamicCNN(state_dict)
                dyn_cnn.load_state_dict(state_dict, strict=True)
                dyn_cnn.eval()
                return dyn_cnn
            except Exception:
                pass

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
        summary_reasons: list[str] = []
        if shape_mismatches:
            summary_reasons.append(f"Shape mismatches: {', '.join(shape_mismatches[:3])}")
        if missing_keys:
            summary_reasons.append(f"Missing keys: {', '.join(missing_keys[:3])}")
        if unexpected_keys:
            summary_reasons.append(f"Unexpected keys: {', '.join(unexpected_keys[:3])}")
        detail_msg = f": {'; '.join(summary_reasons)}" if summary_reasons else ""

        raise ModelArchMismatchError(
            message=f"Model architecture '{arch}' does not match checkpoint tensors{detail_msg}.",
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


def detect_architecture(
    weights_source: str
    | Path
    | dict[str, torch.Tensor]
    | OrderedDict[str, torch.Tensor]
    | io.BytesIO
    | bytes,
    filename: str | None = None,
) -> tuple[str, float, dict[str, Any]]:
    """Automatically inspect a state_dict or weights file and identify its architecture.

    Returns:
        (detected_arch_name, confidence, details_dict)
    """
    if isinstance(weights_source, (dict, OrderedDict)):
        state_dict = OrderedDict(weights_source)
    else:
        state_dict = load_state_dict_safe(weights_source)

    keys = list(state_dict.keys())
    details: dict[str, Any] = {
        "num_tensors": len(keys),
        "keys": keys[:10],
    }

    # Determine suggested dataset from input tensor shapes or filename
    suggested_dataset: str | None = None
    fn_lower = (filename or "").lower()

    first_conv_weight = next((v for v in state_dict.values() if len(v.shape) == 4), None)
    if first_conv_weight is not None:
        in_ch = first_conv_weight.shape[1]
        if in_ch == 1 or "mnist" in fn_lower:
            suggested_dataset = "MNIST sample"
        elif in_ch == 3 or "cifar" in fn_lower:
            suggested_dataset = "CIFAR-10 sample"
    elif "fc1.weight" in state_dict:
        in_dim = state_dict["fc1.weight"].shape[1]
        if in_dim == 784 or "mnist" in fn_lower:
            suggested_dataset = "MNIST sample"
        elif in_dim == 3072 or "cifar" in fn_lower:
            suggested_dataset = "CIFAR-10 sample"
    elif "mnist" in fn_lower:
        suggested_dataset = "MNIST sample"
    elif "cifar" in fn_lower:
        suggested_dataset = "CIFAR-10 sample"

    has_resnet_layers = any(
        k.startswith("layer1.") or k.startswith("layer2.") or k.startswith("layer3.") for k in keys
    )
    has_conv = any("conv" in k.lower() for k in keys) or any(
        len(v.shape) == 4 for v in state_dict.values()
    )
    has_bn = any(
        "bn" in k.lower() or "batch_norm" in k.lower() or "running_mean" in k.lower() for k in keys
    )
    has_features = any(k.startswith("features.") for k in keys)
    has_blocks = any("block1" in k or "block2" in k or "block3" in k for k in keys)
    all_linear = all(len(v.shape) in (1, 2) for v in state_dict.values())

    # 1. Check for ResNet (residual blocks: layer1, layer2, layer3, layer4)
    if has_resnet_layers or ("resnet" in fn_lower and not has_features):
        details["reason"] = "Residual block hierarchy detected (layer1..layer4)"
        details["suggested_dataset"] = suggested_dataset or "CIFAR-10 sample"
        return "resnet18_cifar", 0.99, details

    # 2. Check for SmallCNN / Convolutional networks
    if has_features or has_blocks or (has_conv and (has_bn or not all_linear)) or "cnn" in fn_lower:
        details["reason"] = "Convolutional and feature extraction block signatures detected"
        details["suggested_dataset"] = suggested_dataset or "CIFAR-10 sample"
        return "small_cnn", 0.99, details

    # 3. Check for MLPSmall (linear layers only: fc1, fc2, fc, no convolutions, 1D/2D weights only)
    has_fc_structure = any(
        k.startswith("fc1.") or k.startswith("fc2.") or "fc." in k or k.startswith("fc3.")
        for k in keys
    )
    if (has_fc_structure or all_linear or "mlp" in fn_lower) and not has_conv and not has_bn:
        details["reason"] = "Dense / fully connected linear layer hierarchy detected"
        details["suggested_dataset"] = suggested_dataset or "MNIST sample"
        return "mlp_small", 0.99, details

    # 4. Fallback: if convolutions present, small_cnn, else resnet18_cifar
    if has_conv:
        details["reason"] = "Convolutional layers detected"
        details["suggested_dataset"] = suggested_dataset or "CIFAR-10 sample"
        return "small_cnn", 0.85, details

    details["reason"] = "Default allowlisted architecture"
    details["suggested_dataset"] = suggested_dataset or "CIFAR-10 sample"
    return "resnet18_cifar", 0.70, details
