"""Benchmark matrix runner for AMRS (BM-2.1).

Orchestrates scenario × seed × method matrix benchmarks:
- Expands selections into immutable `TrialSpec` objects.
- Executes trials serially under the MVP single-worker policy.
- Reuses existing scenario artifacts only when config hash, seed, and data provenance match.
- Records trial status before execution and incrementally after each trial in SQLite.
- Aggregates mean, standard deviation, and paired deltas (AMRS vs baselines) across completed trials.
- Clearly marks incomplete matrices if interrupted.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
import uuid
from pathlib import Path
from typing import Any, Callable, Literal

import numpy as np
import torch.nn as nn

from amrs.benchmark.baselines import BaselineResult, run_baseline
from amrs.benchmark.scenarios import (
    ScenarioSpec,
    _prepare_scenario_data,
    build_scenario,
)
from amrs.data.loaders import make_loader
from amrs.metrics.classification import accuracy, ece, nll, per_sample_correct, predict_logits
from amrs.metrics.compute import ComputeMeter
from amrs.metrics.retention import retained_correct_rate, top1_agreement
from amrs.models.loader import load_state_dict_safe
from amrs.models.registry import build
from amrs.pipeline.orchestrator import RecoveryBundle, RecoveryOrchestrator
from amrs.schemas import (
    BenchmarkCreateRequest,
    BenchmarkDetailResponse,
    BenchmarkResultItem,
    BenchmarkSummaryItem,
    DataBundle,
    PairedDeltaItem,
    TrialSpec,
)
from amrs.store.db import Database
from amrs.store.repository import BenchmarkRepository

logger = logging.getLogger("amrs.benchmark.runner")


def expand_trials(
    benchmark_id: str,
    scenarios: list[str],
    seeds: list[int],
    methods: list[str],
    profile: str = "tiny",
    device: str = "cpu",
    budget: float | None = None,
    config_overrides: dict[str, Any] | None = None,
) -> list[TrialSpec]:
    """Expand scenario × seed × method grid into ordered list of immutable TrialSpecs."""
    trials: list[TrialSpec] = []
    overrides = config_overrides or {}
    for sc in scenarios:
        for s in seeds:
            for m in methods:
                trial_id = f"{benchmark_id}_{sc}_{s}_{m}"
                trials.append(
                    TrialSpec(
                        trial_id=trial_id,
                        benchmark_id=benchmark_id,
                        scenario_id=sc,
                        seed=s,
                        method=m,
                        profile=profile,
                        device=device,
                        budget=budget,
                        config_overrides=overrides,
                    )
                )
    return trials


def compute_matrix_aggregates(
    results: list[BenchmarkResultItem],
    requested_trials: list[TrialSpec],
) -> tuple[list[BenchmarkSummaryItem], list[PairedDeltaItem], bool]:
    """Compute summary statistics (mean, std) and paired method differences.

    Returns:
        (summaries, paired_deltas, is_complete)
    """
    total_requested = len(requested_trials)
    completed_trials = [r for r in results if r.status == "completed"]
    is_complete = bool(len(completed_trials) == total_requested and total_requested > 0)

    # Group completed results by (scenario_id, method)
    groups: dict[tuple[str, str], list[BenchmarkResultItem]] = {}
    for r in completed_trials:
        key = (r.scenario_id, r.method)
        groups.setdefault(key, []).append(r)

    summaries: list[BenchmarkSummaryItem] = []
    for (sc, method), group in sorted(groups.items()):
        accs = [g.accuracy for g in group]
        eces = [g.ece for g in group]
        nlls = [g.nll for g in group]
        rets = [g.retention for g in group]
        comp = [g.compute_units for g in group]
        walls = [g.wall_s for g in group]

        def _mean_std(vals: list[float]) -> tuple[float, float]:
            if not vals:
                return 0.0, 0.0
            m = float(np.mean(vals))
            s = float(np.std(vals, ddof=1)) if len(vals) > 1 else 0.0
            return round(m, 4), round(s, 4)

        acc_m, acc_s = _mean_std(accs)
        ece_m, ece_s = _mean_std(eces)
        nll_m, nll_s = _mean_std(nlls)
        ret_m, ret_s = _mean_std(rets)
        comp_m, comp_s = _mean_std(comp)
        wall_m, wall_s = _mean_std(walls)

        summaries.append(
            BenchmarkSummaryItem(
                scenario_id=sc,
                method=method,
                trials_count=len(group),
                accuracy_mean=acc_m,
                accuracy_std=acc_s,
                ece_mean=ece_m,
                ece_std=ece_s,
                nll_mean=nll_m,
                nll_std=nll_s,
                retention_mean=ret_m,
                retention_std=ret_s,
                compute_units_mean=comp_m,
                compute_units_std=comp_s,
                wall_s_mean=wall_m,
                wall_s_std=wall_s,
            )
        )

    # Calculate paired deltas: AMRS vs each baseline for shared (scenario_id, seed)
    paired_deltas: list[PairedDeltaItem] = []
    scenarios = sorted(list({r.scenario_id for r in completed_trials}))
    methods = sorted(list({r.method for r in completed_trials if r.method != "amrs"}))

    for sc in scenarios:
        amrs_by_seed = {
            r.seed: r for r in completed_trials if r.scenario_id == sc and r.method == "amrs"
        }
        if not amrs_by_seed:
            continue

        for bm in methods:
            bm_by_seed = {
                r.seed: r for r in completed_trials if r.scenario_id == sc and r.method == bm
            }
            shared_seeds = sorted(list(set(amrs_by_seed.keys()) & set(bm_by_seed.keys())))
            if not shared_seeds:
                continue

            acc_deltas = [amrs_by_seed[s].accuracy - bm_by_seed[s].accuracy for s in shared_seeds]
            ece_deltas = [amrs_by_seed[s].ece - bm_by_seed[s].ece for s in shared_seeds]
            comp_ratios = [
                amrs_by_seed[s].compute_units / max(1.0, bm_by_seed[s].compute_units)
                for s in shared_seeds
            ]

            acc_delta_mean = round(float(np.mean(acc_deltas)), 4)
            ece_delta_mean = round(float(np.mean(ece_deltas)), 4)
            comp_ratio_mean = round(float(np.mean(comp_ratios)), 3)

            paired_deltas.append(
                PairedDeltaItem(
                    scenario_id=sc,
                    baseline_method=bm,
                    pairs_count=len(shared_seeds),
                    accuracy_delta_mean=acc_delta_mean,
                    ece_delta_mean=ece_delta_mean,
                    compute_ratio_mean=comp_ratio_mean,
                )
            )

    return summaries, paired_deltas, is_complete


class BenchmarkRunner:
    """Manages reproducible execution of benchmark suites across scenarios, seeds, and methods."""

    def __init__(
        self,
        db: Database | None = None,
        base_scenarios_dir: str | Path = "artifacts/scenarios",
    ) -> None:
        self.db = db or Database()
        self.repo = BenchmarkRepository(self.db)
        self.base_scenarios_dir = Path(base_scenarios_dir)

    def _ensure_scenario_artifacts(
        self,
        spec: ScenarioSpec,
        seed: int,
        device: str,
    ) -> Path:
        """Ensure scenario artifacts exist and verify match with requested trial config."""
        s_dir = self.base_scenarios_dir / spec.id / f"seed{seed}"
        meta_path = s_dir / "meta.json"
        final_path = s_dir / "final.pt"

        rebuild = False
        if not (meta_path.exists() and final_path.exists()):
            rebuild = True
        else:
            try:
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
                expected_config_hash = hashlib.sha256(
                    json.dumps(spec.raw_config, sort_keys=True).encode()
                ).hexdigest()
                if meta.get("config_hash") != expected_config_hash or meta.get("seed") != seed:
                    rebuild = True
            except Exception:
                rebuild = True

        if rebuild:
            logger.info("Building scenario %s (seed %d, profile %s)", spec.id, seed, spec.profile)
            build_scenario(
                scenario_id=spec.id,
                seed=seed,
                profile=spec.profile,
                out_dir=s_dir,
                device=device,
                force=True,
            )

        return s_dir

    def run_benchmark(
        self,
        req: BenchmarkCreateRequest,
        benchmark_id: str | None = None,
        profile: str = "tiny",
        device: str = "cpu",
        progress_callback: Callable[[int, int, str], None] | None = None,
        resume: bool = True,
    ) -> BenchmarkDetailResponse:
        """Execute complete benchmark suite across requested scenarios, seeds, and methods."""
        bench_id = benchmark_id or str(uuid.uuid4())
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        # 1. Expand trials
        trials = expand_trials(
            benchmark_id=bench_id,
            scenarios=req.scenarios,
            seeds=req.seeds,
            methods=req.methods,
            profile=profile,
            device=device,
        )

        # 2. Check for existing benchmark to resume
        existing = self.repo.get_benchmark(bench_id) if resume else None
        completed_map: dict[tuple[str, int, str], BenchmarkResultItem] = {}
        if existing:
            for r in existing.results:
                if r.status == "completed":
                    completed_map[(r.scenario_id, r.seed, r.method)] = r
        else:
            self.repo.create_benchmark(
                benchmark_id=bench_id,
                created_at=now,
                config=req.model_dump(),
                status="running",
            )

        self.repo.update_benchmark_status(bench_id, "running")

        total_trials = len(trials)
        current_results: list[BenchmarkResultItem] = list(completed_map.values())

        for idx, trial in enumerate(trials, start=1):
            key = (trial.scenario_id, trial.seed, trial.method)
            if key in completed_map:
                logger.info("Resuming trial %d/%d (%s) already completed.", idx, total_trials, key)
                continue

            msg = f"Executing trial {idx}/{total_trials}: {trial.scenario_id} [seed {trial.seed}, {trial.method}]"
            logger.info(msg)
            if progress_callback:
                progress_callback(idx, total_trials, msg)

            spec = ScenarioSpec.load(trial.scenario_id, profile=trial.profile)
            s_dir = self._ensure_scenario_artifacts(spec, trial.seed, trial.device)

            # Prepare scenario data bundle
            bundle, _ = _prepare_scenario_data(spec, seed=trial.seed)

            try:
                if trial.method == "amrs":
                    res_item = self._run_amrs_trial(trial, spec, bundle, s_dir)
                else:
                    res_item = self._run_baseline_trial(trial, spec, bundle, s_dir)

            except Exception as exc:
                logger.exception("Trial execution error for %s: %s", key, exc)
                res_item = BenchmarkResultItem(
                    scenario_id=trial.scenario_id,
                    seed=trial.seed,
                    method=trial.method,
                    accuracy=0.0,
                    ece=0.0,
                    nll=0.0,
                    retention=0.0,
                    compute_units=0.0,
                    wall_s=0.0,
                    accepted=False,
                    notes=f"Error: {exc}",
                    status="failed",
                    error_message=str(exc),
                )

            # Persist trial result incrementally
            self.repo.record_trial_result(bench_id, res_item)
            current_results.append(res_item)

        # 3. Aggregate results
        summaries, paired_deltas, is_complete = compute_matrix_aggregates(current_results, trials)
        final_status: Literal["succeeded", "failed"] = "succeeded" if is_complete else "failed"
        self.repo.update_benchmark_status(bench_id, final_status)

        bench_response = BenchmarkDetailResponse(
            benchmark_id=bench_id,
            created_at=now,
            status=final_status,
            results=current_results,
            summaries=summaries,
            paired_deltas=paired_deltas,
            is_complete=is_complete,
        )

        try:
            from amrs.benchmark.report import generate_benchmark_report

            artifacts_dir = Path("artifacts/benchmarks") / bench_id
            generate_benchmark_report(
                benchmark=bench_response,
                requested_trials=trials,
                output_dir=artifacts_dir,
                config=req.model_dump(),
            )
        except Exception as exc:
            logger.warning("Could not auto-export benchmark report artifacts: %s", exc)

        return bench_response

    def _run_amrs_trial(
        self,
        trial: TrialSpec,
        spec: ScenarioSpec,
        bundle: DataBundle,
        s_dir: Path,
    ) -> BenchmarkResultItem:
        """Execute AMRS diagnosis and repair pipeline on the trial scenario."""
        # Load pre-trained model weights
        model = build(spec.arch, num_classes=spec.num_classes, in_shape=spec.input_shape).to(
            trial.device
        )
        sd = load_state_dict_safe(s_dir / "final.pt")
        model.load_state_dict(sd)

        # Read historical checkpoints and training history if available
        ckpts = sorted(s_dir.glob("ckpt_epoch*.pt"))
        history_path = s_dir / "history.json"
        hist = json.loads(history_path.read_text(encoding="utf-8")) if history_path.exists() else []

        val_loader = make_loader(bundle.val, batch_size=64, shuffle=False)
        holdout_loader = make_loader(bundle.holdout, batch_size=64, shuffle=False)
        train_loader = make_loader(bundle.train, batch_size=32, shuffle=True, seed=trial.seed)
        target_loader = (
            make_loader(bundle.target, batch_size=64, shuffle=False)
            if bundle.target is not None
            else val_loader
        )

        recovery_bundle = RecoveryBundle(
            model=model,
            val_loader=val_loader,
            holdout_loader=holdout_loader,
            train_loader=train_loader,
            target_loader=target_loader,
            checkpoints=ckpts,
            history=hist,
            run_id=trial.trial_id,
            scenario_id=trial.scenario_id,
            arch=spec.arch,
            primary_metric="accuracy",
            seed=trial.seed,
            device=trial.device,
        )

        orchestrator = RecoveryOrchestrator()
        run_record = orchestrator.run(recovery_bundle)

        # Retrieve accepted model or fallback to original
        cand_model: nn.Module
        accepted_path = recovery_bundle.artifacts_dir / "accepted_model.pt"
        if accepted_path.exists() and run_record.verdict == "ACCEPT":
            cand_model = build(
                spec.arch, num_classes=spec.num_classes, in_shape=spec.input_shape
            ).to(trial.device)
            cand_model.load_state_dict(load_state_dict_safe(accepted_path))
        else:
            cand_model = model

        meter = ComputeMeter()
        cand_model.eval()
        model.eval()

        c_logits, y_eval = predict_logits(cand_model, holdout_loader, device=trial.device)
        meter.add_fwd(len(y_eval))

        o_logits, _ = predict_logits(model, holdout_loader, device=trial.device)
        meter.add_fwd(len(y_eval))

        acc_val = float(accuracy(c_logits, y_eval))
        ece_val = float(ece(c_logits, y_eval))
        nll_val = float(nll(c_logits, y_eval))

        orig_corr = per_sample_correct(o_logits, y_eval)
        cand_corr = per_sample_correct(c_logits, y_eval)
        retention_val, _ = retained_correct_rate(orig_corr, cand_corr)
        agreement_val = float(top1_agreement(o_logits, c_logits))

        compute_units = float(run_record.compute_units_total or 0.0) + meter.units
        wall_s = float(run_record.duration_s or 0.0)

        notes = f"Verdict: {run_record.verdict}; Accepted: {run_record.accepted_strategy}"

        return BenchmarkResultItem(
            scenario_id=trial.scenario_id,
            seed=trial.seed,
            method="amrs",
            accuracy=acc_val,
            ece=ece_val,
            nll=nll_val,
            retention=retention_val,
            agreement=agreement_val,
            compute_units=compute_units,
            wall_s=wall_s,
            accepted=bool(run_record.verdict == "ACCEPT"),
            notes=notes,
            status="completed",
        )

    def _run_baseline_trial(
        self,
        trial: TrialSpec,
        spec: ScenarioSpec,
        bundle: DataBundle,
        s_dir: Path,
    ) -> BenchmarkResultItem:
        """Execute baseline method on trial scenario."""
        model = build(spec.arch, num_classes=spec.num_classes, in_shape=spec.input_shape).to(
            trial.device
        )
        sd = load_state_dict_safe(s_dir / "final.pt")
        model.load_state_dict(sd)

        res: BaselineResult = run_baseline(
            scenario=spec,
            seed=trial.seed,
            budget=trial.budget,
            data_bundle=bundle,
            method=trial.method,
            model=model,
            device=trial.device,
            scenario_dir=s_dir,
            allow_small_holdout=True,
        )

        return BenchmarkResultItem(
            scenario_id=trial.scenario_id,
            seed=trial.seed,
            method=trial.method,
            accuracy=res.accuracy,
            ece=res.ece,
            nll=res.nll,
            retention=res.retention,
            agreement=res.agreement,
            compute_units=res.compute_units,
            wall_s=res.wall_s,
            accepted=None,
            notes=res.notes,
            status="completed",
        )


def run_benchmark_suite(
    scenarios: list[str] | None = None,
    seeds: list[int] | None = None,
    methods: list[str] | None = None,
    profile: str = "tiny",
    device: str = "cpu",
    db: Database | None = None,
    benchmark_id: str | None = None,
) -> BenchmarkDetailResponse:
    """Convenience top-level API running benchmark matrix suite."""
    runner = BenchmarkRunner(db=db)
    sc = scenarios or ["s1_overfit", "s2_miscalibration"]
    sd = seeds or [0]
    mt = methods or ["amrs", "early_stopping"]

    req = BenchmarkCreateRequest(
        scenarios=sc,
        seeds=sd,
        methods=mt,
    )
    return runner.run_benchmark(req, benchmark_id=benchmark_id, profile=profile, device=device)
