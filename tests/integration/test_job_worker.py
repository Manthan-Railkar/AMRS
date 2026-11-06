"""Integration tests for background worker lifecycle, cooperative cancellation, and crash recovery (BE-3)."""

import time
from pathlib import Path
import pytest

from amrs.api.jobs import JobCoordinator
from amrs.errors import ConflictError
from amrs.pipeline.lifecycle import RunStatus
from amrs.schemas import RunCreateRequest, RunDetailResponse
from amrs.store.db import Database
from amrs.store.migrations import apply_migrations


@pytest.fixture
def test_coord(tmp_path: Path) -> JobCoordinator:
    db = Database(str(tmp_path / "worker_test.db"))
    coord = JobCoordinator(db=db, artifacts_root=tmp_path / "artifacts")
    yield coord
    coord.shutdown(wait=False)


def test_async_job_execution(test_coord: JobCoordinator) -> None:
    req = RunCreateRequest(scenario_id="s1_overfit", seed=1234)
    run_id = test_coord.create_run(req)

    # Immediately after submission, status must be queued or running (non-blocking)
    initial_run = test_coord.get_run(run_id)
    assert initial_run.status in (RunStatus.QUEUED.value, RunStatus.RUNNING.value)

    # Poll until background worker finishes (max 5 seconds)
    start = time.time()
    terminal_run: RunDetailResponse | None = None
    while time.time() - start < 5.0:
        run = test_coord.get_run(run_id)
        if run.status in (RunStatus.SUCCEEDED.value, RunStatus.FAILED.value):
            terminal_run = run
            break
        time.sleep(0.05)

    assert terminal_run is not None, "Worker did not reach terminal state within timeout"
    assert terminal_run.status == RunStatus.SUCCEEDED.value
    assert terminal_run.progress_stage == "completed"
    assert terminal_run.progress_pct == 100.0
    assert terminal_run.verdict == "accepted"
    assert terminal_run.accepted_strategy == "checkpoint_reversion"
    assert terminal_run.duration_s is not None and terminal_run.duration_s > 0

    # Verify artifacts were written to run's isolated directory
    run_dir = test_coord.get_run_artifact_dir(run_id)
    assert (run_dir / "original.pt").exists()
    assert (run_dir / "accepted_model.pt").exists()
    assert (run_dir / "report.json").exists()


def test_concurrency_guard_and_active_lock(test_coord: JobCoordinator) -> None:
    req1 = RunCreateRequest(scenario_id="s1_overfit")
    run_id_1 = test_coord.create_run(req1)

    # Immediate second create_run must raise ConflictError
    req2 = RunCreateRequest(scenario_id="s2_miscalibration")
    with pytest.raises(ConflictError) as exc_info:
        test_coord.create_run(req2)
    assert exc_info.value.code == "CONFLICT"

    # Wait for run 1 to complete
    start = time.time()
    while time.time() - start < 5.0:
        if not test_coord.has_active_run():
            break
        time.sleep(0.05)

    # Now run 2 can be created successfully
    run_id_2 = test_coord.create_run(req2)
    assert run_id_2 != run_id_1


def test_cooperative_cancellation_workflow(test_coord: JobCoordinator) -> None:
    req = RunCreateRequest(scenario_id="s1_overfit")
    run_id = test_coord.create_run(req)

    # Cooperatively request cancellation
    test_coord.cancel_run(run_id)

    # Immediately after cancel_run, status in DB should be cancel_requested (or cancelled if already hit checkpoint)
    run_status_after_request = test_coord.get_run(run_id).status
    assert run_status_after_request in (RunStatus.CANCEL_REQUESTED.value, RunStatus.CANCELLED.value)

    # Poll until worker halts at checkpoint and transitions to CANCELLED
    start = time.time()
    final_run: RunDetailResponse | None = None
    while time.time() - start < 5.0:
        run = test_coord.get_run(run_id)
        if run.status == RunStatus.CANCELLED.value:
            final_run = run
            break
        time.sleep(0.05)

    assert final_run is not None, "Worker did not finalize cooperative cancellation"
    assert final_run.status == RunStatus.CANCELLED.value
    assert final_run.verdict == "rolled_back"

    # Verification guarantee: original weights preserved byte-identical on cancellation
    run_dir = test_coord.get_run_artifact_dir(run_id)
    orig_bytes = (run_dir / "original.pt").read_bytes()
    accepted_bytes = (run_dir / "accepted_model.pt").read_bytes()
    assert orig_bytes == accepted_bytes, "Accepted model must be byte-identical to original upon cancellation"


def test_startup_crash_recovery_stale_runs(tmp_path: Path) -> None:
    db_file = str(tmp_path / "crash_recovery.db")

    # Step 1: Simulate interrupted runs left in DB by an ungraceful crash
    db1 = Database(db_file)
    apply_migrations(db1)
    with db1.transaction() as conn:
        conn.execute(
            """
            INSERT INTO runs (
                id, created_at, status, progress_stage, progress_pct,
                scenario_id, arch, original_sha256, config_json, seed
            ) VALUES
            ('stuck-run-1', '2026-11-06T10:00:00Z', 'running', 'diagnosing', 20.0, 's1_overfit', 'resnet18_cifar', 'sha1', '{}', 1234),
            ('stuck-run-2', '2026-11-06T10:05:00Z', 'queued', 'queued', 0.0, 's2_miscalibration', 'resnet18_cifar', 'sha2', '{}', 1234);
            """
        )
    db1.close()

    # Step 2: "Reboot" - New coordinator starts up and points to the same database
    db2 = Database(db_file)
    coord2 = JobCoordinator(db=db2, artifacts_root=tmp_path / "artifacts")

    # Step 3: Verify the stuck runs were transitioned to 'failed' with error explanation
    run1 = coord2.get_run("stuck-run-1")
    run2 = coord2.get_run("stuck-run-2")

    assert run1.status == RunStatus.FAILED.value
    assert "interrupted by server restart or process crash" in (run1.error_message or "")

    assert run2.status == RunStatus.FAILED.value
    assert "interrupted by server restart or process crash" in (run2.error_message or "")

    # Step 4: Active lock must be free; a new run can be scheduled
    assert not coord2.has_active_run()
    new_id = coord2.create_run(RunCreateRequest(scenario_id="s1_overfit"))
    assert new_id is not None

    coord2.shutdown(wait=False)
    db2.close()

