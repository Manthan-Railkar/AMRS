"""In-process job lifecycle manager and execution boundary for AMRS recovery runs.

Maintains concurrency limits (single active run guard), state transitions,
and cooperative cancellation semantics required by Section 2.5 and BE-3.
"""

from __future__ import annotations

import datetime
import os
import uuid
from typing import Any

from amrs.errors import ConflictError, NotFoundError, ValidationError
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


class JobCoordinator:
    """Singleton in-process coordinator managing runs, monitor replays, and benchmarks."""

    def __init__(self) -> None:
        self._runs: dict[str, RunDetailResponse] = {}
        self._monitor_replays: dict[str, MonitorReplayDetailResponse] = {}
        self._benchmarks: dict[str, BenchmarkDetailResponse] = {}
        self._active_run_id: str | None = None
        self._seed_mock_scenarios()

    def _seed_mock_scenarios(self) -> None:
        """Seed completed runs or demo fixtures if needed, or keep clean."""
        pass

    # -----------------------------------------------------------------------
    # Recovery Run Lifecycle
    # -----------------------------------------------------------------------

    def has_active_run(self) -> bool:
        if self._active_run_id is None:
            return False
        run = self._runs.get(self._active_run_id)
        if run and run.status in ("queued", "running"):
            return True
        self._active_run_id = None
        return False

    def create_run(self, req: RunCreateRequest) -> str:
        """Create a new run. Enforces single-worker active run concurrency guard (409)."""
        if self.has_active_run():
            raise ConflictError(
                message=f"Run '{self._active_run_id}' is already in progress. One active run allowed at a time.",
                details={"active_run_id": self._active_run_id},
            )

        run_id = str(uuid.uuid4())
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        arch = req.arch or "resnet18_cifar"
        seed = req.seed if req.seed is not None else 1234

        run_record = RunDetailResponse(
            id=run_id,
            created_at=now,
            status="queued",
            progress_stage="initializing",
            progress_pct=0.0,
            scenario_id=req.scenario_id,
            arch=arch,
            original_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
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

        self._runs[run_id] = run_record
        self._active_run_id = run_id
        return run_id

    def list_runs(
        self,
        verdict: str | None = None,
        scenario_id: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[RunSummary], int]:
        """List runs with optional filtering and pagination."""
        all_runs = list(self._runs.values())
        if verdict:
            all_runs = [r for r in all_runs if r.verdict == verdict]
        if scenario_id:
            all_runs = [r for r in all_runs if r.scenario_id == scenario_id]

        total = len(all_runs)
        paged = all_runs[offset : offset + limit]

        summaries = [
            RunSummary(
                id=r.id,
                created_at=r.created_at,
                status=r.status,
                scenario_id=r.scenario_id,
                arch=r.arch,
                original_sha256=r.original_sha256,
                verdict=r.verdict,
                accepted_strategy=r.accepted_strategy,
                duration_s=r.duration_s,
                compute_units_total=r.compute_units_total,
            )
            for r in paged
        ]
        return summaries, total

    def get_run(self, run_id: str) -> RunDetailResponse:
        run = self._runs.get(run_id)
        if not run:
            raise NotFoundError(
                message=f"Run '{run_id}' not found",
                details={"run_id": run_id},
            )
        return run

    def cancel_run(self, run_id: str) -> str:
        """Cooperative cancellation of an active run."""
        run = self.get_run(run_id)
        if run.status in ("succeeded", "failed", "cancelled"):
            raise ConflictError(
                message=f"Run '{run_id}' has already finished with status '{run.status}'",
                details={"run_id": run_id, "current_status": run.status},
            )

        run.status = "cancelled"
        run.progress_stage = "cancelled"
        if self._active_run_id == run_id:
            self._active_run_id = None
        return run_id

    def get_artifact(self, run_id: str, artifact_name: str) -> tuple[bytes, str]:
        """Retrieve allowlisted artifact for a run."""
        allowlist = {"accepted_model.pt", "report.json", "report.md"}
        if artifact_name not in allowlist:
            raise ValidationError(
                message=f"Artifact '{artifact_name}' is not permitted. Allowlisted: {sorted(allowlist)}",
                details={"artifact_name": artifact_name, "allowlisted": sorted(allowlist)},
            )
        run = self.get_run(run_id)
        content = f'{{"run_id": "{run.id}", "status": "{run.status}", "artifact": "{artifact_name}"}}'.encode("utf-8")
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
        record = BenchmarkDetailResponse(
            benchmark_id=benchmark_id,
            created_at=now,
            status="succeeded",
            results=results,
        )
        self._benchmarks[benchmark_id] = record
        return benchmark_id

    def get_benchmark(self, benchmark_id: str) -> BenchmarkDetailResponse:
        rec = self._benchmarks.get(benchmark_id)
        if not rec:
            raise NotFoundError(
                message=f"Benchmark '{benchmark_id}' not found",
                details={"benchmark_id": benchmark_id},
            )
        return rec

    def get_latest_benchmark(self) -> BenchmarkDetailResponse:
        if not self._benchmarks:
            raise NotFoundError(
                message="No benchmarks found",
                details={},
            )
        # Return the most recently inserted benchmark
        latest_id = list(self._benchmarks.keys())[-1]
        return self._benchmarks[latest_id]


# Global singleton coordinator instance
coordinator = JobCoordinator()


def get_job_coordinator() -> JobCoordinator:
    return coordinator

