"""Unit tests for AMRS configuration loading, validation, and serialization (INF-1.2)."""

import json
from pathlib import Path

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from amrs.config import (
    AmrsConfig,
    compute_gate_policy_hash,
    load_config,
    resolved_config_json,
)
from amrs.errors import AmrsError, ConfigInvalidError

# ---------------------------------------------------------------------------
# Criterion 1: Invalid Config Values Raise AmrsError(CONFIG_INVALID) Naming Field
# ---------------------------------------------------------------------------


def test_invalid_config_raises_config_invalid_naming_field() -> None:
    """Criterion 1: Invalid config values raise AmrsError(CONFIG_INVALID) naming the field."""
    # Test 1: min_retention > 1.0
    with pytest.raises(AmrsError) as exc_info:
        load_config(overrides={"gate": {"min_retention": 1.5}})

    err = exc_info.value
    assert err.code == "CONFIG_INVALID"
    assert isinstance(err, ConfigInvalidError)
    assert "min_retention" in str(err)
    assert "min_retention" in err.details.get("field", "")

    # Test 2: invalid selector mode
    with pytest.raises(AmrsError) as exc_info2:
        load_config(overrides={"selector": {"mode": "invalid_mode"}})

    err2 = exc_info2.value
    assert err2.code == "CONFIG_INVALID"
    assert "mode" in str(err2) or "mode" in err2.details.get("field", "")

    # Test 3: max_candidates < 1
    with pytest.raises(AmrsError) as exc_info3:
        load_config(overrides={"selector": {"max_candidates": 0}})

    err3 = exc_info3.value
    assert err3.code == "CONFIG_INVALID"
    assert "max_candidates" in str(err3)

    # Test 4: bootstrap_samples < 200
    with pytest.raises(AmrsError) as exc_info4:
        load_config(overrides={"gate": {"bootstrap_samples": 50}})

    err4 = exc_info4.value
    assert err4.code == "CONFIG_INVALID"
    assert "bootstrap_samples" in str(err4)


def test_invalid_yaml_file_raises_config_invalid(tmp_path: Path) -> None:
    """Unparseable YAML raises ConfigInvalidError with path details."""
    broken_yaml = tmp_path / "broken.yaml"
    broken_yaml.write_text(":: this is not valid: yaml: [", encoding="utf-8")

    with pytest.raises(ConfigInvalidError) as exc_info:
        load_config(path=broken_yaml)

    assert "broken.yaml" in str(exc_info.value)
    assert exc_info.value.code == "CONFIG_INVALID"


def test_resolved_config_json_default() -> None:
    """resolved_config_json() without argument serializes default config."""
    json_str = resolved_config_json()
    assert isinstance(json_str, str)
    data = json.loads(json_str)
    assert data["seed"] == 1234
    assert "gate" in data


# ---------------------------------------------------------------------------
# Criterion 2: load_config with Overrides Changes ONLY That Key
# ---------------------------------------------------------------------------


def test_load_config_override_changes_only_specified_key() -> None:
    """Criterion 2: load_config with overrides {"gate": {"min_retention": 0.9}} changes only that key."""
    base_cfg = load_config()
    overridden_cfg = load_config(overrides={"gate": {"min_retention": 0.9}})

    # Target key is updated
    assert overridden_cfg.gate.min_retention == 0.9
    assert base_cfg.gate.min_retention == 0.95

    # Other gate parameters remain strictly identical
    assert overridden_cfg.gate.holdout_min_size == base_cfg.gate.holdout_min_size
    assert overridden_cfg.gate.bootstrap_samples == base_cfg.gate.bootstrap_samples
    assert overridden_cfg.gate.family_alpha == base_cfg.gate.family_alpha
    assert overridden_cfg.gate.min_gain.accuracy == base_cfg.gate.min_gain.accuracy
    assert overridden_cfg.gate.max_regression.accuracy == base_cfg.gate.max_regression.accuracy

    # All other top-level sections remain strictly identical
    assert overridden_cfg.seed == base_cfg.seed
    assert overridden_cfg.device == base_cfg.device
    assert overridden_cfg.splits.model_dump() == base_cfg.splits.model_dump()
    assert overridden_cfg.diagnosis.model_dump() == base_cfg.diagnosis.model_dump()
    assert overridden_cfg.selector.model_dump() == base_cfg.selector.model_dump()
    assert overridden_cfg.strategies.model_dump() == base_cfg.strategies.model_dump()
    assert overridden_cfg.monitor.model_dump() == base_cfg.monitor.model_dump()


def test_compute_gate_policy_hash_deterministic() -> None:
    """compute_gate_policy_hash produces reproducible 16-char hex hash."""
    cfg = load_config()
    h1 = compute_gate_policy_hash(cfg.gate)
    h2 = compute_gate_policy_hash(cfg.gate)
    assert h1 == h2
    assert len(h1) == 16

    # Changing gate parameter changes the policy hash
    cfg_modified = load_config(overrides={"gate": {"min_retention": 0.90}})
    h_mod = compute_gate_policy_hash(cfg_modified.gate)
    assert h_mod != h1


# ---------------------------------------------------------------------------
# Hypothesis Round-Trip Test: load_config <-> resolved_config_json
# ---------------------------------------------------------------------------


@given(
    seed=st.integers(min_value=1, max_value=99999),
    min_retention=st.floats(min_value=0.5, max_value=0.99),
    max_candidates=st.integers(min_value=1, max_value=10),
    selector_mode=st.sampled_from(["first_accept", "best_of_all"]),
    bootstrap_samples=st.integers(min_value=200, max_value=2000),
)
@settings(max_examples=30)
def test_hypothesis_config_round_trip(
    seed: int,
    min_retention: float,
    max_candidates: int,
    selector_mode: str,
    bootstrap_samples: int,
) -> None:
    """Hypothesis: load_config(overrides) round-trips cleanly through resolved_config_json."""
    overrides = {
        "seed": seed,
        "selector": {
            "mode": selector_mode,
            "max_candidates": max_candidates,
        },
        "gate": {
            "min_retention": round(min_retention, 4),
            "bootstrap_samples": bootstrap_samples,
        },
    }

    cfg = load_config(overrides=overrides)
    json_str = resolved_config_json(cfg)

    # Deserialize back and check equality
    parsed_dict = json.loads(json_str)
    reloaded_cfg = AmrsConfig.model_validate(parsed_dict)

    assert reloaded_cfg.seed == seed
    assert reloaded_cfg.selector.mode == selector_mode
    assert reloaded_cfg.selector.max_candidates == max_candidates
    assert reloaded_cfg.gate.min_retention == pytest.approx(min_retention, abs=1e-4)
    assert reloaded_cfg.gate.bootstrap_samples == bootstrap_samples
    assert reloaded_cfg == cfg
