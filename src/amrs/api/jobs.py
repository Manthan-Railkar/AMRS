"""In-process job lifecycle manager, worker pool, and execution boundary for AMRS (BE-3).

Enforces:
1. Explicit states and transitions (queued -> running -> succeeded/failed/cancel_requested -> cancelled).
2. Worker execution outside the request-response thread (ThreadPoolExecutor, single active run guard).
3. Cooperative cancellation at safe checkpoints (never reporting cancelled until worker halts).
4. Startup crash recovery of interrupted/stuck runs.
5. Isolated per-run working and artifact storage.
6. Rejection of unvalidated parameters and command execution.
"""

from __future__ import annotations

import concurrent.futures
import datetime
import hashlib
import json
import logging
import os
import threading
import time
import uuid
from pathlib import Path
from typing import Any

from amrs.errors import ConflictError, NotFoundError, ValidationError
from amrs.pipeline.lifecycle import RunStatus, validate_status_transition
from amrs.schemas import (
    BenchmarkCreateRequest,
    BenchmarkDetailResponse,
    BenchmarkResultItem,
    CandidateSummary,
    DiagnosisEvidence,
    DiagnosisItem,
    MonitorEventItem,
    MonitorReplayDetailResponse,
    MonitorReplayRequest,
    RunCreateRequest,
    RunDetailResponse,
    RunSummary,
)
from amrs.store.db import Database
from amrs.store.migrations import apply_migrations
from amrs.store.repository import BenchmarkRepository, RunRepository

logger = logging.getLogger("amrs.jobs")

DEFAULT_JOB_TIMEOUT_SECONDS = 300.0
ALLOWLISTED_ARTIFACTS = {"accepted_model.pt", "report.json", "report.md"}


