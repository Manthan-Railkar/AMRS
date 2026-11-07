"""Configuration loading, validation, and policy versioning for AMRS (INF-1.2)."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

import yaml

from amrs.errors import ConfigInvalidError
from amrs.schemas import (
    BnRecalibrationConfig,
    CheckpointAveragingConfig,
    CheckpointReversionConfig,
    ConfigDefaultsResponse,
    DiagnosisBnDriftConfig,
    DiagnosisConfig,
    DiagnosisHeadDegradationConfig,
    DiagnosisInstabilityConfig,
    DiagnosisMiscalibrationConfig,
    DiagnosisOverfittingConfig,
    GateConfig,
    GateMaxRegressionConfig,
    GateMinGainConfig,
    LastLayerFinetuneConfig,
    MonitorConfig,
    MonitorInstabilityConfig,
    MonitorOverfitConfig,
    SelectiveFinetuneL2spConfig,
    SelectorConfig,
    SplitsConfig,
    StrategiesConfig,
    TemperatureScalingConfig,
    WeightInterpolationConfig,
)

# Canonical AmrsConfig model mirroring Section 2.7 and configs/default.yaml
AmrsConfig = ConfigDefaultsResponse

DEFAULT_CONFIG_PATH = Path("configs/default.yaml")
POLICY_VERSION = "1.0.0"


def _deep_merge(base: dict[str, Any], overrides: dict[str, Any]) -> dict[str, Any]:
    """Recursively merge overrides into base dictionary without mutating input."""
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
) -> AmrsConfig:
    """Load configuration from a YAML file, deep-merge overrides, and validate via Pydantic.

    Raises:
        ConfigInvalidError: If the YAML cannot be read or any configuration threshold/field is invalid.
    """
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
        return AmrsConfig(**data)
    except Exception as exc:
        field_name = "unknown"
        if hasattr(exc, "errors"):
            try:
                err_list = exc.errors()
                if err_list:
                    loc = err_list[0].get("loc", [])
                    field_name = ".".join(str(elem) for elem in loc)
            except Exception:
                pass
        raise ConfigInvalidError(
            message=f"Invalid configuration parameter '{field_name}': {exc}",
            details={"field": field_name, "error": str(exc)},
        ) from exc


def resolved_config_json(config: AmrsConfig | None = None) -> str:
    """Serialize the configuration model to JSON format."""
    cfg = config if config is not None else load_config()
    return cfg.model_dump_json(indent=2)


def compute_gate_policy_hash(gate_cfg: GateConfig) -> str:
    """Compute a deterministic cryptographic hash of the gate policy parameters for auditability."""
    serialized = gate_cfg.model_dump_json()
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:16]


__all__ = [
    "AmrsConfig",
    "ConfigDefaultsResponse",
    "load_config",
    "resolved_config_json",
    "compute_gate_policy_hash",
    "DEFAULT_CONFIG_PATH",
    "POLICY_VERSION",
    "SplitsConfig",
    "DiagnosisConfig",
    "DiagnosisOverfittingConfig",
    "DiagnosisMiscalibrationConfig",
    "DiagnosisBnDriftConfig",
    "DiagnosisInstabilityConfig",
    "DiagnosisHeadDegradationConfig",
    "SelectorConfig",
    "StrategiesConfig",
    "TemperatureScalingConfig",
    "BnRecalibrationConfig",
    "CheckpointReversionConfig",
    "CheckpointAveragingConfig",
    "LastLayerFinetuneConfig",
    "SelectiveFinetuneL2spConfig",
    "WeightInterpolationConfig",
    "GateConfig",
    "GateMinGainConfig",
    "GateMaxRegressionConfig",
    "MonitorConfig",
    "MonitorOverfitConfig",
    "MonitorInstabilityConfig",
]
