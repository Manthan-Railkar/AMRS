"""Verification Gate enforcing statistical acceptance policy and holdout integrity (BE-5).

Guarantees:
1. Verification Guarantee (BR5): Candidate accepted ONLY if paired bootstrap CI lower bound >= 0,
   point delta >= min_gain, secondary metrics do not regress beyond max_regression,
   retention >= min_retention, and compute <= budget.
2. Multiple Comparison Control (BR3): Bonferroni confidence adjustment (1 - alpha / k).
3. Holdout Budget Discipline (BR2): Maximum holdout evaluations per run strictly capped.
4. Auditable Policy Trail: Records policy version, parameter hash, split ID, metrics, CI, and reasons.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any
import torch.nn as nn

from amrs.config import POLICY_VERSION, compute_gate_policy_hash
from amrs.errors import ConflictError, HoldoutTooSmallError
from amrs.evaluation.evaluator import HoldoutIsolatedContext, ModelEvaluator
from amrs.schemas import GateConfig


@dataclass(frozen=True)
class GateDecision:
    """Immutable result emitted exclusively by the backend verification gate."""
    decision: str  # "ACCEPT" or "REJECT"
    passed_all: bool
    reasons: list[str]
    primary_metric: str
    delta_primary: float
    ci_low: float
    ci_high: float
    confidence_level: float
    retained_correct_rate: float
    agreement: float
    orig_metrics: dict[str, float]
    cand_metrics: dict[str, float]
    policy_version: str
    policy_hash: str
    split_id: str
    seed: int


class VerificationGate:
    """Backend-owned verification gate evaluating frozen candidates against holdout data."""

    def __init__(
        self,
        config: GateConfig | None = None,
        evaluator: ModelEvaluator | None = None,
        policy_version: str = POLICY_VERSION,
    ) -> None:
        self.config = config or GateConfig()
        self.evaluator = evaluator or ModelEvaluator()
        self.policy_version = policy_version
        self.policy_hash = compute_gate_policy_hash(self.config)

    def evaluate_candidate(
        self,
        orig_model: nn.Module,
        cand_model: nn.Module,
        context: HoldoutIsolatedContext,
        primary_metric: str = "accuracy",
        candidate_idx: int = 1,
        total_candidates: int = 1,
        compute_units: float = 0.0,
        compute_budget: float = float("inf"),
        seed: int = 1234,
    ) -> GateDecision:
        """Evaluate a frozen candidate model against holdout data under the configured acceptance policy.

        Raises:
            ConflictError: If holdout evaluation count exceeds max_holdout_evaluations budget.
            HoldoutTooSmallError: If holdout dataset has fewer than 200 samples and small holdout disallowed.
        """
        # 1. Enforce holdout evaluation cap (BR2)
        if context.holdout_evaluations_count >= self.config.max_holdout_evaluations:
            raise ConflictError(
                message=f"Exceeded maximum permitted holdout evaluations ({self.config.max_holdout_evaluations}) for this run.",
                details={
                    "current_evaluations": context.holdout_evaluations_count,
                    "max_allowed": self.config.max_holdout_evaluations,
                },
            )

        # 2. Access holdout loader through authorized gate channel
        holdout_loader = context.access_holdout_for_gate("AMRS_VERIFICATION_GATE_AUTHORIZED")

        # 3. Calculate Bonferroni-adjusted confidence level (BR3)
        k = max(1, total_candidates)
        adjusted_alpha = self.config.family_alpha / k
        confidence_level = 1.0 - adjusted_alpha

        # 4. Compare models on holdout
        comp = self.evaluator.compare_models(
            orig_model=orig_model,
            cand_model=cand_model,
            loader=holdout_loader,
            primary_metric=primary_metric,
            n_boot=self.config.bootstrap_samples,
            confidence=confidence_level,
            seed=seed,
            allow_small_holdout=self.config.allow_small_holdout,
        )

        reasons: list[str] = []
        passed_all = True

        delta = comp["delta_primary"]
        ci_low = comp["ci_low"]
        ci_high = comp["ci_high"]
        ret_rate = comp["retained_correct_rate"]
        orig_m = comp["orig_metrics"]
        cand_m = comp["cand_metrics"]

        # Rule 5a: Primary gain threshold
        min_gain = (
            self.config.min_gain.accuracy
            if primary_metric == "accuracy"
            else self.config.min_gain.ece
        )
        if delta < min_gain:
            passed_all = False
            reasons.append(f"GAIN_BELOW_MIN: point delta {delta:.4f} < threshold {min_gain:.4f}")
        else:
            reasons.append(f"GAIN_THRESHOLD_MET: delta {delta:.4f} >= {min_gain:.4f}")

        # Rule 5a (continued): Paired bootstrap confidence lower bound >= 0
        if ci_low < 0.0:
            passed_all = False
            reasons.append(f"CI_LOWER_BOUND_NEGATIVE: ci_low {ci_low:.4f} < 0.0 (conf: {confidence_level:.3f})")
        else:
            reasons.append(f"CI_LOWER_BOUND_NON_NEGATIVE: ci_low {ci_low:.4f} >= 0.0")

        # Rule 5b: Secondary metrics regression check
        # Accuracy regression: orig_acc - cand_acc
        acc_regression = orig_m["accuracy"] - cand_m["accuracy"]
        if primary_metric != "accuracy" and acc_regression > self.config.max_regression.accuracy:
            passed_all = False
            reasons.append(f"ACCURACY_REGRESSION_EXCEEDED: {acc_regression:.4f} > {self.config.max_regression.accuracy:.4f}")

        # NLL regression: cand_nll - orig_nll
        nll_regression = cand_m["nll"] - orig_m["nll"]
        if nll_regression > self.config.max_regression.nll:
            passed_all = False
            reasons.append(f"NLL_REGRESSION_EXCEEDED: {nll_regression:.4f} > {self.config.max_regression.nll:.4f}")

        # ECE regression: cand_ece - orig_ece
        ece_regression = cand_m["ece"] - orig_m["ece"]
        if primary_metric != "ece" and ece_regression > self.config.max_regression.ece:
            passed_all = False
            reasons.append(f"ECE_REGRESSION_EXCEEDED: {ece_regression:.4f} > {self.config.max_regression.ece:.4f}")

        if not any("REGRESSION_EXCEEDED" in r for r in reasons):
            reasons.append("NO_SECONDARY_REGRESSION")

        # Rule 5c: Retained correct rate >= min_retention
        if ret_rate < self.config.min_retention:
            passed_all = False
            reasons.append(f"RETENTION_BELOW_MIN: {ret_rate:.4f} < {self.config.min_retention:.4f}")
        else:
            reasons.append(f"RETENTION_MET: {ret_rate:.4f} >= {self.config.min_retention:.4f}")

        # Rule 5d: Compute budget
        if compute_units > compute_budget:
            passed_all = False
            reasons.append(f"COMPUTE_BUDGET_EXCEEDED: {compute_units:.1f} > budget {compute_budget:.1f}")
        else:
            reasons.append(f"WITHIN_BUDGET: {compute_units:.1f} <= {compute_budget:.1f}")

        decision = "ACCEPT" if passed_all else "REJECT"

        return GateDecision(
            decision=decision,
            passed_all=passed_all,
            reasons=reasons,
            primary_metric=primary_metric,
            delta_primary=round(delta, 5),
            ci_low=round(ci_low, 5),
            ci_high=round(ci_high, 5),
            confidence_level=round(confidence_level, 4),
            retained_correct_rate=round(ret_rate, 4),
            agreement=round(comp["agreement"], 4),
            orig_metrics=orig_m,
            cand_metrics=cand_m,
            policy_version=self.policy_version,
            policy_hash=self.policy_hash,
            split_id=context.split_id,
            seed=seed,
        )

    # Convenience alias
    evaluate = evaluate_candidate

