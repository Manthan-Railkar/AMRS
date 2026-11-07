"""Unit tests for SQLite repositories covering CRUD, transactions, pagination, restart persistence, and malformed records."""

from pathlib import Path

import pytest

from amrs.schemas import (
    BenchmarkResultItem,
    CandidateSummary,
    DiagnosisEvidence,
    DiagnosisItem,
    MonitorEventItem,
    RunDetailResponse,
)
from amrs.store.db import Database
from amrs.store.migrations import apply_migrations
from amrs.store.repository import (
    BenchmarkRepository,
    MonitorEventRepository,
    RunRepository,
)


@pytest.fixture
def test_db() -> Database:
    db = Database(":memory:")
    apply_migrations(db)
    return db


def create_sample_run(
    run_id: str = "run-001", verdict: str | None = None, scenario_id: str = "s1_overfit"
) -> RunDetailResponse:
    return RunDetailResponse(
        id=run_id,
        created_at="2026-11-06T12:00:00Z",
        status="queued",
        progress_stage="idle",
        progress_pct=0.0,
        scenario_id=scenario_id,
        arch="resnet18_cifar",
        original_sha256="abc123sha",
        config_json={"seed": 1234, "diagnosis": {"gap_min": 0.1}},
        seed=1234,
        verdict=verdict,
        accepted_strategy=None,
        error_message=None,
        duration_s=None,
        compute_units_total=None,
        diagnoses=[],
        candidates=[],
    )


def test_run_crud(test_db: Database) -> None:
    repo = RunRepository(test_db)
    run = create_sample_run("run-crud-1")

    # Create
    repo.create_run(run)

    # Read
    fetched = repo.get_run("run-crud-1")
    assert fetched is not None
    assert fetched.id == "run-crud-1"
    assert fetched.scenario_id == "s1_overfit"
    assert fetched.config_json == {"seed": 1234, "diagnosis": {"gap_min": 0.1}}

    # Update - transition queued -> running -> succeeded
    repo.update_run_status(
        run_id="run-crud-1", status="running", progress_stage="diagnosis", progress_pct=25.0
    )
    repo.update_run_status(
        run_id="run-crud-1",
        status="succeeded",
        verdict="accepted",
        accepted_strategy="checkpoint_reversion",
        duration_s=14.5,
        compute_units_total=1200.0,
    )
    updated = repo.get_run("run-crud-1")
    assert updated is not None
    assert updated.status == "succeeded"
    assert updated.verdict == "accepted"
    assert updated.accepted_strategy == "checkpoint_reversion"
    assert updated.duration_s == 14.5
    assert updated.compute_units_total == 1200.0


def test_diagnoses_and_candidates(test_db: Database) -> None:
    repo = RunRepository(test_db)
    run = create_sample_run("run-diag-1")
    repo.create_run(run)

    # Add diagnosis
    diag = DiagnosisItem(
        label="overfitting",
        confidence=0.91,
        rank=1,
        evidence=DiagnosisEvidence(
            metric_values={"train_acc": 0.95, "val_acc": 0.70},
            threshold_values={"gap_min": 0.10},
            source_split="val",
            explanation="Gap is 0.25",
        ),
    )
    repo.add_diagnosis("run-diag-1", diag)

    # Add candidate
    cand = CandidateSummary(
        id="cand-1",
        run_id="run-diag-1",
        order_idx=1,
        strategy="checkpoint_reversion",
        params={"epoch": 10},
        cost_units=100.0,
        wall_s=3.5,
        primary_metric="accuracy",
        delta_primary=0.03,
        ci_low=0.01,
        ci_high=0.05,
        retention=0.98,
        agreement=0.92,
        gate_decision="ACCEPT",
        gate_reasons=["Met criteria"],
    )
    repo.add_candidate(cand)

    fetched = repo.get_run("run-diag-1")
    assert fetched is not None
    assert len(fetched.diagnoses) == 1
    assert fetched.diagnoses[0].label == "overfitting"
    assert fetched.diagnoses[0].confidence == 0.91
    assert len(fetched.candidates) == 1
    assert fetched.candidates[0].strategy == "checkpoint_reversion"
    assert fetched.candidates[0].gate_decision == "ACCEPT"


def test_transaction_rollback_on_error(test_db: Database) -> None:
    repo = RunRepository(test_db)
    run = create_sample_run("run-rollback")
    repo.create_run(run)

    # Deliberate failure inside transaction
    with pytest.raises(RuntimeError):
        with test_db.transaction() as conn:
            conn.execute("UPDATE runs SET status = 'failed' WHERE id = 'run-rollback';")
            raise RuntimeError("Simulated crash mid-transaction")

    # Status must still be 'queued' because transaction was rolled back
    fetched = repo.get_run("run-rollback")
    assert fetched is not None
    assert fetched.status == "queued"


