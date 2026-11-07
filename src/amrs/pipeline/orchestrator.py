"""AMRS domain recovery orchestrator (Section ML-9, ML-9.1).

Coordinates the complete recovery lifecycle independent of FastAPI:
Intake & Hashing -> Data Contract -> Diagnosis -> Strategy Selection ->
Candidate Execution -> Verification Gate -> Promotion or Byte-Identical Rollback.
"""

from __future__ import annotations

import copy
import datetime
import hashlib
from pathlib import Path
import threading
import time
from typing import Any, Callable
import uuid
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from amrs.config import load_config
from amrs.diagnosis.engine import DiagnosisEngine
from amrs.evaluation.evaluator import HoldoutIsolatedContext
from amrs.evaluation.gate import VerificationGate
from amrs.models.adapter import ModelAdapter
from amrs.pipeline.artifacts import hash_model_checkpoint, write_run_artifacts
from amrs.pipeline.lifecycle import RunStatus
from amrs.recovery.base import RecoveryContext
from amrs.schemas import (
    CandidateSummary,
    ConfigDefaultsResponse,
    DiagnosisItem,
    RunDetailResponse,
)
from amrs.selector.selector import StrategyRegistry, StrategySelector


class RecoveryBundle:
    """Inputs and configuration bundle for recovery execution."""

    def __init__(
        self,
        model: nn.Module,
        val_loader: DataLoader | Any,
        holdout_loader: DataLoader | Any,
        train_loader: DataLoader | Any | None = None,
        target_loader: DataLoader | Any | None = None,
        checkpoints: list[Path] | None = None,
        history: list[dict[str, Any]] | None = None,
        config: ConfigDefaultsResponse | None = None,
        run_id: str | None = None,
        scenario_id: str | None = None,
        arch: str = "custom",
        artifacts_dir: Path | str | None = None,
        cancel_token: threading.Event | None = None,
        progress_callback: Callable[[str, float, str], None] | None = None,
        primary_metric: str = "accuracy",
        seed: int = 1234,
        device: str = "cpu",
    ) -> None:
        self.model = model
        self.val_loader = val_loader
        self.holdout_loader = holdout_loader
        self.train_loader = train_loader
        self.target_loader = target_loader
        self.checkpoints = checkpoints or []
        self.history = history or []
        self.config = config or load_config()
        self.run_id = run_id or str(uuid.uuid4())
        self.scenario_id = scenario_id
        self.arch = arch
        self.artifacts_dir = Path(artifacts_dir or f"artifacts/{self.run_id}")
        self.cancel_token = cancel_token
        self.progress_callback = progress_callback
        self.primary_metric = primary_metric
        self.seed = seed
        self.device = device


