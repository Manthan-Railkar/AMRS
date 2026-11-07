"""Unit tests for benchmark evidence aggregation, reporting, and target validation (BM-3.1).

Tests:
1. Exact gain-per-compute mathematical formula and units.
2. Zero-compute edge-case handling (finite float, strict JSON compatibility).
3. Statistical aggregation snapshots (mean, sample std ddof=1, no collapsed scores).
4. Missing trial tracking and non-silent error propagation.
5. Deterministic JSON serialization (canonical sorted keys).
6. Markdown and CSV format generation and artifact exports.
7. Target scorecard (M1-M10) evaluation under complete and partial evidence.
8. Traceability guarantees (run IDs, seed counts, config hashes).
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

import numpy as np
import pytest

from amrs.benchmark.report import (
    GAIN_PER_COMPUTE_FORMULA,
    STATISTICAL_DISCLAIMER,
    build_benchmark_report_data,
    calculate_gain_per_compute,
    compute_config_hash,
    export_benchmark_artifacts,
    generate_benchmark_csv,
    generate_benchmark_json,
    generate_benchmark_markdown,
    generate_benchmark_report,
    generate_benchmark_trials_csv,
)
from amrs.schemas import (
    BenchmarkDetailResponse,
    BenchmarkResultItem,
    TrialSpec,
)

# ---------------------------------------------------------------------------
# 1. Gain-per-Compute Formula & Zero-Compute Tests
# ---------------------------------------------------------------------------


def test_gain_per_compute_formula() -> None:
    """Verify gain_per_compute matches exact formula: metric_gain / max(compute_units, eps)."""
    assert "gain_per_compute = metric_gain / max(compute_units, 1e-6)" in GAIN_PER_COMPUTE_FORMULA

    # Standard positive case
    gain = 0.08
    compute = 1600.0
    val = calculate_gain_per_compute(gain, compute)
    assert val == pytest.approx(0.08 / 1600.0, rel=1e-6)
    assert val == pytest.approx(5.0e-5, rel=1e-6)

    # Negative gain (regression)
    neg_gain = -0.04
    neg_val = calculate_gain_per_compute(neg_gain, compute)
    assert neg_val == pytest.approx(-0.04 / 1600.0, rel=1e-6)

    # Zero gain
    zero_val = calculate_gain_per_compute(0.0, compute)
    assert zero_val == 0.0


def test_zero_compute_edge_case() -> None:
    """Verify zero compute units is safely handled without division by zero or non-JSON values."""
    # Zero compute and zero gain -> 0.0
    assert calculate_gain_per_compute(0.0, 0.0) == 0.0

    # Zero compute and negative gain -> 0.0
    assert calculate_gain_per_compute(-0.05, 0.0) == 0.0
    assert calculate_gain_per_compute(-0.05, -10.0) == 0.0

    # Zero compute and positive gain -> metric_gain / 1e-6 (finite positive float)
    pos_val = calculate_gain_per_compute(0.05, 0.0)
    assert np.isfinite(pos_val)
    assert pos_val == pytest.approx(50000.0, rel=1e-5)

    # Strict JSON compliance: ensure no NaN or Infinity is produced
    dumped = json.dumps({"gain_per_compute": pos_val}, allow_nan=False)
    assert "50000" in dumped


# ---------------------------------------------------------------------------
# 2. Aggregation & Report Snapshot Tests
# ---------------------------------------------------------------------------


@pytest.fixture
def sample_trials() -> list[BenchmarkResultItem]:
    """Provide a deterministic 2-scenario x 3-seed x 2-method trial dataset."""
    items = []
    # S1 overfit
    # amrs: seeds 0, 1, 2
    items.append(
        BenchmarkResultItem(
            scenario_id="s1_overfit",
            seed=0,
            method="amrs",
            accuracy=0.82,
            ece=0.06,
            nll=0.50,
            retention=0.96,
            compute_units=1200.0,
            wall_s=15.0,
            accepted=True,
            agreement=0.88,
            notes="Verdict: ACCEPT; Accepted: checkpoint_reversion",
            status="completed",
        )
    )
    items.append(
        BenchmarkResultItem(
            scenario_id="s1_overfit",
            seed=1,
            method="amrs",
            accuracy=0.84,
            ece=0.04,
            nll=0.46,
            retention=0.98,
            compute_units=1300.0,
            wall_s=16.0,
            accepted=True,
            agreement=0.90,
            notes="Verdict: ACCEPT; Accepted: checkpoint_reversion",
            status="completed",
        )
    )
    items.append(
        BenchmarkResultItem(
            scenario_id="s1_overfit",
            seed=2,
            method="amrs",
            accuracy=0.80,
            ece=0.08,
            nll=0.54,
            retention=0.94,
            compute_units=1100.0,
            wall_s=14.0,
            accepted=True,
            agreement=0.86,
            notes="Verdict: ACCEPT; Accepted: checkpoint_reversion",
            status="completed",
        )
    )

    # early_stopping: seeds 0, 1, 2
    items.append(
        BenchmarkResultItem(
            scenario_id="s1_overfit",
            seed=0,
            method="early_stopping",
            accuracy=0.78,
            ece=0.10,
            nll=0.60,
            retention=0.92,
            compute_units=2500.0,
            wall_s=25.0,
            accepted=True,
            agreement=0.84,
            notes="Baseline early_stopping",
            status="completed",
        )
    )
    items.append(
        BenchmarkResultItem(
            scenario_id="s1_overfit",
            seed=1,
            method="early_stopping",
            accuracy=0.80,
            ece=0.08,
            nll=0.56,
            retention=0.94,
            compute_units=2600.0,
            wall_s=26.0,
            accepted=True,
            agreement=0.86,
            notes="Baseline early_stopping",
            status="completed",
        )
    )
    items.append(
        BenchmarkResultItem(
            scenario_id="s1_overfit",
            seed=2,
            method="early_stopping",
            accuracy=0.76,
            ece=0.12,
            nll=0.64,
            retention=0.90,
            compute_units=2400.0,
            wall_s=24.0,
            accepted=True,
            agreement=0.82,
            notes="Baseline early_stopping",
            status="completed",
        )
    )

    return items


def test_aggregation_and_statistical_snapshot(sample_trials: list[BenchmarkResultItem]) -> None:
    """Verify means, sample standard deviations, distinct uncollapsed scores, and units."""
    report = build_benchmark_report_data(
        results=sample_trials,
        benchmark_id="bm_test_snapshot",
        config={"recovery": {"budget": 5000}},
    )

    assert report.benchmark_id == "bm_test_snapshot"
    assert report.is_complete is True
    assert report.completed_trials_count == 6
    assert report.missing_trials_count == 0

    # Locate S1 AMRS summary
    amrs_s1 = next(
        s for s in report.summaries if s.scenario_id == "s1_overfit" and s.method == "amrs"
    )
    assert amrs_s1.seed_count == 3
    assert "LOW_SAMPLE_COUNT (N=3)" in amrs_s1.seed_count_flag

    # Expected mean & sample std (ddof=1)
    # Accuracy: [0.82, 0.84, 0.80] -> mean = 0.82, std = 0.02
    assert amrs_s1.accuracy.mean == pytest.approx(0.82, abs=1e-4)
    assert amrs_s1.accuracy.std == pytest.approx(0.02, abs=1e-4)
    assert amrs_s1.accuracy.unit == "proportion [0, 1]"

    # ECE: [0.06, 0.04, 0.08] -> mean = 0.06, std = 0.02
    assert amrs_s1.ece.mean == pytest.approx(0.06, abs=1e-4)
    assert amrs_s1.ece.std == pytest.approx(0.02, abs=1e-4)
    assert amrs_s1.ece.unit == "proportion [0, 1]"

    # NLL: [0.50, 0.46, 0.54] -> mean = 0.50, std = 0.04
    assert amrs_s1.nll.mean == pytest.approx(0.50, abs=1e-4)
    assert amrs_s1.nll.std == pytest.approx(0.04, abs=1e-4)

    # Retention: [0.96, 0.98, 0.94] -> mean = 0.96, std = 0.02
    assert amrs_s1.retention.mean == pytest.approx(0.96, abs=1e-4)
    assert amrs_s1.retention.std == pytest.approx(0.02, abs=1e-4)

    # Compute units: [1200, 1300, 1100] -> mean = 1200.0, std = 100.0
    assert amrs_s1.compute_units.mean == pytest.approx(1200.0, abs=1e-4)
    assert amrs_s1.compute_units.std == pytest.approx(100.0, abs=1e-4)
    assert amrs_s1.compute_units.unit == "fwd + 3*bwd samples"

    # Wall time: [15, 16, 14] -> mean = 15.0, std = 1.0
    assert amrs_s1.wall_s.mean == pytest.approx(15.0, abs=1e-4)
    assert amrs_s1.wall_s.std == pytest.approx(1.0, abs=1e-4)
    assert amrs_s1.wall_s.unit == "seconds"

    # Check paired difference: AMRS vs early_stopping
    pair = next(
        p
        for p in report.paired_deltas
        if p.scenario_id == "s1_overfit" and p.baseline_method == "early_stopping"
    )
    assert pair.seed_count == 3
    # acc_deltas: (0.82-0.78)=0.04, (0.84-0.80)=0.04, (0.80-0.76)=0.04 -> mean = 0.04, std = 0.0
    assert pair.accuracy_delta.mean == pytest.approx(0.04, abs=1e-4)
    assert pair.accuracy_delta.std == pytest.approx(0.0, abs=1e-4)

    # Compute ratio: [1200/2500, 1300/2600, 1100/2400] = [0.48, 0.50, 0.4583]
    # mean = (0.48 + 0.50 + 0.4583) / 3 = 0.479
    assert pair.compute_ratio.mean == pytest.approx(0.479, abs=1e-2)

    # Statistical disclaimer verification
    assert STATISTICAL_DISCLAIMER in report.statistical_disclaimer
    assert (
        "three seeds must never be described as broad statistical proof"
        in report.statistical_disclaimer
    )


# ---------------------------------------------------------------------------
# 3. Missing-Trial Handling
# ---------------------------------------------------------------------------


def test_missing_trial_handling() -> None:
    """Verify missing trials are never silently dropped or averaged into zero."""
    requested = [
        TrialSpec(
            trial_id="t1", benchmark_id="bm1", scenario_id="s1_overfit", seed=0, method="amrs"
        ),
        TrialSpec(
            trial_id="t2", benchmark_id="bm1", scenario_id="s1_overfit", seed=1, method="amrs"
        ),
        TrialSpec(
            trial_id="t3",
            benchmark_id="bm1",
            scenario_id="s1_overfit",
            seed=0,
            method="early_stopping",
        ),
        TrialSpec(
            trial_id="t4",
            benchmark_id="bm1",
            scenario_id="s1_overfit",
            seed=1,
            method="early_stopping",
        ),
    ]

    # Only t1 succeeds; t2 fails with error; t3 and t4 never ran (pending)
    results = [
        BenchmarkResultItem(
            scenario_id="s1_overfit",
            seed=0,
            method="amrs",
            accuracy=0.82,
            ece=0.06,
            nll=0.50,
            retention=0.95,
            compute_units=1200.0,
            wall_s=15.0,
            status="completed",
        ),
        BenchmarkResultItem(
            scenario_id="s1_overfit",
            seed=1,
            method="amrs",
            accuracy=0.0,
            ece=0.0,
            nll=0.0,
            retention=0.0,
            compute_units=0.0,
            wall_s=0.0,
            status="failed",
            error_message="CUDA out of memory",
        ),
    ]

    report = build_benchmark_report_data(
        results=results,
        requested_trials=requested,
        benchmark_id="bm1",
    )

    assert report.is_complete is False
    assert report.requested_trials_count == 4
    assert report.completed_trials_count == 1
    assert report.failed_trials_count == 1
    assert report.missing_trials_count == 3  # 1 failed + 2 pending

    # Completed summary has N=1, not N=2 (the failed run was not averaged in as 0.0 accuracy)
    amrs_summary = next(s for s in report.summaries if s.method == "amrs")
    assert amrs_summary.seed_count == 1
    assert amrs_summary.accuracy.mean == 0.82
    assert amrs_summary.accuracy.std == 0.0  # N=1 -> std is 0.0

    # Ensure missing trials list contains explicit records
    statuses = {m.trial_id: m.status for m in report.missing_trials}
    assert statuses.get("t3") == "pending"
    assert statuses.get("t4") == "pending"


# ---------------------------------------------------------------------------
# 4. Deterministic Serialization & Config Hashing
# ---------------------------------------------------------------------------


def test_deterministic_serialization(sample_trials: list[BenchmarkResultItem]) -> None:
    """Verify bit-for-bit reproducible JSON serialization with sorted keys."""
    config1 = {"b": 2, "a": 1, "c": {"z": 10, "y": 20}}
    config2 = {"c": {"y": 20, "z": 10}, "a": 1, "b": 2}

    hash1 = compute_config_hash(config1)
    hash2 = compute_config_hash(config2)
    assert hash1 == hash2

    report1 = build_benchmark_report_data(results=sample_trials, config=config1)
    report2 = build_benchmark_report_data(results=sample_trials, config=config2)

    # Force identical timestamps for serialization comparison
    report1.created_at = "2026-11-07T00:00:00Z"
    report2.created_at = "2026-11-07T00:00:00Z"
    report1.environment["timestamp_utc"] = "2026-11-07T00:00:00Z"
    report2.environment["timestamp_utc"] = "2026-11-07T00:00:00Z"

    json1 = generate_benchmark_json(report1)
    json2 = generate_benchmark_json(report2)
    assert json1 == json2


# ---------------------------------------------------------------------------
# 5. Markdown and CSV Generation & Artifact Export
# ---------------------------------------------------------------------------


def test_markdown_and_csv_generation(
    sample_trials: list[BenchmarkResultItem], tmp_path: Path
) -> None:
    """Verify markdown report rendering, CSV generation, and file persistence."""
    report = build_benchmark_report_data(
        results=sample_trials,
        benchmark_id="bm_export_test",
        config={"seed": 42},
    )

    # 1. Markdown generation
    md = generate_benchmark_markdown(report)
    assert "# AMRS Benchmark Evidence & Target Validation Report" in md
    assert "bm_export_test" in md
    assert "Targets M1–M10 Scorecard" in md
    assert "gain_per_compute = metric_gain / max(compute_units, 1e-6)" in md
    assert "s1_overfit" in md
    assert "early_stopping" in md

    # 2. CSV summary generation
    csv_str = generate_benchmark_csv(report)
    reader = csv.reader(csv_str.strip().split("\n"))
    header = next(reader)
    assert "accuracy_mean" in header
    assert "compute_units_mean" in header
    rows = list(reader)
    assert len(rows) == 2  # s1_overfit/amrs, s1_overfit/early_stopping

    # 3. Raw trials CSV generation
    trials_csv = generate_benchmark_trials_csv(report)
    t_reader = csv.reader(trials_csv.strip().split("\n"))
    t_header = next(t_reader)
    assert "trial_id" in t_header
    assert "accuracy" in t_header
    t_rows = list(t_reader)
    assert len(t_rows) == 6

    # 4. Export artifacts to disk
    exported = export_benchmark_artifacts(report, output_dir=tmp_path)
    assert exported["json"].exists()
    assert exported["markdown"].exists()
    assert exported["csv"].exists()
    assert exported["trials_csv"].exists()

    loaded_json = json.loads(exported["json"].read_text(encoding="utf-8"))
    assert loaded_json["benchmark_id"] == "bm_export_test"


# ---------------------------------------------------------------------------
# 6. Target Scorecard (M1–M10) Evaluation
# ---------------------------------------------------------------------------


def test_targets_m1_m10_partial_evidence(sample_trials: list[BenchmarkResultItem]) -> None:
    """Verify that partial / tiny runs state INSUFFICIENT_EVIDENCE honestly."""
    report = build_benchmark_report_data(results=sample_trials)
    target_map = {t.id: t for t in report.targets}

    # All M1-M10 must be evaluated
    for idx in range(1, 11):
        assert f"M{idx}" in target_map

    # S1 only was tested (1 of 5 failure scenarios) -> M1 must be INSUFFICIENT_EVIDENCE
    assert target_map["M1"].status == "INSUFFICIENT_EVIDENCE"
    assert "1/5 failure scenarios" in target_map["M1"].details

    # Only 3 AMRS runs total (< 18 required) -> M2 must be INSUFFICIENT_EVIDENCE
    assert target_map["M2"].status == "INSUFFICIENT_EVIDENCE"
    assert "18 runs required" in target_map["M2"].details

    # S6 healthy was not tested -> M3 must be INSUFFICIENT_EVIDENCE
    assert target_map["M3"].status == "INSUFFICIENT_EVIDENCE"

    # Full retrain was not tested -> M4 must be INSUFFICIENT_EVIDENCE
    assert target_map["M4"].status == "INSUFFICIENT_EVIDENCE"

    # M6 retention: mean retention is 0.96 (>= 0.95) -> PASS
    assert target_map["M6"].status == "PASS"

    # M8 responsiveness: S1 duration is 15s (<= 900s) -> PASS
    assert target_map["M8"].status == "PASS"

    # M9 engineering quality: CI coverage enforced -> PASS
    assert target_map["M9"].status == "PASS"


def test_targets_m1_m10_full_matrix_simulation() -> None:
    """Verify target evaluation when full 18-run scenario zoo is supplied."""
    all_scenarios = [
        "s1_overfit",
        "s2_miscalibration",
        "s3_bn_drift",
        "s4_instability",
        "s5_degraded_head",
        "s6_healthy",
    ]
    trials: list[BenchmarkResultItem] = []

    for sc in all_scenarios:
        for seed in [0, 1, 2]:
            is_s6 = sc == "s6_healthy"
            # AMRS run
            trials.append(
                BenchmarkResultItem(
                    scenario_id=sc,
                    seed=seed,
                    method="amrs",
                    accuracy=0.85 if not is_s6 else 0.92,
                    ece=0.04,
                    nll=0.45,
                    retention=0.98,
                    compute_units=1500.0,
                    wall_s=20.0,
                    accepted=not is_s6,  # S6 is not accepted (healthy, no action)
                    notes="Verdict: ACCEPT" if not is_s6 else "Verdict: healthy_no_action",
                    status="completed",
                )
            )
            # full_retrain run
            trials.append(
                BenchmarkResultItem(
                    scenario_id=sc,
                    seed=seed,
                    method="full_retrain",
                    accuracy=0.84 if not is_s6 else 0.92,
                    ece=0.05,
                    nll=0.48,
                    retention=0.97,
                    compute_units=15000.0,
                    wall_s=180.0,
                    accepted=True,
                    status="completed",
                )
            )

    report = build_benchmark_report_data(results=trials)
    target_map = {t.id: t for t in report.targets}

    # All 5 failure scenarios beat original -> M1 PASS
    assert target_map["M1"].status == "PASS"

    # 18 AMRS runs with 0 harmful acceptances -> M2 PASS
    assert target_map["M2"].status == "PASS"

    # S6 3 of 3 seeds had no harmful changes -> M3 PASS
    assert target_map["M3"].status == "PASS"

    # AMRS 1500 units vs retrain 15000 units -> M4 PASS
    assert target_map["M4"].status == "PASS"

    # Retention 0.98 >= 0.95 -> M6 PASS
    assert target_map["M6"].status == "PASS"

    # Responsiveness 20s <= 900s -> M8 PASS
    assert target_map["M8"].status == "PASS"


# ---------------------------------------------------------------------------
# 7. High-Level generate_benchmark_report API
# ---------------------------------------------------------------------------


def test_high_level_generate_benchmark_report(tmp_path: Path) -> None:
    """Verify generate_benchmark_report accepts BenchmarkDetailResponse and auto-exports."""
    detail = BenchmarkDetailResponse(
        benchmark_id="bm_hl_test",
        created_at="2026-11-07T12:00:00Z",
        status="succeeded",
        results=[
            BenchmarkResultItem(
                scenario_id="s1_overfit",
                seed=0,
                method="amrs",
                accuracy=0.85,
                ece=0.03,
                nll=0.40,
                retention=0.97,
                compute_units=1000.0,
                wall_s=12.0,
                status="completed",
            )
        ],
    )

    report = generate_benchmark_report(
        benchmark=detail,
        output_dir=tmp_path,
        config={"profile": "tiny"},
    )

    assert report.benchmark_id == "bm_hl_test"
    assert (tmp_path / "benchmark.json").exists()
    assert (tmp_path / "benchmark.md").exists()
    assert (tmp_path / "benchmark.csv").exists()
    assert (tmp_path / "benchmark_trials.csv").exists()
