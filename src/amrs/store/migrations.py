"""SQLite schema initialization and migrations for AMRS (Section 2.4)."""

from __future__ import annotations

import datetime

from amrs.store.db import Database

CURRENT_SCHEMA_VERSION = 1

MIGRATION_V1 = """
-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);

-- Recovery runs table
CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('queued', 'running', 'succeeded', 'failed', 'cancel_requested', 'cancelled')),
    progress_stage TEXT NOT NULL DEFAULT 'idle',
    progress_pct REAL NOT NULL DEFAULT 0.0,
    scenario_id TEXT,
    arch TEXT NOT NULL,
    original_sha256 TEXT NOT NULL,
    config_json TEXT NOT NULL,
    seed INTEGER NOT NULL,
    verdict TEXT CHECK(verdict IS NULL OR verdict IN ('accepted', 'rolled_back', 'healthy_no_action', 'error')),
    accepted_strategy TEXT,
    error_message TEXT,
    duration_s REAL,
    compute_units_total REAL
);

-- Diagnoses table
CREATE TABLE IF NOT EXISTS diagnoses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    confidence REAL NOT NULL,
    evidence_json TEXT NOT NULL,
    rank INTEGER NOT NULL
);

-- Candidates table
CREATE TABLE IF NOT EXISTS candidates (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    order_idx INTEGER NOT NULL,
    strategy TEXT NOT NULL,
    params_json TEXT NOT NULL,
    cost_units REAL NOT NULL,
    wall_s REAL NOT NULL,
    val_metrics_json TEXT NOT NULL,
    holdout_metrics_json TEXT NOT NULL,
    primary_metric TEXT NOT NULL,
    delta_primary REAL NOT NULL,
    ci_low REAL NOT NULL,
    ci_high REAL NOT NULL,
    retention REAL NOT NULL,
    agreement REAL NOT NULL,
    gate_decision TEXT NOT NULL CHECK(gate_decision IN ('ACCEPT', 'REJECT')),
    gate_reasons_json TEXT NOT NULL,
    artifact_path TEXT
);

-- Monitor events table
CREATE TABLE IF NOT EXISTS monitor_events (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    epoch INTEGER NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('overfit_warning', 'instability_warning', 'trigger', 'action', 'cooldown')),
    details_json TEXT NOT NULL
);

-- Benchmark runs table
CREATE TABLE IF NOT EXISTS benchmark_runs (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    config_json TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('queued', 'running', 'succeeded', 'failed'))
);

-- Benchmark results table
CREATE TABLE IF NOT EXISTS benchmark_results (
    id TEXT PRIMARY KEY,
    benchmark_id TEXT NOT NULL REFERENCES benchmark_runs(id) ON DELETE CASCADE,
    scenario_id TEXT NOT NULL,
    seed INTEGER NOT NULL,
    method TEXT NOT NULL,
    accuracy REAL NOT NULL,
    ece REAL NOT NULL,
    nll REAL NOT NULL,
    retention REAL NOT NULL,
    compute_units REAL NOT NULL,
    wall_s REAL NOT NULL,
    accepted INTEGER,
    notes TEXT
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_verdict ON runs(verdict);
CREATE INDEX IF NOT EXISTS idx_runs_scenario ON runs(scenario_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_run_id ON diagnoses(run_id);
CREATE INDEX IF NOT EXISTS idx_candidates_run_id ON candidates(run_id);
CREATE INDEX IF NOT EXISTS idx_monitor_events_run_id ON monitor_events(run_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_results_benchmark_id ON benchmark_results(benchmark_id);
"""


def apply_migrations(db: Database) -> int:
    """Apply all pending migrations to the database.

    Returns the current applied schema version.
    """
    conn = db.get_connection()
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);"
    )
    row = conn.execute("SELECT MAX(version) AS cur_ver FROM schema_version;").fetchone()
    cur_version = row["cur_ver"] if row and row["cur_ver"] is not None else 0

    if cur_version < 1:
        conn.executescript(MIGRATION_V1)
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        conn.execute(
            "INSERT INTO schema_version (version, applied_at) VALUES (?, ?);",
            (1, now),
        )
        cur_version = 1

    return cur_version