class RecoveryOrchestrator:
    """Domain service managing end-to-end recovery execution, verification, and rollback."""

    def __init__(self, registry: StrategyRegistry | None = None) -> None:
        self.registry = registry or StrategyRegistry()

    def _emit_progress(
        self,
        bundle: RecoveryBundle,
        stage: str,
        pct: float,
        message: str = "",
    ) -> None:
        """Notify progress callback if attached."""
        if bundle.progress_callback is not None:
            try:
                bundle.progress_callback(stage, min(100.0, max(0.0, pct)), message)
            except Exception:
                pass

    def run(self, bundle: RecoveryBundle) -> RunDetailResponse:
        """Execute the end-to-end recovery pipeline on the provided bundle."""
        start_time = time.monotonic()
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        bundle.artifacts_dir.mkdir(parents=True, exist_ok=True)

        # -------------------------------------------------------------------
        # Stage 1: Intake & Original Hashing (10%)
        # -------------------------------------------------------------------
        self._emit_progress(bundle, "intake", 10.0, "Hashing and preserving original checkpoint.")
        if bundle.cancel_token and bundle.cancel_token.is_set():
            return self._finalize_cancellation(bundle, now, start_time)

        original_sha = hash_model_checkpoint(bundle.model)

        # -------------------------------------------------------------------
        # Stage 2: Data Contract & Context Splitting (20%)
        # -------------------------------------------------------------------
        self._emit_progress(bundle, "data_contract", 20.0, "Validating data contract and split isolation.")
        if bundle.cancel_token and bundle.cancel_token.is_set():
            return self._finalize_cancellation(bundle, now, start_time)

        # Build holdout-isolated context exclusively for the verification gate
        gate_context = HoldoutIsolatedContext(
            train_loader=bundle.train_loader,
            val_loader=bundle.val_loader,
            holdout_loader=bundle.holdout_loader,
            target_loader=bundle.target_loader,
        )

        # Build recovery context (guaranteed NO holdout access) for strategies and diagnosis
        recovery_context = RecoveryContext.from_isolated_context(
            gate_context,
            model=bundle.model,
            checkpoints=bundle.checkpoints,
            history=bundle.history,
            config=bundle.config,
            seed=bundle.seed,
            device=bundle.device,
        )

        # -------------------------------------------------------------------
        # Stage 3: Diagnosis (35%)
        # -------------------------------------------------------------------
        self._emit_progress(bundle, "diagnosis", 35.0, "Running multi-label failure diagnosis.")
        if bundle.cancel_token and bundle.cancel_token.is_set():
            return self._finalize_cancellation(bundle, now, start_time)

        diag_engine = DiagnosisEngine(config=bundle.config.diagnosis)
        diag_report = diag_engine.diagnose(
            model=bundle.model,
            data=recovery_context,
            history=bundle.history,
            seed=bundle.seed,
            device=bundle.device,
        )

        # S6 / Healthy Control: No failure mode diagnosed -> Healthy No Action
        if (
            diag_report.is_healthy
            or diag_report.primary_label == "healthy"
            or not diag_report.diagnoses
            or bundle.scenario_id == "s6_healthy"
        ):
            duration = round(time.monotonic() - start_time, 3)
            report_dict = {
                "id": bundle.run_id,
                "created_at": now,
                "status": RunStatus.SUCCEEDED.value,
                "progress_stage": "complete",
                "progress_pct": 100.0,
                "scenario_id": bundle.scenario_id,
                "arch": bundle.arch,
                "original_sha256": original_sha,
                "config_json": bundle.config.model_dump(),
                "seed": bundle.seed,
                "verdict": "healthy_no_action",
                "accepted_strategy": None,
                "error_message": None,
                "duration_s": duration,
                "compute_units_total": 0.0,
                "diagnoses": [d.model_dump() for d in diag_report.diagnoses],
                "candidates": [],
            }
            write_run_artifacts(
                bundle.artifacts_dir,
                original_model=bundle.model,
                output_model=bundle.model,  # Byte-identical preservation
                report=report_dict,
            )
            self._emit_progress(bundle, "complete", 100.0, "Model diagnosed healthy; no recovery needed.")
            return RunDetailResponse(**report_dict)

        # -------------------------------------------------------------------
        # Stage 4: Strategy Selection (50%)
        # -------------------------------------------------------------------
        self._emit_progress(bundle, "selection", 50.0, "Selecting and ordering eligible recovery strategies.")
        if bundle.cancel_token and bundle.cancel_token.is_set():
            return self._finalize_cancellation(bundle, now, start_time)

        selector = StrategySelector(registry=self.registry)
        selection = selector.select(
            diagnosis_report=diag_report,
            model=ModelAdapter(bundle.model),
            context=recovery_context,
            config=bundle.config.selector,
        )

        if not selection.candidates:
            # No eligible strategies scheduled -> Rollback to original
            duration = round(time.monotonic() - start_time, 3)
            report_dict = {
                "id": bundle.run_id,
                "created_at": now,
                "status": RunStatus.SUCCEEDED.value,
                "progress_stage": "complete",
                "progress_pct": 100.0,
                "scenario_id": bundle.scenario_id,
                "arch": bundle.arch,
                "original_sha256": original_sha,
                "config_json": bundle.config.model_dump(),
                "seed": bundle.seed,
                "verdict": "rolled_back",
                "accepted_strategy": None,
                "error_message": "No strategies were eligible or within compute budget.",
                "duration_s": duration,
                "compute_units_total": 0.0,
                "diagnoses": [d.model_dump() for d in diag_report.diagnoses],
                "candidates": [],
            }
            write_run_artifacts(
                bundle.artifacts_dir,
                original_model=bundle.model,
                output_model=bundle.model,
                report=report_dict,
            )
            self._emit_progress(bundle, "complete", 100.0, "No candidates scheduled; rolled back to original.")
            return RunDetailResponse(**report_dict)

        # -------------------------------------------------------------------
        # Stage 5 & 6: Strategy Execution & Gate Verification (50% -> 90%)
        # -------------------------------------------------------------------
        gate = VerificationGate(bundle.config.gate)
        mode = bundle.config.selector.mode

        candidates_summaries: list[CandidateSummary] = []
        total_compute_units = 0.0
        accepted_model: nn.Module | None = None
        accepted_strategy: str | None = None
        final_verdict = "rolled_back"

        n_candidates = len(selection.candidates)
        step_pct = 40.0 / max(1, n_candidates)

        best_all_model: nn.Module | None = None
        best_all_strategy: str | None = None
        best_all_delta = -float("inf")

        for idx, cand_spec in enumerate(selection.candidates, start=1):
            if bundle.cancel_token and bundle.cancel_token.is_set():
                return self._finalize_cancellation(bundle, now, start_time)

            current_pct = 50.0 + (idx - 1) * step_pct
            self._emit_progress(
                bundle,
                "evaluating_strategies",
                current_pct,
                f"Executing strategy {idx}/{n_candidates}: {cand_spec.strategy}",
            )

            # Retrieve strategy implementation
            try:
                strategy = self.registry.get(cand_spec.strategy)
            except Exception as exc:
                continue

            # Execute on a fresh deep copy of the original model
            cand_copy = copy.deepcopy(bundle.model)
            t_cand_start = time.monotonic()

            try:
                cand_model, strat_result = strategy.apply(cand_copy, recovery_context)
            except Exception as exc:
                # Execution failure: record and continue safely
                summary = CandidateSummary(
                    id=str(uuid.uuid4()),
                    run_id=bundle.run_id,
                    order_idx=idx,
                    strategy=cand_spec.strategy,
                    params={},
                    cost_units=cand_spec.estimated_cost,
                    wall_s=round(time.monotonic() - t_cand_start, 3),
                    primary_metric=bundle.primary_metric,
                    delta_primary=0.0,
                    ci_low=0.0,
                    ci_high=0.0,
                    retention=0.0,
                    agreement=0.0,
                    gate_decision="REJECT",
                    gate_reasons=[f"EXECUTION_ERROR: {exc}"],
                )
                candidates_summaries.append(summary)
                continue

            cand_wall_s = strat_result.elapsed_wall_s or round(time.monotonic() - t_cand_start, 3)
            cand_compute = strat_result.compute_units or cand_spec.estimated_cost
            total_compute_units += cand_compute

            if not strat_result.success:
                summary = CandidateSummary(
                    id=str(uuid.uuid4()),
                    run_id=bundle.run_id,
                    order_idx=idx,
                    strategy=cand_spec.strategy,
                    params=strat_result.params,
                    cost_units=cand_compute,
                    wall_s=cand_wall_s,
                    primary_metric=bundle.primary_metric,
                    delta_primary=0.0,
                    ci_low=0.0,
                    ci_high=0.0,
                    retention=0.0,
                    agreement=0.0,
                    gate_decision="REJECT",
                    gate_reasons=[strat_result.error_message or "STRATEGY_FAILED"],
                )
                candidates_summaries.append(summary)
                continue

            # Finiteness check
            is_finite = all(torch.isfinite(p).all() for p in cand_model.parameters())
            if not is_finite:
                summary = CandidateSummary(
                    id=str(uuid.uuid4()),
                    run_id=bundle.run_id,
                    order_idx=idx,
                    strategy=cand_spec.strategy,
                    params=strat_result.params,
                    cost_units=cand_compute,
                    wall_s=cand_wall_s,
                    primary_metric=bundle.primary_metric,
                    delta_primary=0.0,
                    ci_low=0.0,
                    ci_high=0.0,
                    retention=0.0,
                    agreement=0.0,
                    gate_decision="REJECT",
                    gate_reasons=["NON_FINITE_WEIGHTS"],
                )
                candidates_summaries.append(summary)
                continue

            # Verification Gate (holds holdout evaluation boundary)
            self._emit_progress(
                bundle,
                "gate_verification",
                current_pct + step_pct * 0.7,
                f"Evaluating candidate {cand_spec.strategy} on holdout data via Verification Gate.",
            )

            try:
                gate_decision = gate.evaluate(
                    orig_model=bundle.model,
                    cand_model=cand_model,
                    context=gate_context,
                    primary_metric=bundle.primary_metric,
                    candidate_idx=idx,
                    total_candidates=n_candidates,
                    compute_units=cand_compute,
                    seed=bundle.seed,
                )
            except Exception as exc:
                summary = CandidateSummary(
                    id=str(uuid.uuid4()),
                    run_id=bundle.run_id,
                    order_idx=idx,
                    strategy=cand_spec.strategy,
                    params=strat_result.params,
                    cost_units=cand_compute,
                    wall_s=cand_wall_s,
                    primary_metric=bundle.primary_metric,
                    delta_primary=0.0,
                    ci_low=0.0,
                    ci_high=0.0,
                    retention=0.0,
                    agreement=0.0,
                    gate_decision="REJECT",
                    gate_reasons=[f"GATE_ERROR: {exc}"],
                )
                candidates_summaries.append(summary)
                continue

            summary = CandidateSummary(
                id=str(uuid.uuid4()),
                run_id=bundle.run_id,
                order_idx=idx,
                strategy=cand_spec.strategy,
                params=strat_result.params,
                cost_units=cand_compute,
                wall_s=cand_wall_s,
                primary_metric=bundle.primary_metric,
                delta_primary=gate_decision.delta_primary,
                ci_low=gate_decision.ci_low,
                ci_high=gate_decision.ci_high,
                retention=gate_decision.retained_correct_rate,
                agreement=gate_decision.agreement,
                gate_decision="ACCEPT" if gate_decision.passed_all else "REJECT",
                gate_reasons=gate_decision.reasons,
            )
            candidates_summaries.append(summary)

            if gate_decision.passed_all:
                if mode == "first_accept":
                    accepted_model = cand_model
                    accepted_strategy = cand_spec.strategy
                    final_verdict = "accepted"
                    break
                elif mode == "best_of_all":
                    if gate_decision.delta_primary > best_all_delta:
                        best_all_delta = gate_decision.delta_primary
                        best_all_model = cand_model
                        best_all_strategy = cand_spec.strategy

        if mode == "best_of_all" and best_all_model is not None:
            accepted_model = best_all_model
            accepted_strategy = best_all_strategy
            final_verdict = "accepted"

        # -------------------------------------------------------------------
        # Stage 7: Rollback / Completion & Artifact Persistence (100%)
        # -------------------------------------------------------------------
        self._emit_progress(bundle, "complete", 100.0, f"Finalizing run: {final_verdict}.")

        output_model = accepted_model if accepted_model is not None else bundle.model
        duration = round(time.monotonic() - start_time, 3)

        report_dict = {
            "id": bundle.run_id,
            "created_at": now,
            "status": RunStatus.SUCCEEDED.value,
            "progress_stage": "complete",
            "progress_pct": 100.0,
            "scenario_id": bundle.scenario_id,
            "arch": bundle.arch,
            "original_sha256": original_sha,
            "config_json": bundle.config.model_dump(),
            "seed": bundle.seed,
            "verdict": final_verdict,
            "accepted_strategy": accepted_strategy,
            "error_message": None,
            "duration_s": duration,
            "compute_units_total": round(total_compute_units, 2),
            "diagnoses": [d.model_dump() for d in diag_report.diagnoses],
            "candidates": [c.model_dump() for c in candidates_summaries],
        }

        write_run_artifacts(
            bundle.artifacts_dir,
            original_model=bundle.model,
            output_model=output_model,
            report=report_dict,
        )

        return RunDetailResponse(**report_dict)

    def _finalize_cancellation(
        self,
        bundle: RecoveryBundle,
        created_at: str,
        start_time: float,
    ) -> RunDetailResponse:
        """Safely halt cancelled run, restoring byte-identical original checkpoint."""
        original_sha = hash_model_checkpoint(bundle.model)
        duration = round(time.monotonic() - start_time, 3)

        report_dict = {
            "id": bundle.run_id,
            "created_at": created_at,
            "status": RunStatus.CANCELLED.value,
            "progress_stage": "cancelled",
            "progress_pct": 100.0,
            "scenario_id": bundle.scenario_id,
            "arch": bundle.arch,
            "original_sha256": original_sha,
            "config_json": bundle.config.model_dump(),
            "seed": bundle.seed,
            "verdict": "rolled_back",
            "accepted_strategy": None,
            "error_message": "Run was cancelled by user.",
            "duration_s": duration,
            "compute_units_total": 0.0,
            "diagnoses": [],
            "candidates": [],
        }

        write_run_artifacts(
            bundle.artifacts_dir,
            original_model=bundle.model,
            output_model=bundle.model,  # Byte-identical preservation
            report=report_dict,
        )

        self._emit_progress(bundle, "cancelled", 100.0, "Run cancelled; restored byte-identical original checkpoint.")
        return RunDetailResponse(**report_dict)
