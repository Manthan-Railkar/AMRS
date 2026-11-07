"""Metadata tracking for transformer base models, revisions, configs, and PEFT adapters (ML-10)."""

from __future__ import annotations

import dataclasses
import hashlib
import json
from typing import Any
import torch
import torch.nn as nn


def compute_state_dict_sha256(model: nn.Module) -> str:
    """Compute sha256 checksum across model parameters and buffers."""
    hasher = hashlib.sha256()
    for name, tensor in sorted(model.state_dict().items()):
        hasher.update(name.encode("utf-8"))
        hasher.update(tensor.detach().cpu().numpy().tobytes())
    return hasher.hexdigest()


def compute_config_hash(config_dict: dict[str, Any]) -> str:
    """Compute stable sha256 checksum of a configuration dictionary."""
    serialized = json.dumps(config_dict, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def get_environment_package_versions() -> dict[str, str]:
    """Capture runtime versions of core ML dependencies."""
    versions: dict[str, str] = {
        "torch": torch.__version__,
    }
    for pkg in ("transformers", "peft"):
        try:
            mod = __import__(pkg)
            versions[pkg] = getattr(mod, "__version__", "unknown")
        except ImportError:
            versions[pkg] = "not_installed"
    return versions


@dataclasses.dataclass(frozen=True)
class TransformerMetadata:
    """Immutable audit record for transformer base model and recovery adapter."""
    base_model_name_or_path: str
    base_model_revision: str | None
    base_model_sha256: str
    config_hash: str
    architecture: str
    adapter_config: dict[str, Any] = dataclasses.field(default_factory=dict)
    package_versions: dict[str, str] = dataclasses.field(default_factory=get_environment_package_versions)

    def to_dict(self) -> dict[str, Any]:
        """Convert metadata to JSON-serializable dictionary."""
        return {
            "base_model_name_or_path": self.base_model_name_or_path,
            "base_model_revision": self.base_model_revision,
            "base_model_sha256": self.base_model_sha256,
            "config_hash": self.config_hash,
            "architecture": self.architecture,
            "adapter_config": self.adapter_config,
            "package_versions": self.package_versions,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> TransformerMetadata:
        """Construct metadata instance from serialized dictionary."""
        return cls(
            base_model_name_or_path=data.get("base_model_name_or_path", "unknown"),
            base_model_revision=data.get("base_model_revision"),
            base_model_sha256=data.get("base_model_sha256", ""),
            config_hash=data.get("config_hash", ""),
            architecture=data.get("architecture", "unknown"),
            adapter_config=data.get("adapter_config", {}),
            package_versions=data.get("package_versions", {}),
        )