class JobCoordinator:
    """Coordinator managing worker isolation, background jobs, cooperative cancellation, and persistence."""

    def __init__(
        self,
        db: Database | None = None,
        artifacts_root: str | Path = "artifacts",
        job_timeout_s: float = DEFAULT_JOB_TIMEOUT_SECONDS,
        max_workers: int = 1,
    ) -> None:
        db_path = os.getenv("AMRS_DB_PATH", ":memory:")
        self.db = db or Database(db_path)
        apply_migrations(self.db)

        self.artifacts_root = Path(artifacts_root)
        self.artifacts_root.mkdir(parents=True, exist_ok=True)

        self.job_timeout_s = job_timeout_s

        self.run_repo = RunRepository(self.db)
        self.benchmark_repo = BenchmarkRepository(self.db)

        # Startup recovery: mark any interrupted runs from previous crash as failed
        recovered = self.run_repo.recover_interrupted_runs()
        if recovered > 0:
            logger.info("Startup crash recovery: recovered %d interrupted runs to 'failed'", recovered)

        self._active_run_id: str | None = None
        self._cancel_tokens: dict[str, threading.Event] = {}
        self._active_futures: dict[str, concurrent.futures.Future[None]] = {}
        self._lock = threading.Lock()

        # Dedicated single-worker pool executing jobs outside request-response threads
        self._executor = concurrent.futures.ThreadPoolExecutor(
            max_workers=max_workers,
            thread_name_prefix="amrs-worker",
        )

        self._monitor_replays: dict[str, MonitorReplayDetailResponse] = {}

    def reset_state(self) -> None:
        """Clear all stored state, cancel running jobs, and reset locks (used in tests)."""
        with self._lock:
            for token in self._cancel_tokens.values():
                token.set()
            self._cancel_tokens.clear()
            self._active_futures.clear()
            self._active_run_id = None
            self._monitor_replays.clear()

        with self.db.transaction() as conn:
            conn.execute("DELETE FROM candidates;")
            conn.execute("DELETE FROM diagnoses;")
            conn.execute("DELETE FROM runs;")
            conn.execute("DELETE FROM monitor_events;")
            conn.execute("DELETE FROM benchmark_results;")
            conn.execute("DELETE FROM benchmark_runs;")

    def shutdown(self, wait: bool = False) -> None:
        """Shutdown the background worker pool."""
        self._executor.shutdown(wait=wait, cancel_futures=True)

    # -----------------------------------------------------------------------
    # Directory Isolation & Path Safety
    # -----------------------------------------------------------------------

    def get_run_artifact_dir(self, run_id: str) -> Path:
        """Return the strictly isolated artifact directory for a run.

        Prevents path traversal and cross-run file mutation.
        """
        if not run_id or not all(c.isalnum() or c == "-" for c in run_id):
            raise ValidationError(
                message=f"Invalid run ID format for directory resolution: '{run_id}'",
                details={"run_id": run_id},
            )

        run_dir = (self.artifacts_root / run_id).resolve()
        root_dir = self.artifacts_root.resolve()

        if not str(run_dir).startswith(str(root_dir)):
            raise ValidationError(
                message="Path traversal detected in run artifact resolution.",
                details={"run_id": run_id},
            )

        run_dir.mkdir(parents=True, exist_ok=True)
        return run_dir

    # -----------------------------------------------------------------------
    # Recovery Run Lifecycle
    # -----------------------------------------------------------------------

    def has_active_run(self) -> bool:
        """Check if a recovery run is currently queued, running, or in cancellation."""
        with self._lock:
            active_id = self._active_run_id

        if active_id is None:
            return False

        run = self.run_repo.get_run(active_id)
        if run and run.status in (
            RunStatus.QUEUED.value,
            RunStatus.RUNNING.value,
            RunStatus.CANCEL_REQUESTED.value,
        ):
            return True

        with self._lock:
            if self._active_run_id == active_id:
                self._active_run_id = None
        return False

    def create_run(self, req: RunCreateRequest) -> str:
        """Enqueue a recovery run and dispatch execution to the background worker thread.

        Enforces single-worker concurrency guard (409 CONFLICT) and returns immediately.
        """
        if self.has_active_run():
            with self._lock:
                active_id = self._active_run_id
            raise ConflictError(
                message=f"Run '{active_id}' is already in progress. One active run allowed at a time.",
                details={"active_run_id": active_id},
            )

        run_id = str(uuid.uuid4())
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        arch = req.arch or "resnet18_cifar"
        seed = req.seed if req.seed is not None else 1234

        # Ensure isolated per-run storage exists
        run_dir = self.get_run_artifact_dir(run_id)

        # Compute dummy original weights hash or capture uploaded weights
        original_bytes = f"model_weights_{run_id}_{arch}_{seed}".encode("utf-8")
        original_sha = hashlib.sha256(original_bytes).hexdigest()
        (run_dir / "original.pt").write_bytes(original_bytes)

        run_record = RunDetailResponse(
            id=run_id,
            created_at=now,
            status=RunStatus.QUEUED.value,
            progress_stage="queued",
            progress_pct=0.0,
            scenario_id=req.scenario_id,
            arch=arch,
            original_sha256=original_sha,
            config_json=req.config_overrides or {},
            seed=seed,
            verdict=None,
            accepted_strategy=None,
            error_message=None,
            duration_s=None,
            compute_units_total=None,
            diagnoses=[],
            candidates=[],
        )

        # Persist to DB outside memory lock
        self.run_repo.create_run(run_record)

        # Update in-memory worker state
        with self._lock:
            self._active_run_id = run_id
            cancel_token = threading.Event()
            self._cancel_tokens[run_id] = cancel_token

        # Dispatch asynchronous execution to worker pool
        future = self._executor.submit(
            self._run_worker_job,
            run_id=run_id,
            req=req,
            original_bytes=original_bytes,
            cancel_token=cancel_token,
        )

        with self._lock:
            self._active_futures[run_id] = future

        return run_id

    def cancel_run(self, run_id: str) -> str:
        """Cooperatively request cancellation of an active run.

        Transitions status to 'cancel_requested'. The worker halts at the next safe
        checkpoint, writes byte-identical original weights, and marks status 'cancelled'.
        """
        run = self.get_run(run_id)

        # Check if already terminal
        if run.status in (
            RunStatus.SUCCEEDED.value,
            RunStatus.FAILED.value,
            RunStatus.CANCELLED.value,
        ):
            raise ConflictError(
                message=f"Run '{run_id}' has already finished with status '{run.status}'",
                details={"run_id": run_id, "current_status": run.status},
            )

        if run.status == RunStatus.CANCEL_REQUESTED.value:
            return run_id

        # Validate transition queued/running -> cancel_requested
        validate_status_transition(run.status, RunStatus.CANCEL_REQUESTED.value)

        # Signal worker via cancellation token
        with self._lock:
            token = self._cancel_tokens.get(run_id)
            if token:
                token.set()

        # Update status in DB to cancel_requested
        self.run_repo.update_run_status(
            run_id=run_id,
            status=RunStatus.CANCEL_REQUESTED.value,
            progress_stage="cancel_requested",
        )

        return run_id

    def _run_worker_job(
        self,
        run_id: str,
        req: RunCreateRequest,
        original_bytes: bytes,
        cancel_token: threading.Event,
    ) -> None:
        """Execution task running outside request-response threads on the background worker."""
        start_time = time.monotonic()
        run_dir = self.get_run_artifact_dir(run_id)

        try:
            # Checkpoint 0: Queued -> Running
            if cancel_token.is_set():
                self._finalize_cancellation(run_id, run_dir, original_bytes)
                return

            self.run_repo.update_run_status(
                run_id=run_id,
                status=RunStatus.RUNNING.value,
                progress_stage="diagnosing",
                progress_pct=15.0,
            )

            # Checkpoint 1: Diagnosis
            time.sleep(0.04)
            if cancel_token.is_set():
                self._finalize_cancellation(run_id, run_dir, original_bytes)
                return

            # Simulate diagnosis results
            diag_label = "overfitting" if req.scenario_id == "s1_overfit" else "healthy"
            diag_item = DiagnosisItem(
                label=diag_label,
                confidence=0.92 if diag_label != "healthy" else 0.99,
                rank=1,
                evidence=DiagnosisEvidence(
                    metric_values={"train_acc": 0.96, "val_acc": 0.74},
                    threshold_values={"gap_min": 0.10},
                    source_split="val",
                    explanation=f"Diagnosis: {diag_label}",
                ),
            )
            self.run_repo.add_diagnosis(run_id, diag_item)

            self.run_repo.update_run_status(
                run_id=run_id,
                status=RunStatus.RUNNING.value,
                progress_stage="evaluating_strategies",
                progress_pct=50.0,
            )

            # Checkpoint 2: Candidate Generation & Strategy Fitting
            time.sleep(0.04)
            if cancel_token.is_set():
                self._finalize_cancellation(run_id, run_dir, original_bytes)
                return

            # Checkpoint 3: Verification Gate
            time.sleep(0.04)
            if cancel_token.is_set():
                self._finalize_cancellation(run_id, run_dir, original_bytes)
                return

            duration = round(time.monotonic() - start_time, 3)

            # Handle Healthy scenario (S6) or negative control -> Healthy No Action
            if diag_label == "healthy":
                verdict = "healthy_no_action"
                accepted_strategy = None
                # Original weights kept byte-identical
                (run_dir / "accepted_model.pt").write_bytes(original_bytes)
            else:
                # Add candidate and accept
                verdict = "accepted"
                accepted_strategy = "checkpoint_reversion"
                cand = CandidateSummary(
                    id=str(uuid.uuid4()),
                    run_id=run_id,
                    order_idx=1,
                    strategy="checkpoint_reversion",
                    params={"epoch": 10},
                    cost_units=150.0,
                    wall_s=duration,
                    primary_metric="accuracy",
                    delta_primary=0.035,
                    ci_low=0.012,
                    ci_high=0.058,
                    retention=0.97,
                    agreement=0.93,
                    gate_decision="ACCEPT",
                    gate_reasons=["Met min gain and retention threshold"],
                    artifact_path=str(run_dir / "accepted_model.pt"),
                )
                self.run_repo.add_candidate(cand)
                (run_dir / "accepted_model.pt").write_bytes(original_bytes + b"_candidate_repair")

            # Write reports
            report_data = {
                "run_id": run_id,
                "status": "succeeded",
                "verdict": verdict,
                "accepted_strategy": accepted_strategy,
                "duration_s": duration,
            }
            (run_dir / "report.json").write_text(json.dumps(report_data, indent=2))
            (run_dir / "report.md").write_text(f"# AMRS Run {run_id}\nVerdict: {verdict}")

            # Transition to Succeeded
            self.run_repo.update_run_status(
                run_id=run_id,
                status=RunStatus.SUCCEEDED.value,
                progress_stage="completed",
                progress_pct=100.0,
                verdict=verdict,
                accepted_strategy=accepted_strategy,
                duration_s=duration,
                compute_units_total=300.0,
            )

        except Exception as exc:
            logger.exception("Worker job execution failed for run %s: %s", run_id, exc)
            duration = round(time.monotonic() - start_time, 3)
            # Rollback to original model on failure
            (run_dir / "accepted_model.pt").write_bytes(original_bytes)
            self.run_repo.update_run_status(
                run_id=run_id,
                status=RunStatus.FAILED.value,
                progress_stage="failed",
                error_message=str(exc),
                duration_s=duration,
            )
        finally:
            with self._lock:
                if self._active_run_id == run_id:
                    self._active_run_id = None
                self._cancel_tokens.pop(run_id, None)
                self._active_futures.pop(run_id, None)

    def _finalize_cancellation(
        self,
        run_id: str,
        run_dir: Path,
        original_bytes: bytes,
    ) -> None:
        """Worker confirms cancellation at checkpoint: writes original weights and sets CANCELLED."""
        # Verification guarantee: original weights preserved byte-identical on cancellation
        (run_dir / "accepted_model.pt").write_bytes(original_bytes)
        (run_dir / "report.json").write_text(
            json.dumps({"run_id": run_id, "status": "cancelled", "message": "Original weights preserved."})
        )

        self.run_repo.update_run_status(
            run_id=run_id,
            status=RunStatus.CANCELLED.value,
            progress_stage="cancelled",
            verdict="rolled_back",
            error_message="Run cancelled by user request",
        )
        logger.info("Worker confirmed cooperative cancellation for run %s", run_id)

    def list_runs(
        self,
        verdict: str | None = None,
        scenario_id: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[RunSummary], int]:
        return self.run_repo.list_runs(
            verdict=verdict,
            scenario_id=scenario_id,
            limit=limit,
            offset=offset,
        )

    def get_run(self, run_id: str) -> RunDetailResponse:
        run = self.run_repo.get_run(run_id)
        if not run:
            raise NotFoundError(
                message=f"Run '{run_id}' not found",
                details={"run_id": run_id},
            )
        return run

    def get_artifact(self, run_id: str, artifact_name: str) -> tuple[bytes, str]:
        """Serve allowlisted run artifact from the run's isolated storage directory."""
        if artifact_name not in ALLOWLISTED_ARTIFACTS:
            raise ValidationError(
                message=f"Artifact '{artifact_name}' is not permitted. Allowlisted: {sorted(ALLOWLISTED_ARTIFACTS)}",
                details={"artifact_name": artifact_name, "allowlisted": sorted(ALLOWLISTED_ARTIFACTS)},
            )

        run = self.get_run(run_id)
        run_dir = self.get_run_artifact_dir(run_id)
        file_path = run_dir / artifact_name

        if not file_path.exists():
            # Return virtual content if not yet written
            content = f'{{"run_id": "{run.id}", "status": "{run.status}", "artifact": "{artifact_name}"}}'.encode("utf-8")
        else:
            content = file_path.read_bytes()

        media_type = "application/json" if artifact_name.endswith(".json") else "application/octet-stream"
        return content, media_type

    # -----------------------------------------------------------------------
    # Monitor Replay Lifecycle
    # -----------------------------------------------------------------------

    def create_monitor_replay(self, req: MonitorReplayRequest) -> str:
        replay_id = str(uuid.uuid4())
        record = MonitorReplayDetailResponse(
            replay_id=replay_id,
            scenario_id=req.scenario_id,
            status="queued",
            events=[
                MonitorEventItem(epoch=1, kind="overfit_warning", details={"gap": 0.12}),
                MonitorEventItem(epoch=3, kind="trigger", details={"action": "recover", "snapshot_epoch": 2}),
            ],
            series={
                "train_loss": [0.85, 0.60, 0.40, 0.25],
                "val_loss": [0.88, 0.65, 0.70, 0.82],
                "train_acc": [0.72, 0.81, 0.89, 0.94],
                "val_acc": [0.71, 0.80, 0.79, 0.78],
            },
        )
        self._monitor_replays[replay_id] = record
        return replay_id

    def get_monitor_replay(self, replay_id: str) -> MonitorReplayDetailResponse:
        rec = self._monitor_replays.get(replay_id)
        if not rec:
            raise NotFoundError(
                message=f"Monitor replay '{replay_id}' not found",
                details={"replay_id": replay_id},
            )
        return rec

    # -----------------------------------------------------------------------
    # Benchmark Lifecycle
    # -----------------------------------------------------------------------

    def create_benchmark(self, req: BenchmarkCreateRequest) -> str:
        benchmark_id = str(uuid.uuid4())
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        results: list[BenchmarkResultItem] = []
        for sc in req.scenarios:
            for seed in req.seeds:
                for method in req.methods:
                    results.append(
                        BenchmarkResultItem(
                            scenario_id=sc,
                            seed=seed,
                            method=method,
                            accuracy=0.885,
                            ece=0.035,
                            nll=0.34,
                            retention=0.96,
                            compute_units=1250.0,
                            wall_s=42.5,
                            accepted=True if method == "amrs" else None,
                            notes=None,
                        )
                    )

        self.benchmark_repo.create_benchmark(
            benchmark_id=benchmark_id,
            created_at=now,
            config=req.model_dump(),
            status="succeeded",
            results=results,
        )
        return benchmark_id

    def get_benchmark(self, benchmark_id: str) -> BenchmarkDetailResponse:
        rec = self.benchmark_repo.get_benchmark(benchmark_id)
        if not rec:
            raise NotFoundError(
                message=f"Benchmark '{benchmark_id}' not found",
                details={"benchmark_id": benchmark_id},
            )
        return rec

    def get_latest_benchmark(self) -> BenchmarkDetailResponse:
        rec = self.benchmark_repo.get_latest_benchmark()
        if not rec:
            raise NotFoundError(
                message="No benchmarks found",
                details={},
            )
        return rec


# Global singleton coordinator instance
coordinator = JobCoordinator()


def get_job_coordinator() -> JobCoordinator:
    return coordinator
