"""Repository implementations for SQLite persistence of AMRS runs, diagnoses, candidates, and benchmarks."""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any

from amrs.schemas import (
    BenchmarkDetailResponse,
    BenchmarkResultItem,
    CandidateSummary,
    DiagnosisEvidence,
    DiagnosisItem,
    MonitorEventItem,
    RunDetailResponse,
    RunSummary,
)
from amrs.store.db import Database

logger = logging.getLogger("amrs.store")


def _dump_json(obj: Any) -> str:
    """Deterministically serialize Python objects to JSON string with sorted keys."""
    return json.dumps(obj, sort_keys=True, default=str)


def _safe_load_json(raw: str | None, default_val: Any = None) -> Any:
    """Safely parse JSON string, falling back to default on corrupted or malformed data."""
    if not raw:
        return default_val if default_val is not None else {}
    try:
        return json.loads(raw)
    except Exception as exc:
        logger.warning("Corrupted or malformed JSON in database: %s", exc)
        return default_val if default_val is not None else {}


class RunRepository:
    """Repository managing lifecycle and persistence for recovery runs, diagnoses, and candidates."""

    def __init__(self, db: Database) -> None:
        self.db = db

    def create_run(self, run: RunDetailResponse) -> None:
        """Insert a newly enqueued or initialized run record."""
        with self.db.transaction() as conn:
            conn.execute(
                """
                INSERT INTO runs (
                    id, created_at, status, scenario_id, arch,
                    original_sha256, config_json, seed, verdict,
                    accepted_strategy, error_message, duration_s, compute_units_total
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    run.id,
                    run.created_at,
                    run.status,
                    run.scenario_id,
                    run.arch,
                    run.original_sha256,
                    _dump_json(run.config_json),
                    run.seed,
                    run.verdict,
                    run.accepted_strategy,
                    run.error_message,
                    run.duration_s,
                    run.compute_units_total,
                ),
            )
            for diag in run.diagnoses:
                self._insert_diagnosis(conn, run.id, diag)
            for cand in run.candidates:
                self._insert_candidate(conn, cand)

    def _insert_diagnosis(self, conn: Any, run_id: str, diag: DiagnosisItem) -> None:
        conn.execute(
            """
            INSERT INTO diagnoses (run_id, label, confidence, evidence_json, rank)
            VALUES (?, ?, ?, ?, ?);
            """,
            (
                run_id,
                diag.label,
                diag.confidence,
                _dump_json(diag.evidence.model_dump()),
                diag.rank,
            ),
        )

    def _insert_candidate(self, conn: Any, cand: CandidateSummary) -> None:
        conn.execute(
            """
            INSERT INTO candidates (
                id, run_id, order_idx, strategy, params_json,
                cost_units, wall_s, val_metrics_json, holdout_metrics_json,
                primary_metric, delta_primary, ci_low, ci_high,
                retention, agreement, gate_decision, gate_reasons_json, artifact_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                cand.id,
                cand.run_id,
                cand.order_idx,
                cand.strategy,
                _dump_json(cand.params),
                cand.cost_units,
                cand.wall_s,
                _dump_json({}),  # val_metrics
                _dump_json({}),  # holdout_metrics
                cand.primary_metric,
                cand.delta_primary,
                cand.ci_low,
                cand.ci_high,
                cand.retention,
                cand.agreement,
                cand.gate_decision,
                _dump_json(cand.gate_reasons),
                cand.artifact_path,
            ),
        )

    def add_diagnosis(self, run_id: str, diag: DiagnosisItem) -> None:
        """Add a diagnosis item to an existing run."""
        with self.db.transaction() as conn:
            self._insert_diagnosis(conn, run_id, diag)

    def add_candidate(self, cand: CandidateSummary) -> None:
        """Add an evaluated candidate summary to an existing run."""
        with self.db.transaction() as conn:
            self._insert_candidate(conn, cand)

    def update_run_status(
        self,
        run_id: str,
        status: str,
        verdict: str | None = None,
        accepted_strategy: str | None = None,
        error_message: str | None = None,
        duration_s: float | None = None,
        compute_units_total: float | None = None,
    ) -> None:
        """Update terminal outcome or progress status of a run."""
        with self.db.transaction() as conn:
            conn.execute(
                """
                UPDATE runs
                SET status = ?,
                    verdict = COALESCE(?, verdict),
                    accepted_strategy = COALESCE(?, accepted_strategy),
                    error_message = COALESCE(?, error_message),
                    duration_s = COALESCE(?, duration_s),
                    compute_units_total = COALESCE(?, compute_units_total)
                WHERE id = ?;
                """,
                (
                    status,
                    verdict,
                    accepted_strategy,
                    error_message,
                    duration_s,
                    compute_units_total,
                    run_id,
                ),
            )

    def get_run(self, run_id: str) -> RunDetailResponse | None:
        """Fetch full run detail including its diagnoses and candidates."""
        conn = self.db.get_connection()
        row = conn.execute("SELECT * FROM runs WHERE id = ?;", (run_id,)).fetchone()
        if not row:
            return None

        # Fetch diagnoses ordered by rank
        diag_rows = conn.execute(
            "SELECT * FROM diagnoses WHERE run_id = ? ORDER BY rank ASC;",
            (run_id,),
        ).fetchall()
        diagnoses: list[DiagnosisItem] = []
        for d in diag_rows:
            ev_dict = _safe_load_json(d["evidence_json"], {})
            diagnoses.append(
                DiagnosisItem(
                    label=d["label"],
                    confidence=d["confidence"],
                    rank=d["rank"],
                    evidence=DiagnosisEvidence(**ev_dict) if ev_dict else DiagnosisEvidence(),
                )
            )

        # Fetch candidates ordered by execution sequence
        cand_rows = conn.execute(
            "SELECT * FROM candidates WHERE run_id = ? ORDER BY order_idx ASC;",
            (run_id,),
        ).fetchall()
        candidates: list[CandidateSummary] = []
        for c in cand_rows:
            params = _safe_load_json(c["params_json"], {})
            reasons = _safe_load_json(c["gate_reasons_json"], [])
            candidates.append(
                CandidateSummary(
                    id=c["id"],
                    run_id=c["run_id"],
                    order_idx=c["order_idx"],
                    strategy=c["strategy"],
                    params=params,
                    cost_units=c["cost_units"],
                    wall_s=c["wall_s"],
                    primary_metric=c["primary_metric"],
                    delta_primary=c["delta_primary"],
                    ci_low=c["ci_low"],
                    ci_high=c["ci_high"],
                    retention=c["retention"],
                    agreement=c["agreement"],
                    gate_decision=c["gate_decision"],
                    gate_reasons=reasons if isinstance(reasons, list) else [],
                    artifact_path=c["artifact_path"],
                )
            )

        config_data = _safe_load_json(row["config_json"], {})

        return RunDetailResponse(
            id=row["id"],
            created_at=row["created_at"],
            status=row["status"],
            progress_stage="completed" if row["status"] in ("succeeded", "failed", "cancelled") else "running",
            progress_pct=100.0 if row["status"] in ("succeeded", "failed", "cancelled") else 50.0,
            scenario_id=row["scenario_id"],
            arch=row["arch"],
            original_sha256=row["original_sha256"],
            config_json=config_data,
            seed=row["seed"],
            verdict=row["verdict"],
            accepted_strategy=row["accepted_strategy"],
            error_message=row["error_message"],
            duration_s=row["duration_s"],
            compute_units_total=row["compute_units_total"],
            diagnoses=diagnoses,
            candidates=candidates,
        )

    def list_runs(
        self,
        verdict: str | None = None,
        scenario_id: str | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[RunSummary], int]:
        """Query paginated runs with filtering."""
        conn = self.db.get_connection()
        clauses: list[str] = []
        params: list[Any] = []

        if verdict:
            clauses.append("verdict = ?")
            params.append(verdict)
        if scenario_id:
            clauses.append("scenario_id = ?")
            params.append(scenario_id)
        if status:
            clauses.append("status = ?")
            params.append(status)

        where_clause = f"WHERE {' AND '.join(clauses)}" if clauses else ""

        # Total count query
        count_query = f"SELECT COUNT(*) AS total FROM runs {where_clause};"
        total = conn.execute(count_query, params).fetchone()["total"]

        # Page query
        data_query = f"""
            SELECT id, created_at, status, scenario_id, arch, original_sha256,
                   verdict, accepted_strategy, duration_s, compute_units_total
            FROM runs
            {where_clause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?;
        """
        page_params = list(params) + [limit, offset]
        rows = conn.execute(data_query, page_params).fetchall()

        summaries = [
            RunSummary(
                id=r["id"],
                created_at=r["created_at"],
                status=r["status"],
                scenario_id=r["scenario_id"],
                arch=r["arch"],
                original_sha256=r["original_sha256"],
                verdict=r["verdict"],
                accepted_strategy=r["accepted_strategy"],
                duration_s=r["duration_s"],
                compute_units_total=r["compute_units_total"],
            )
            for r in rows
        ]
        return summaries, total