def test_pagination_and_filtering(test_db: Database) -> None:
    repo = RunRepository(test_db)
    # Insert 15 runs across scenarios and verdicts
    for i in range(15):
        verdict = "accepted" if i % 2 == 0 else "rolled_back"
        sc = "s1_overfit" if i < 10 else "s2_miscalibration"
        run = RunDetailResponse(
            id=f"run-p-{i:02d}",
            created_at=f"2026-11-06T12:{i:02d}:00Z",
            status="succeeded",
            scenario_id=sc,
            arch="resnet18_cifar",
            original_sha256="hash",
            seed=i,
            verdict=verdict,
        )
        repo.create_run(run)

    # 1. Total count and page size 5
    page1, total = repo.list_runs(limit=5, offset=0)
    assert total == 15
    assert len(page1) == 5

    page2, _ = repo.list_runs(limit=5, offset=5)
    assert len(page2) == 5
    assert page1[0].id != page2[0].id

    # 2. Filter by verdict
    accepted_runs, acc_total = repo.list_runs(verdict="accepted")
    assert acc_total == 8
    assert all(r.verdict == "accepted" for r in accepted_runs)

    # 3. Filter by scenario
    s2_runs, s2_total = repo.list_runs(scenario_id="s2_miscalibration")
    assert s2_total == 5
    assert all(r.scenario_id == "s2_miscalibration" for r in s2_runs)


def test_malformed_json_handling(test_db: Database) -> None:
    repo = RunRepository(test_db)
    run = create_sample_run("run-malformed")
    repo.create_run(run)

    # Corrupt the config_json manually in database
    conn = test_db.get_connection()
    conn.execute("UPDATE runs SET config_json = '{bad-json-syntax' WHERE id = 'run-malformed';")

    # Reading should not crash, but fallback gracefully to empty dict
    fetched = repo.get_run("run-malformed")
    assert fetched is not None
    assert fetched.config_json == {}


def test_restart_persistence(tmp_path: Path) -> None:
    """Verify that writing to a real SQLite file persists after closing and re-opening."""
    db_file = str(tmp_path / "amrs_test.db")

    # Step 1: Open DB, apply migrations, insert run
    db1 = Database(db_file)
    apply_migrations(db1)
    repo1 = RunRepository(db1)
    run = create_sample_run("run-persist-1", verdict="accepted")
    repo1.create_run(run)
    db1.close()

    # Step 2: Open brand-new Database instance pointing to the same file
    db2 = Database(db_file)
    apply_migrations(db2)
    repo2 = RunRepository(db2)

    # Step 3: Verify data survived the restart
    fetched = repo2.get_run("run-persist-1")
    assert fetched is not None
    assert fetched.id == "run-persist-1"
    assert fetched.verdict == "accepted"
    db2.close()


def test_monitor_events_repository(test_db: Database) -> None:
    repo = MonitorEventRepository(test_db)
    run_id = "run-monitor-test"

    event1 = MonitorEventItem(epoch=1, kind="overfit_warning", details={"loss": 0.45})
    event2 = MonitorEventItem(epoch=3, kind="trigger", details={"action": "recover"})

    repo.add_event(run_id, event1)
    repo.add_event(run_id, event2)

    events = repo.list_events(run_id)
    assert len(events) == 2
    assert events[0].epoch == 1
    assert events[0].kind == "overfit_warning"
    assert events[1].epoch == 3
    assert events[1].kind == "trigger"


def test_benchmark_repository(test_db: Database) -> None:
    repo = BenchmarkRepository(test_db)
    bm_id = "bm-test-01"

    results = [
        BenchmarkResultItem(
            scenario_id="s1_overfit",
            seed=1234,
            method="amrs",
            accuracy=0.89,
            ece=0.03,
            nll=0.35,
            retention=0.96,
            compute_units=1100.0,
            wall_s=32.0,
            accepted=True,
        ),
        BenchmarkResultItem(
            scenario_id="s1_overfit",
            seed=1234,
            method="full_retrain",
            accuracy=0.88,
            ece=0.05,
            nll=0.39,
            retention=0.85,
            compute_units=3000.0,
            wall_s=95.0,
            accepted=None,
        ),
    ]

    repo.create_benchmark(
        benchmark_id=bm_id,
        created_at="2026-11-06T15:00:00Z",
        config={"scenarios": ["s1_overfit"]},
        status="succeeded",
        results=results,
    )

    fetched = repo.get_benchmark(bm_id)
    assert fetched is not None
    assert fetched.benchmark_id == bm_id
    assert fetched.status == "succeeded"
    assert len(fetched.results) == 2
    assert fetched.results[0].method == "amrs"
    assert fetched.results[0].accepted is True

    # Test latest
    latest = repo.get_latest_benchmark()
    assert latest is not None
    assert latest.benchmark_id == bm_id
