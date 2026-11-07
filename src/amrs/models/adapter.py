"""Model adapter providing unified inspection and manipulation interface for AMRS models."""

from __future__ import annotations

from typing import Any

import torch
import torch.nn as nn
from torch.nn.modules.batchnorm import _BatchNorm


class ModelAdapter:
    """Unified interface to inspect and adapt registered PyTorch models."""

    def __init__(self, model: nn.Module) -> None:
        self.model = model

    def head_module(self) -> nn.Module:
        """Find the classification head module.

        Searches for attributes named 'fc', 'classifier', or 'head'.
        Falls back to the last nn.Linear module in the network.
        """
        for attr in ("fc", "classifier", "head"):
            if hasattr(self.model, attr):
                mod = getattr(self.model, attr)
                if isinstance(mod, nn.Module):
                    return mod

        linear_modules = [m for m in self.model.modules() if isinstance(m, nn.Linear)]
        if linear_modules:
            return linear_modules[-1]

        raise ValueError("Could not find a valid classification head in model.")

    def head_params(self) -> list[nn.Parameter]:
        """Return parameters belonging to the classification head."""
        head = self.head_module()
        return list(head.parameters())

    def backbone_params(self) -> list[nn.Parameter]:
        """Return parameters belonging to the backbone (everything except head)."""
        head_param_ids = {id(p) for p in self.head_params()}
        return [p for p in self.model.parameters() if id(p) not in head_param_ids]

    def bn_layers(self) -> list[_BatchNorm]:
        """Return all BatchNorm layers in the model in topological order."""
        return [m for m in self.model.modules() if isinstance(m, _BatchNorm)]

    def supports_bn(self) -> bool:
        """Check whether the model contains any BatchNorm layers."""
        return len(self.bn_layers()) > 0

    def num_params(self) -> int:
        """Total number of parameters in the model."""
        return sum(p.numel() for p in self.model.parameters())

    def features(self, x: torch.Tensor) -> torch.Tensor:
        """Extract intermediate features immediately preceding the head module.

        Uses a forward hook on the classification head.
        Guarantees head_module()(features(x)) reproduces model(x) within numerical tolerance.
        """
        head = self.head_module()
        captured_input: list[torch.Tensor] = []

        def hook(module: nn.Module, inp: tuple[Any, ...], out: Any) -> None:
            if inp and isinstance(inp[0], torch.Tensor):
                captured_input.append(inp[0])

        handle = head.register_forward_hook(hook)
        try:
            # Run forward pass (with hooks active)
            _ = self.model(x)
        finally:
            handle.remove()

        if not captured_input:
            raise RuntimeError("Failed to capture features before head module.")

        return captured_input[0]

    def layer_groups(self) -> list[list[nn.Parameter]]:
        """Return ordered parameter groups from input to output.

        Covers every parameter in model.parameters() exactly once with no duplicates.
        """
        groups: list[list[nn.Parameter]] = []
        covered_ids: set[int] = set()

        # Architecture-specific natural partitioning if available
        if hasattr(self.model, "conv1") and hasattr(self.model, "layer1"):
            # ResNet structure
            resnet_stages: list[list[Any]] = [
                [getattr(self.model, "conv1"), getattr(self.model, "bn1", None)],
                [getattr(self.model, "layer1")],
                [getattr(self.model, "layer2")],
                [getattr(self.model, "layer3")],
                [getattr(self.model, "layer4")],
                [self.head_module()],
            ]
            for stage in resnet_stages:
                stage_params = []
                for mod in stage:
                    if isinstance(mod, nn.Module):
                        for p in mod.parameters():
                            if id(p) not in covered_ids:
                                stage_params.append(p)
                                covered_ids.add(id(p))
                if stage_params:
                    groups.append(stage_params)
        elif hasattr(self.model, "block1") and hasattr(self.model, "block2"):
            # SmallCNN structure
            cnn_stages = [
                getattr(self.model, "block1"),
                getattr(self.model, "block2"),
                getattr(self.model, "block3"),
                self.head_module(),
            ]
            for mod in cnn_stages:
                if isinstance(mod, nn.Module):
                    stage_params = []
                    for p in mod.parameters():
                        if id(p) not in covered_ids:
                            stage_params.append(p)
                            covered_ids.add(id(p))
                    if stage_params:
                        groups.append(stage_params)
        elif hasattr(self.model, "fc1") and hasattr(self.model, "fc2"):
            # MLPSmall structure
            mlp_stages = [
                getattr(self.model, "fc1"),
                getattr(self.model, "fc2"),
                self.head_module(),
            ]
            for mod in mlp_stages:
                if isinstance(mod, nn.Module):
                    stage_params = []
                    for p in mod.parameters():
                        if id(p) not in covered_ids:
                            stage_params.append(p)
                            covered_ids.add(id(p))
                    if stage_params:
                        groups.append(stage_params)
        else:
            # Fallback: top-level children
            for child in self.model.children():
                child_params = []
                for p in child.parameters():
                    if id(p) not in covered_ids:
                        child_params.append(p)
                        covered_ids.add(id(p))
                if child_params:
                    groups.append(child_params)

        # Include any remaining parameters not covered
        remaining = [p for p in self.model.parameters() if id(p) not in covered_ids]
        if remaining:
            groups.append(remaining)

        return groups