class MonitorEventRepository:
    """Repository managing live training monitor events."""

    def __init__(self, db: Database) -> None:
        self.db = db

    def add_event(self, run_id: str, event: MonitorEventItem) -> str:
        event_id = str(uuid.uuid4())
        with self.db.transaction() as conn:
            conn.execute(
                """
                INSERT INTO monitor_events (id, run_id, epoch, kind, details_json)
                VALUES (?, ?, ?, ?, ?);
                """,
                (event_id, run_id, event.epoch, event.kind, _dump_json(event.details)),
            )
        return event_id

    def list_events(self, run_id: str) -> list[MonitorEventItem]:
        conn = self.db.get_connection()
        rows = conn.execute(
            "SELECT epoch, kind, details_json FROM monitor_events WHERE run_id = ? ORDER BY epoch ASC;",
            (run_id,),
        ).fetchall()
        return [
            MonitorEventItem(
                epoch=r["epoch"],
                kind=r["kind"],
                details=_safe_load_json(r["details_json"], {}),
            )
            for r in rows
        ]


class BenchmarkRepository:
    """Repository managing comparative benchmark runs and per-trial results."""

    def __init__(self, db: Database) -> None:
        self.db = db

    def create_benchmark(
        self,
        benchmark_id: str,
        created_at: str,
        config: dict[str, Any],
        status: str,
        results: list[BenchmarkResultItem],
    ) -> None:
        with self.db.transaction() as conn:
            conn.execute(
                """
                INSERT INTO benchmark_runs (id, created_at, config_json, status)
                VALUES (?, ?, ?, ?);
                """,
                (benchmark_id, created_at, _dump_json(config), status),
            )
            for res in results:
                res_id = str(uuid.uuid4())
                accepted_val = 1 if res.accepted is True else (0 if res.accepted is False else None)
                conn.execute(
                    """
                    INSERT INTO benchmark_results (
                        id, benchmark_id, scenario_id, seed, method,
                        accuracy, ece, nll, retention, compute_units,
                        wall_s, accepted, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        res_id,
                        benchmark_id,
                        res.scenario_id,
                        res.seed,
                        res.method,
                        res.accuracy,
                        res.ece,
                        res.nll,
                        res.retention,
                        res.compute_units,
                        res.wall_s,
                        accepted_val,
                        res.notes,
                    ),
                )

    def get_benchmark(self, benchmark_id: str) -> BenchmarkDetailResponse | None:
        conn = self.db.get_connection()
        row = conn.execute(
            "SELECT * FROM benchmark_runs WHERE id = ?;", (benchmark_id,)
        ).fetchone()
        if not row:
            return None

        res_rows = conn.execute(
            "SELECT * FROM benchmark_results WHERE benchmark_id = ? ORDER BY scenario_id, seed, method;",
            (benchmark_id,),
        ).fetchall()

        results = [
            BenchmarkResultItem(
                scenario_id=r["scenario_id"],
                seed=r["seed"],
                method=r["method"],
                accuracy=r["accuracy"],
                ece=r["ece"],
                nll=r["nll"],
                retention=r["retention"],
                compute_units=r["compute_units"],
                wall_s=r["wall_s"],
                accepted=bool(r["accepted"]) if r["accepted"] is not None else None,
                notes=r["notes"],
            )
            for r in res_rows
        ]

        return BenchmarkDetailResponse(
            benchmark_id=row["id"],
            created_at=row["created_at"],
            status=row["status"],
            results=results,
        )

    def get_latest_benchmark(self) -> BenchmarkDetailResponse | None:
        conn = self.db.get_connection()
        row = conn.execute(
            "SELECT id FROM benchmark_runs ORDER BY created_at DESC LIMIT 1;"
        ).fetchone()
        if not row:
            return None
        return self.get_benchmark(row["id"])

