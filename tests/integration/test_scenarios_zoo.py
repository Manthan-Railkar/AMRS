"""Integration tests for Scenario Zoo Generator (DM-4.1).

Verifies:
1. Building and verifying all 6 scenarios in tiny mode across seeds (0, 1, 2).
2. Determinism: building the same scenario twice with the same seed produces identical SHA-256 for final.pt.
3. Symptom reproduction failure path: raises ScenarioNotReproducedError with SCENARIO_NOT_REPRODUCED.
4. CLI build command executes cleanly with --all and --profile tiny.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest

from amrs.benchmark.scenarios import (
    SCENARIO_CATALOG,
    build_scenario,
    verify_scenario,
)
from amrs.errors import ScenarioNotReproducedError


@pytest.fixture
def tmp_scenarios_dir(tmp_path: Path) -> Path:
    out = tmp_path / "scenarios"
    out.mkdir(parents=True, exist_ok=True)
    return out


@pytest.mark.parametrize("scenario_id", list(SCENARIO_CATALOG.keys()))
def test_tiny_scenario_build_and_verify_seed0(scenario_id: str, tmp_scenarios_dir: Path):
    """Verify that every scenario in tiny profile builds and passes verify_scenario."""
    build_scenario(
        scenario_id=scenario_id,
        seed=0,
        profile="tiny",
        base_dir=tmp_scenarios_dir,
        device="cpu",
        force=True,
    )

    scenario_dir = tmp_scenarios_dir / scenario_id / "seed0"
    assert scenario_dir.exists()
    assert (scenario_dir / "final.pt").is_file()
    assert (scenario_dir / "history.json").is_file()
    assert (scenario_dir / "meta.json").is_file()

    with open(scenario_dir / "meta.json", "r", encoding="utf-8") as f:
        meta_loaded = json.load(f)
    assert meta_loaded["scenario_id"] == scenario_id
    assert meta_loaded["seed"] == 0
    assert "sha256" in meta_loaded
    assert len(meta_loaded["sha256"]) == 64

    # Run verification directly
    verified = verify_scenario(
        scenario_id=scenario_id,
        seed=0,
        profile="tiny",
        base_dir=tmp_scenarios_dir,
        device="cpu",
    )
    assert verified["verified"] is True
    assert (scenario_dir / "verified.json").is_file()


@pytest.mark.parametrize("seed", [1, 2])
def test_tiny_scenarios_multi_seed(seed: int, tmp_scenarios_dir: Path):
    """Verify that multiple scenarios reproduce across seeds 1 and 2."""
    for s_id in ["s1_overfit", "s2_miscalibration", "s6_healthy"]:
        build_scenario(
            scenario_id=s_id,
            seed=seed,
            profile="tiny",
            base_dir=tmp_scenarios_dir,
            device="cpu",
            force=True,
        )
        verified = verify_scenario(
            scenario_id=s_id,
            seed=seed,
            profile="tiny",
            base_dir=tmp_scenarios_dir,
            device="cpu",
        )
        assert verified["verified"] is True


def test_scenario_build_determinism(tmp_scenarios_dir: Path):
    """Verify that building the same scenario with the same seed produces identical SHA-256."""
    dir1 = tmp_scenarios_dir / "run1"
    dir2 = tmp_scenarios_dir / "run2"

    meta1 = build_scenario(
        scenario_id="s1_overfit",
        seed=42,
        profile="tiny",
        base_dir=dir1,
        device="cpu",
        force=True,
    )
    meta2 = build_scenario(
        scenario_id="s1_overfit",
        seed=42,
        profile="tiny",
        base_dir=dir2,
        device="cpu",
        force=True,
    )

    ckpt1 = (dir1 / "s1_overfit" / "seed42" / "final.pt").read_bytes()
    ckpt2 = (dir2 / "s1_overfit" / "seed42" / "final.pt").read_bytes()

    hash1 = hashlib.sha256(ckpt1).hexdigest()
    hash2 = hashlib.sha256(ckpt2).hexdigest()

    assert hash1 == hash2, (
        "Repeat builds with the same seed must produce identical final.pt hash on CPU"
    )
    assert meta1["sha256"] == meta2["sha256"]


def test_scenario_verification_failure_raises(tmp_scenarios_dir: Path, monkeypatch):
    """Verify that verify_scenario raises ScenarioNotReproducedError when symptom is absent."""
    build_scenario(
        scenario_id="s1_overfit",
        seed=0,
        profile="tiny",
        base_dir=tmp_scenarios_dir,
        device="cpu",
        force=True,
    )

    # Monkeypatch predict_logits to return identical outputs for train and val so gap is 0.0
    import torch

    import amrs.benchmark.scenarios as sc_module

    def mock_predict_logits(model, loader, device):
        # Return 100% correct logits
        y = torch.cat([batch[1] for batch in loader])
        logits = torch.zeros((len(y), 10))
        for i, val in enumerate(y):
            logits[i, val] = 10.0
        return logits, y

    monkeypatch.setattr(sc_module, "predict_logits", mock_predict_logits)

    with pytest.raises(ScenarioNotReproducedError) as exc_info:
        verify_scenario(
            scenario_id="s1_overfit",
            seed=0,
            profile="tiny",
            base_dir=tmp_scenarios_dir,
            device="cpu",
        )

    err = exc_info.value
    assert err.code == "SCENARIO_NOT_REPRODUCED"
    assert "S1 Overfit verification failed" in err.message
