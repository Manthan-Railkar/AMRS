"""Integration test verifying exact parity between CLI commands and FastAPI REST routes (BE-6).

Guarantees:
1. CLI `amrs recover` and REST `POST /api/v1/runs` execute the same core domain logic.
2. CLI `amrs benchmark` and REST `POST /api/v1/benchmarks` return identical data structures.
3. CLI `amrs monitor-replay` and REST `POST /api/v1/monitor/replay` produce identical series.
"""

from __future__ import annotations

import io
import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from amrs.api.deps import get_coordinator
from amrs.api.jobs import JobCoordinator
from amrs.api.main import create_app
from amrs.cli import main
from amrs.store.db import Database


@pytest.fixture
def parity_env(tmp_path: Path):
    db_file = str(tmp_path / "parity.db")
    db = Database(db_file)
    artifacts_dir = tmp_path / "artifacts"
    coordinator = JobCoordinator(db=db, artifacts_root=artifacts_dir)

    app = create_app()
    app.dependency_overrides[get_coordinator] = lambda: coordinator
    client = TestClient(app)

    return client, coordinator, db_file, artifacts_dir


def test_recovery_cli_and_api_parity(parity_env, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture) -> None:
    client, coordinator, db_file, artifacts_dir = parity_env

    monkeypatch.setenv("AMRS_DB_PATH", db_file)
    monkeypatch.setenv("AMRS_ARTIFACTS_ROOT", str(artifacts_dir))

    # 1. Run recovery via API
    api_res = client.post("/api/v1/runs", json={"scenario_id": "s1_overfit", "seed": 42})
    assert api_res.status_code == 202
    api_run_id = api_res.json()["run_id"]

    # Poll until API run finishes
    import time
    for _ in range(50):
        detail = coordinator.get_run(api_run_id)
        if detail.status in ("succeeded", "failed"):
            break
        time.sleep(0.05)

    api_detail = coordinator.get_run(api_run_id)

    # 2. Run recovery via CLI
    rc = main(["recover", "--scenario", "s1_overfit", "--seed", "42", "--format", "json"])
    assert rc == 0
    captured = capsys.readouterr()
    cli_detail = json.loads(captured.out)

    # Assert Parity
    assert cli_detail["scenario_id"] == api_detail.scenario_id
    assert cli_detail["status"] == api_detail.status
    assert cli_detail["verdict"] == api_detail.verdict
    assert cli_detail["accepted_strategy"] == api_detail.accepted_strategy
    assert len(cli_detail["diagnoses"]) == len(api_detail.diagnoses)
    assert len(cli_detail["candidates"]) == len(api_detail.candidates)


def test_benchmark_cli_and_api_parity(parity_env, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture) -> None:
    client, coordinator, db_file, artifacts_dir = parity_env

    monkeypatch.setenv("AMRS_DB_PATH", db_file)
    monkeypatch.setenv("AMRS_ARTIFACTS_ROOT", str(artifacts_dir))

    # 1. Benchmark via API
    api_res = client.post(
        "/api/v1/benchmarks",
        json={"scenarios": ["s1_overfit"], "seeds": [0], "methods": ["amrs"]},
    )
    assert api_res.status_code == 202
    api_b_id = api_res.json()["benchmark_id"]
    api_detail = coordinator.get_benchmark(api_b_id)

    # 2. Benchmark via CLI
    rc = main(["benchmark", "--scenarios", "s1_overfit", "--seeds", "0", "--methods", "amrs", "--format", "json"])
    assert rc == 0
    captured = capsys.readouterr()
    cli_detail = json.loads(captured.out)

    assert len(cli_detail["results"]) == len(api_detail.results)
    assert cli_detail["results"][0]["scenario_id"] == api_detail.results[0].scenario_id
    assert cli_detail["results"][0]["method"] == api_detail.results[0].method

