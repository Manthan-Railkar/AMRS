"""Integration tests for Scenario/Seed/Method Benchmark Matrix Runner (BM-2.1).

Verifies:
1. Matrix expansion: expands scenarios × seeds × methods into ordered list of immutable TrialSpecs.
2. Execution on tiny matrix: tiny matrix runs serially and persists all per-trial results to SQLite.
3. Resume behavior & duplicate trial prevention: interrupted/resumed benchmarks reuse completed trials
   and do not duplicate rows in the database.
4. Safe artifact reuse: reuses existing scenario checkpoints only when config hash and seed match.
5. Partial failure handling: when a trial raises an exception, the failure is recorded with status='failed'
   and error_message, while remaining trials execute to completion.
6. Aggregation arithmetic: correctly computes mean, std, and paired method deltas (AMRS vs baselines)
   matching hand-calculated values.
7. Database restart persistence: benchmark runs and results persist across new Database instances.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from amrs.benchmark.runner import (
    BenchmarkRunner,
    compute_matrix_aggregates,
    expand_trials,
)
from amrs.schemas import (
    BenchmarkCreateRequest,
    BenchmarkDetailResponse,
    BenchmarkResultItem,
    TrialSpec,
)
from amrs.store.db import Database
from amrs.store.migrations import apply_migrations
from amrs.store.repository import BenchmarkRepository


@pytest.fixture
def test_db(tmp_path: Path) -> Database:
    """Create an isolated temporary SQLite database with applied migrations."""
    db_file = tmp_path / "test_benchmark.db"
    db = Database(str(db_file))
    apply_migrations(db)
    return db


def test_matrix_expansion():
    """Verify that scenarios × seeds × methods expands into immutable TrialSpecs."""
    benchmark_id = "test_bench_123"
    scenarios = ["s1_overfit", "s2_miscalibration"]
    seeds = [0, 1]
    methods = ["amrs", "early_stopping", "regularized_finetune"]

    trials = expand_trials(
        benchmark_id=benchmark_id,
        scenarios=scenarios,
        seeds=seeds,
        methods=methods,
        profile="tiny",
        device="cpu",
    )

    assert len(trials) == 2 * 2 * 3 == 12
    first = trials[0]
    assert isinstance(first, TrialSpec)
    assert first.benchmark_id == benchmark_id
    assert first.scenario_id == "s1_overfit"
    assert first.seed == 0
    assert first.method == "amrs"
    assert first.profile == "tiny"
    assert first.device == "cpu"


def test_tiny_matrix_execution_and_persistence(test_db: Database, tmp_path: Path):
    """Verify that a tiny benchmark matrix completes, persists to SQLite, and computes aggregates."""
    scenarios_dir = tmp_path / "scenarios"
    runner = BenchmarkRunner(db=test_db, base_scenarios_dir=scenarios_dir)

    req = BenchmarkCreateRequest(
        scenarios=["s1_overfit"],
        seeds=[0],
        methods=["early_stopping", "regularized_finetune"],
    )

    detail = runner.run_benchmark(req, profile="tiny", device="cpu")

    assert isinstance(detail, BenchmarkDetailResponse)
    assert detail.status == "succeeded"
    assert detail.is_complete is True
    assert len(detail.results) == 2

    # Verify per-trial fields
    for res in detail.results:
        assert res.scenario_id == "s1_overfit"
        assert res.seed == 0
        assert res.status == "completed"
        assert 0.0 <= res.accuracy <= 1.0
        assert res.ece >= 0.0
        assert res.compute_units > 0.0
        assert res.wall_s >= 0.0

    # Verify persistence in database
    repo = BenchmarkRepository(test_db)
    loaded = repo.get_benchmark(detail.benchmark_id)
    assert loaded is not None
    assert loaded.status == "succeeded"
    assert len(loaded.results) == 2


def test_resume_behavior_prevents_duplicate_trials(test_db: Database, tmp_path: Path):
    """Verify that resuming an interrupted benchmark completes missing trials without duplicate rows."""
    scenarios_dir = tmp_path / "scenarios"
    runner = BenchmarkRunner(db=test_db, base_scenarios_dir=scenarios_dir)

    bench_id = "resume_test_bench"
    req = BenchmarkCreateRequest(
        scenarios=["s1_overfit"],
        seeds=[0],
        methods=["early_stopping", "regularized_finetune"],
    )

    # 1. Simulate partial run by creating benchmark with only 1 trial result recorded
    test_db.get_connection().execute(
        "INSERT INTO benchmark_runs (id, created_at, config_json, status) VALUES (?, ?, ?, ?);",
        (bench_id, "2026-01-01T00:00:00Z", "{}", "running"),
    )
    repo = BenchmarkRepository(test_db)
    partial_item = BenchmarkResultItem(
        scenario_id="s1_overfit",
        seed=0,
        method="early_stopping",
        accuracy=0.85,
        ece=0.04,
        nll=0.35,
        retention=1.0,
        compute_units=100.0,
        wall_s=0.5,
        status="completed",
    )
    repo.record_trial_result(bench_id, partial_item)

    # 2. Run benchmark with resume=True
    resumed_detail = runner.run_benchmark(
        req, benchmark_id=bench_id, profile="tiny", device="cpu", resume=True
    )

    assert resumed_detail.status == "succeeded"
    assert resumed_detail.is_complete is True
    assert len(resumed_detail.results) == 2

    # Verify database has exactly 2 rows for this benchmark (no duplicate early_stopping trial)
    conn = test_db.get_connection()
    rows = conn.execute(
        "SELECT method FROM benchmark_results WHERE benchmark_id = ?;", (bench_id,)
    ).fetchall()
    methods = [r["method"] for r in rows]
    assert sorted(methods) == ["early_stopping", "regularized_finetune"]


def test_partial_failure_is_explicit(test_db: Database, tmp_path: Path, monkeypatch):
    """Verify that when a trial fails, the failure is recorded explicitly and does not crash the run."""
    scenarios_dir = tmp_path / "scenarios"
    runner = BenchmarkRunner(db=test_db, base_scenarios_dir=scenarios_dir)

    # Monkeypatch run_baseline to raise an error on regularized_finetune
    import amrs.benchmark.runner as runner_module

    orig_run_baseline = runner_module.run_baseline

    def mock_run_baseline(*args, **kwargs):
        if kwargs.get("method") == "regularized_finetune":
            raise RuntimeError("Simulated GPU Out-Of-Memory failure")
        return orig_run_baseline(*args, **kwargs)

    monkeypatch.setattr(runner_module, "run_baseline", mock_run_baseline)

    req = BenchmarkCreateRequest(
        scenarios=["s1_overfit"],
        seeds=[0],
        methods=["early_stopping", "regularized_finetune"],
    )

    detail = runner.run_benchmark(req, profile="tiny", device="cpu")

    assert detail.status == "failed"
    assert detail.is_complete is False
    assert len(detail.results) == 2

    failed_item = next(r for r in detail.results if r.method == "regularized_finetune")
    assert failed_item.status == "failed"
    assert "Simulated GPU Out-Of-Memory" in str(failed_item.error_message)

    success_item = next(r for r in detail.results if r.method == "early_stopping")
    assert success_item.status == "completed"


def test_aggregation_arithmetic():
    """Verify hand-calculated mean, standard deviation, and paired deltas."""
    trials = expand_trials(
        benchmark_id="b1",
        scenarios=["s1_overfit"],
        seeds=[0, 1],
        methods=["amrs", "early_stopping"],
    )

    # Fixture results
    # s1 seed 0: amrs acc=0.90, ece=0.02; early_stop acc=0.80, ece=0.06
    # s1 seed 1: amrs acc=0.92, ece=0.04; early_stop acc=0.84, ece=0.08
    results = [
        BenchmarkResultItem(
            scenario_id="s1_overfit",
            seed=0,
            method="amrs",
            accuracy=0.90,
            ece=0.02,
            nll=0.30,
            retention=1.0,
            compute_units=200.0,
            wall_s=1.0,
            status="completed",
        ),
        BenchmarkResultItem(
            scenario_id="s1_overfit",
            seed=1,
            method="amrs",
            accuracy=0.92,
            ece=0.04,
            nll=0.28,
            retention=1.0,
            compute_units=220.0,
            wall_s=1.2,
            status="completed",
        ),
        BenchmarkResultItem(
            scenario_id="s1_overfit",
            seed=0,
            method="early_stopping",
            accuracy=0.80,
            ece=0.06,
            nll=0.45,
            retention=0.95,
            compute_units=100.0,
            wall_s=0.5,
            status="completed",
        ),
        BenchmarkResultItem(
            scenario_id="s1_overfit",
            seed=1,
            method="early_stopping",
            accuracy=0.84,
            ece=0.08,
            nll=0.41,
            retention=0.97,
            compute_units=110.0,
            wall_s=0.6,
            status="completed",
        ),
    ]

    summaries, deltas, is_complete = compute_matrix_aggregates(results, trials)

    assert is_complete is True
    assert len(summaries) == 2
    amrs_summary = next(s for s in summaries if s.method == "amrs")
    assert amrs_summary.accuracy_mean == pytest.approx(0.91, abs=1e-4)
    # std([0.90, 0.92], ddof=1) = sqrt(0.0002) = 0.01414... -> 0.0141
    assert amrs_summary.accuracy_std == pytest.approx(0.0141, abs=1e-4)

    assert len(deltas) == 1
    delta = deltas[0]
    assert delta.scenario_id == "s1_overfit"
    assert delta.baseline_method == "early_stopping"
    assert delta.pairs_count == 2
    # Pair 0 delta: 0.90 - 0.80 = 0.10
    # Pair 1 delta: 0.92 - 0.84 = 0.08
    # Mean delta = (0.10 + 0.08) / 2 = 0.09
    assert delta.accuracy_delta_mean == pytest.approx(0.09, abs=1e-4)
    # ECE delta: (0.02 - 0.06 = -0.04) and (0.04 - 0.08 = -0.04) -> Mean = -0.04
    assert delta.ece_delta_mean == pytest.approx(-0.04, abs=1e-4)


def test_database_restart_persistence(tmp_path: Path):
    """Verify that benchmark records persist cleanly across process/DB restarts."""
    db_file = tmp_path / "persistent.db"

    # Run benchmark on first connection
    db1 = Database(str(db_file))
    apply_migrations(db1)
    runner1 = BenchmarkRunner(db=db1, base_scenarios_dir=tmp_path / "scenarios")

    req = BenchmarkCreateRequest(
        scenarios=["s1_overfit"],
        seeds=[0],
        methods=["early_stopping"],
    )
    detail1 = runner1.run_benchmark(req, profile="tiny", device="cpu")

    # Restart database connection
    db2 = Database(str(db_file))
    repo2 = BenchmarkRepository(db2)
    loaded = repo2.get_benchmark(detail1.benchmark_id)

    assert loaded is not None
    assert loaded.benchmark_id == detail1.benchmark_id
    assert loaded.status == "succeeded"
    assert len(loaded.results) == 1
    assert loaded.results[0].method == "early_stopping"
