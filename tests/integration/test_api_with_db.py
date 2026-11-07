"""Integration test verifying end-to-end SQLite persistence across API restarts."""

from pathlib import Path

from fastapi.testclient import TestClient

from amrs.api.jobs import JobCoordinator
from amrs.api.main import create_app
from amrs.schemas import CandidateSummary, DiagnosisEvidence, DiagnosisItem
from amrs.store.db import Database


def test_api_restart_persistence_with_sqlite_file(tmp_path: Path) -> None:
    db_file = str(tmp_path / "amrs_api_persist.db")

    # Step 1: Start API instance 1 connected to db_file
    db1 = Database(db_file)
    coord1 = JobCoordinator(db=db1)
    # Intercept worker submission: this test explicitly manually simulates worker steps
    import concurrent.futures

    coord1._executor.submit = lambda *args, **kwargs: concurrent.futures.Future()
    app1 = create_app()
    # Override coordinator in app1
    from amrs.api import deps

    app1.dependency_overrides[deps.get_coordinator] = lambda: coord1

    client1 = TestClient(app1)

    # Create run via API
    create_res = client1.post(
        "/api/v1/runs",
        json={"scenario_id": "s1_overfit", "seed": 777},
    )
    assert create_res.status_code == 202
    run_id = create_res.json()["run_id"]

    # Attach diagnosis and candidate directly to the repository (simulating background worker)
    diag = DiagnosisItem(
        label="overfitting",
        confidence=0.94,
        rank=1,
        evidence=DiagnosisEvidence(explanation="Train-val gap high"),
    )
    cand = CandidateSummary(
        id="cand-001",
        run_id=run_id,
        order_idx=1,
        strategy="checkpoint_reversion",
        params={"epoch": 5},
        cost_units=200.0,
        wall_s=4.0,
        primary_metric="accuracy",
        delta_primary=0.035,
        ci_low=0.015,
        ci_high=0.055,
        retention=0.98,
        agreement=0.95,
        gate_decision="ACCEPT",
        gate_reasons=["Met threshold"],
    )
    coord1.run_repo.add_diagnosis(run_id, diag)
    coord1.run_repo.add_candidate(cand)
    curr = coord1.run_repo.get_run(run_id)
    if curr and curr.status == "queued":
        coord1.run_repo.update_run_status(run_id=run_id, status="running")
    coord1.run_repo.update_run_status(
        run_id=run_id,
        status="succeeded",
        verdict="accepted",
        accepted_strategy="checkpoint_reversion",
    )

    coord1.shutdown(wait=False)
    db1.close()

    # Step 2: "Restart" - Create a completely fresh API instance connected to the same file
    db2 = Database(db_file)
    coord2 = JobCoordinator(db=db2)
    app2 = create_app()
    app2.dependency_overrides[deps.get_coordinator] = lambda: coord2

    client2 = TestClient(app2)

    # Step 3: Query run detail from the new API instance
    detail_res = client2.get(f"/api/v1/runs/{run_id}")
    assert detail_res.status_code == 200
    data = detail_res.json()

    assert data["id"] == run_id
    assert data["status"] == "succeeded"
    assert data["verdict"] == "accepted"
    assert data["accepted_strategy"] == "checkpoint_reversion"
    assert len(data["diagnoses"]) == 1
    assert data["diagnoses"][0]["label"] == "overfitting"
    assert len(data["candidates"]) == 1
    assert data["candidates"][0]["strategy"] == "checkpoint_reversion"
    assert data["candidates"][0]["gate_decision"] == "ACCEPT"

    coord2.shutdown(wait=False)
    db2.close()
