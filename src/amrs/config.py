"""Configuration loading, validation, and policy versioning for AMRS."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any
import yaml

from amrs.errors import ConfigInvalidError
from amrs.schemas import ConfigDefaultsResponse, GateConfig


DEFAULT_CONFIG_PATH = Path("configs/default.yaml")
POLICY_VERSION = "1.0.0"


def _deep_merge(base: dict[str, Any], overrides: dict[str, Any]) -> dict[str, Any]:
    """Recursively merge overrides into base dictionary."""
    result = base.copy()
    for k, v in overrides.items():
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k] = _deep_merge(result[k], v)
        else:
            result[k] = v
    return result


def load_config(
    path: str | Path | None = None,
    overrides: dict[str, Any] | None = None,
) -> ConfigDefaultsResponse:
    """Load configuration from a YAML file, deep-merge overrides, and validate via Pydantic."""
    cfg_path = Path(path) if path else DEFAULT_CONFIG_PATH
    data: dict[str, Any] = {}

    if cfg_path.exists():
        try:
            with open(cfg_path, "r", encoding="utf-8") as f:
                loaded = yaml.safe_load(f)
                if isinstance(loaded, dict):
                    data = loaded
        except Exception as exc:
            raise ConfigInvalidError(
                message=f"Failed to parse YAML configuration at '{cfg_path}': {exc}",
                details={"path": str(cfg_path), "error": str(exc)},
            ) from exc

    if overrides:
        data = _deep_merge(data, overrides)

    try:
        return ConfigDefaultsResponse(**data)
    except Exception as exc:
        raise ConfigInvalidError(
            message=f"Invalid configuration parameters: {exc}",
            details={"error": str(exc)},
        ) from exc


def compute_gate_policy_hash(gate_cfg: GateConfig) -> str:
    """Compute a deterministic cryptographic hash of the gate policy parameters for auditability."""
    # Serialize canonical JSON of gate config
    serialized = gate_cfg.model_dump_json()
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:16]

