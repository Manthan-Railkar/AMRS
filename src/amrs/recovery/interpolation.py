"""Weight interpolation recovery strategy (Section ML-8, ML-8.1).

Searches configured interpolation coefficients between the original weights and a
fine-tuned candidate, selecting the optimal coefficient via validation-only scoring.

Formulation:
    theta(alpha) = (1 - alpha) * theta_original + alpha * theta_candidate
for floating tensors, with documented deterministic policies for non-floating/BatchNorm buffers.
"""

from __future__ import annotations

import copy
import time
from collections import OrderedDict
from typing import Any

import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from amrs.metrics.classification import accuracy, ece, nll, predict_logits
from amrs.metrics.compute import ComputeMeter
from amrs.models.adapter import ModelAdapter
from amrs.recovery.base import (
    Applicability,
    CostEstimate,
    RecoveryContext,
    RecoveryStrategy,
    StrategyResult,
)
from amrs.recovery.selective_ft import SelectiveFinetuneL2spStrategy

# ---------------------------------------------------------------------------
# Buffer Policy Documentation
# ---------------------------------------------------------------------------
# Buffer Policy: "interpolate_float_copy_non_float"
# 1. Floating-point tensors (all parameter weights, biases, and floating buffers
#    such as BatchNorm running_mean and running_var):
#    Linearly interpolated via: (1 - alpha) * orig + alpha * cand
#    computed with float64 precision before casting back to tensor dtype.
# 2. Non-floating buffers (e.g. integer batch counters like num_batches_tracked):
#    - At boundary alpha == 0.0: strictly cloned from original (exact endpoint reproduction).
#    - At boundary alpha == 1.0: strictly cloned from candidate (exact endpoint reproduction).
#    - At intermediate 0 < alpha < 1: cloned from candidate if alpha >= 0.5, else from original.
DEFAULT_BUFFER_POLICY = "interpolate_float_copy_non_float"


def _has_identifiable_head(model: nn.Module) -> bool:
    """Check whether ModelAdapter can identify a valid classification head."""
    adapter = ModelAdapter(model)
    try:
        adapter.head_module()
        return True
    except Exception:
        return False


def validate_interpolation_compatibility(
    original_model: nn.Module,
    candidate_model: nn.Module,
) -> tuple[bool, str | None]:
    """Validate tensor compatibility, shapes, dtypes, and finiteness between models.

    Returns:
        (is_compatible, failure_reason)
    """
    orig_state = original_model.state_dict()
    cand_state = candidate_model.state_dict()

    orig_keys = set(orig_state.keys())
    cand_keys = set(cand_state.keys())

    if orig_keys != cand_keys:
        missing = orig_keys - cand_keys
        extra = cand_keys - orig_keys
        return (
            False,
            f"KEY_MISMATCH: Missing keys: {sorted(list(missing))}, Extra keys: {sorted(list(extra))}",
        )

    for key in orig_keys:
        t_orig = orig_state[key]
        t_cand = cand_state[key]

        if t_orig.shape != t_cand.shape:
            return (
                False,
                f"SHAPE_MISMATCH: Tensor '{key}' shape {tuple(t_orig.shape)} != {tuple(t_cand.shape)}",
            )

        if t_orig.dtype != t_cand.dtype:
            return (
                False,
                f"DTYPE_MISMATCH: Tensor '{key}' dtype {t_orig.dtype} != {t_cand.dtype}",
            )

        if not torch.isfinite(t_orig).all():
            return False, f"NON_FINITE: Original tensor '{key}' contains NaN or Inf"

        if not torch.isfinite(t_cand).all():
            return False, f"NON_FINITE: Candidate tensor '{key}' contains NaN or Inf"

    return True, None


def interpolate_state_dicts(
    orig_state: OrderedDict[str, torch.Tensor],
    cand_state: OrderedDict[str, torch.Tensor],
    alpha: float,
    buffer_policy: str = DEFAULT_BUFFER_POLICY,
) -> OrderedDict[str, torch.Tensor]:
    """Deterministically interpolate floating tensors between original and candidate state dicts.

    Args:
        orig_state: Original model state_dict.
        cand_state: Fine-tuned candidate model state_dict.
        alpha: Interpolation weight in [0.0, 1.0].
        buffer_policy: Policy for non-floating buffers.

    Returns:
        New OrderedDict with interpolated tensor state.
    """
    if not (0.0 <= alpha <= 1.0):
        raise ValueError(f"Interpolation coefficient alpha must be in [0.0, 1.0], got {alpha}")

    interpolated: OrderedDict[str, torch.Tensor] = OrderedDict()

    for key in orig_state.keys():
        t_orig = orig_state[key]
        t_cand = cand_state[key]

        if torch.is_floating_point(t_orig):
            if alpha == 0.0:
                interpolated[key] = t_orig.detach().clone()
            elif alpha == 1.0:
                interpolated[key] = t_cand.detach().clone()
            else:
                # High-precision floating linear blend
                t_orig_f64 = t_orig.to(torch.float64)
                t_cand_f64 = t_cand.to(torch.float64)
                blended = (1.0 - alpha) * t_orig_f64 + alpha * t_cand_f64
                interpolated[key] = blended.to(dtype=t_orig.dtype)
        else:
            # Non-floating buffers (integers, booleans)
            if alpha == 0.0:
                interpolated[key] = t_orig.detach().clone()
            elif alpha == 1.0:
                interpolated[key] = t_cand.detach().clone()
            else:
                if buffer_policy == "copy_candidate" or (
                    buffer_policy == DEFAULT_BUFFER_POLICY and alpha >= 0.5
                ):
                    interpolated[key] = t_cand.detach().clone()
                else:
                    interpolated[key] = t_orig.detach().clone()

    return interpolated


def interpolate_weights(
    original_model: nn.Module,
    candidate_model: nn.Module,
    alpha: float,
    buffer_policy: str = DEFAULT_BUFFER_POLICY,
) -> nn.Module:
    """Create an interpolated model copy theta(alpha) = (1 - alpha) * theta_orig + alpha * theta_cand."""
    compat, reason = validate_interpolation_compatibility(original_model, candidate_model)
    if not compat:
        raise ValueError(f"Models incompatible for weight interpolation: {reason}")

    interpolated_state = interpolate_state_dicts(
        original_model.state_dict(),
        candidate_model.state_dict(),
        alpha=alpha,
        buffer_policy=buffer_policy,
    )

    result_model = copy.deepcopy(original_model)
    result_model.load_state_dict(interpolated_state)
    result_model.eval()
    return result_model


def evaluate_interpolation_sweep(
    original_model: nn.Module,
    candidate_model: nn.Module,
    val_loader: DataLoader | Any,
    alphas: list[float],
    primary_metric: str = "accuracy",
    buffer_policy: str = DEFAULT_BUFFER_POLICY,
    device: str = "cpu",
) -> tuple[float, nn.Module, list[dict[str, Any]], float]:
    """Sweep across alphas on validation data and deterministically select the optimal model.

    Returns:
        (best_alpha, best_model, sweep_records, total_eval_units)
    """
    sweep_records: list[dict[str, Any]] = []
    best_alpha: float = alphas[0]
    best_score: float = -float("inf") if primary_metric == "accuracy" else float("inf")
    best_record: dict[str, Any] | None = None
    best_state: OrderedDict[str, torch.Tensor] | None = None

    meter = ComputeMeter()

    for alpha in alphas:
        # Build interpolated weights for current alpha
        interpolated_state = interpolate_state_dicts(
            original_model.state_dict(),
            candidate_model.state_dict(),
            alpha=alpha,
            buffer_policy=buffer_policy,
        )

        test_model = copy.deepcopy(original_model)
        test_model.load_state_dict(interpolated_state)
        test_model.eval()

        v_logits, v_labels = predict_logits(test_model, val_loader, device=device)
        meter.add_fwd(len(v_logits))

        val_acc = accuracy(v_logits, v_labels)
        val_nll = nll(v_logits, v_labels)
        val_ece = ece(v_logits, v_labels)

        record = {
            "alpha": float(alpha),
            "val_acc": float(val_acc),
            "val_nll": float(val_nll),
            "val_ece": float(val_ece),
        }
        sweep_records.append(record)

        # Optimization criterion
        if primary_metric == "accuracy":
            # Maximize accuracy; tie-break on lower NLL, then lower ECE, then lower alpha
            is_better = False
            if val_acc > best_score:
                is_better = True
            elif val_acc == best_score and best_record is not None:
                if val_nll < best_record["val_nll"]:
                    is_better = True
                elif val_nll == best_record["val_nll"] and val_ece < best_record["val_ece"]:
                    is_better = True
                elif (
                    val_nll == best_record["val_nll"]
                    and val_ece == best_record["val_ece"]
                    and alpha < best_alpha
                ):
                    is_better = True

            if is_better or best_record is None:
                best_score = val_acc
                best_alpha = alpha
                best_record = record
                best_state = copy.deepcopy(interpolated_state)
        else:
            # ECE or NLL: lower is better
            score = val_ece if primary_metric == "ece" else val_nll
            is_better = False
            if score < best_score:
                is_better = True
            elif score == best_score and best_record is not None:
                if val_acc > best_record["val_acc"]:
                    is_better = True
                elif val_acc == best_record["val_acc"] and alpha < best_alpha:
                    is_better = True

            if is_better or best_record is None:
                best_score = score
                best_alpha = alpha
                best_record = record
                best_state = copy.deepcopy(interpolated_state)

    assert best_state is not None
    best_model = copy.deepcopy(original_model)
    best_model.load_state_dict(best_state)
    best_model.eval()

    return best_alpha, best_model, sweep_records, meter.units


# ---------------------------------------------------------------------------
# Recovery Strategy Implementation
# ---------------------------------------------------------------------------


class WeightInterpolationStrategy(RecoveryStrategy):
    """Weight interpolation strategy searching linear blending coefficients (ML-8, ML-8.1)."""

    @property
    def name(self) -> str:
        return "weight_interpolation"

    def is_applicable(self, model: ModelAdapter, context: RecoveryContext) -> Applicability:
        """Check prerequisites for weight interpolation."""
        if not _has_identifiable_head(model.model):
            return Applicability(
                can_apply=False,
                reason="NO_IDENTIFIABLE_HEAD",
                message="Identifiable head required for fine-tuned candidate interpolation.",
            )

        has_cand = (
            "candidate_model" in context.extra
            or "finetuned_model" in context.extra
            or "parent_candidate" in context.extra
        )
        has_train = context.train_loader is not None
        has_val = context.val_loader is not None

        if not has_cand and not has_train and not has_val:
            return Applicability(
                can_apply=False,
                reason="MISSING_TRAINING_DATA",
                message="Training data required to generate fine-tuned candidate for interpolation.",
            )

        if context.val_loader is None:
            return Applicability(
                can_apply=False,
                reason="MISSING_VALIDATION_DATA",
                message="Validation loader is required to evaluate and rank interpolation coefficients.",
            )

        return Applicability(can_apply=True)

    def estimate_cost(
        self, context: RecoveryContext, model: ModelAdapter | None = None
    ) -> CostEstimate:
        """Estimate compute units: base fine-tuning units + len(alphas) * N_val evaluations (BR12)."""
        adapter = model or context.adapter
        alphas = [0.25, 0.5, 0.75]

        if context.config and hasattr(context.config, "strategies"):
            cfg = getattr(context.config.strategies, "weight_interpolation", None)
            if cfg:
                alphas = getattr(cfg, "alphas", [0.25, 0.5, 0.75])

        # If a pre-computed fine-tuned candidate is supplied, base training cost is 0
        has_cand = (
            "candidate_model" in context.extra
            or "finetuned_model" in context.extra
            or "parent_candidate" in context.extra
        )

        base_cost = 0.0
        if not has_cand:
            ft_strategy = SelectiveFinetuneL2spStrategy()
            base_cost = ft_strategy.estimate_cost(context, model=adapter).estimated_units

        loader = context.val_loader
        n_val = 500
        if loader is not None:
            if hasattr(loader, "dataset") and hasattr(loader.dataset, "__len__"):
                try:
                    n_val = len(loader.dataset)
                except Exception:
                    pass
            elif hasattr(loader, "__len__"):
                bs = getattr(loader, "batch_size", 32) or 32
                n_val = len(loader) * bs

        eval_cost = len(alphas) * n_val
        units = round(base_cost + eval_cost, 2)

        return CostEstimate(
            estimated_units=float(units),
            details={
                "base_finetune_units": base_cost,
                "alpha_eval_units": eval_cost,
                "alphas": alphas,
                "strategy": self.name,
            },
        )

    def apply(
        self, model_copy: nn.Module, context: RecoveryContext
    ) -> tuple[nn.Module, StrategyResult]:
        """Execute weight interpolation search across configured alphas."""
        t0 = time.monotonic()

        # Split isolation check: NEVER evaluate or train on holdout
        if hasattr(context, "_holdout_loader") or "holdout" in context.extra:
            raise ValueError(
                "Split discipline violation: holdout data cannot enter WeightInterpolationStrategy."
            )

        if not _has_identifiable_head(model_copy):
            return model_copy, StrategyResult(
                strategy_name=self.name,
                success=False,
                error_message="Could not identify classification head in model (NO_IDENTIFIABLE_HEAD).",
            )

        if context.val_loader is None:
            return model_copy, StrategyResult(
                strategy_name=self.name,
                success=False,
                error_message="Validation data is required for interpolation coefficient scoring (MISSING_VALIDATION_DATA).",
            )

        # 1. Resolve or generate fine-tuned candidate
        cand_model: nn.Module | None = None
        base_compute_units = 0.0
        base_grad_steps = 0

        for key in (
            "candidate_model",
            "finetuned_model",
            "parent_candidate",
            "finetuned_candidate",
        ):
            if key in context.extra and isinstance(context.extra[key], nn.Module):
                cand_model = context.extra[key]
                break

        if cand_model is None:
            # Generate fine-tuned candidate via selective fine-tuning
            ft_strategy = SelectiveFinetuneL2spStrategy()
            app = ft_strategy.is_applicable(ModelAdapter(model_copy), context)
            if not app.can_apply:
                return model_copy, StrategyResult(
                    strategy_name=self.name,
                    success=False,
                    error_message=f"Cannot generate fine-tuned candidate: {app.reason}",
                )

            cand_copy = copy.deepcopy(model_copy)
            cand_model, ft_result = ft_strategy.apply(cand_copy, context)
            if not ft_result.success:
                return model_copy, StrategyResult(
                    strategy_name=self.name,
                    success=False,
                    error_message=f"Fine-tuning candidate generation failed: {ft_result.error_message}",
                )
            base_compute_units = ft_result.compute_units
            base_grad_steps = ft_result.grad_steps

        # 2. Check architecture and tensor compatibility
        compat, failure_reason = validate_interpolation_compatibility(model_copy, cand_model)
        if not compat:
            return model_copy, StrategyResult(
                strategy_name=self.name,
                success=False,
                error_message=f"Model compatibility check failed: {failure_reason}",
            )

        # 3. Resolve alphas
        alphas = [0.25, 0.5, 0.75]
        buffer_policy = DEFAULT_BUFFER_POLICY

        if context.config and hasattr(context.config, "strategies"):
            cfg = getattr(context.config.strategies, "weight_interpolation", None)
            if cfg is not None:
                alphas = getattr(cfg, "alphas", [0.25, 0.5, 0.75])

        primary_metric = context.extra.get("primary_metric", "accuracy")

        # Baseline metrics before interpolation
        val_acc_before = 0.0
        val_nll_before = 0.0
        val_ece_before = 0.0
        try:
            v_logits, v_labels = predict_logits(
                model_copy, context.val_loader, device=context.device
            )
            val_acc_before = accuracy(v_logits, v_labels)
            val_nll_before = nll(v_logits, v_labels)
            val_ece_before = ece(v_logits, v_labels)
        except Exception:
            pass

        # 4. Sweep alphas on validation data
        try:
            best_alpha, best_model, sweep_records, eval_units = evaluate_interpolation_sweep(
                original_model=model_copy,
                candidate_model=cand_model,
                val_loader=context.val_loader,
                alphas=alphas,
                primary_metric=primary_metric,
                buffer_policy=buffer_policy,
                device=context.device,
            )
        except Exception as exc:
            return model_copy, StrategyResult(
                strategy_name=self.name,
                success=False,
                error_message=f"Alpha evaluation sweep failed: {exc}",
            )

        # Find best record
        selected_record = next(
            (r for r in sweep_records if r["alpha"] == best_alpha), sweep_records[0]
        )
        val_acc_after = selected_record["val_acc"]
        val_nll_after = selected_record["val_nll"]
        val_ece_after = selected_record["val_ece"]

        elapsed = round(time.monotonic() - t0, 3)

        metadata = {
            "selected_alpha": best_alpha,
            "alphas_evaluated": alphas,
            "sweep_records": sweep_records,
            "primary_metric": primary_metric,
            "buffer_policy": buffer_policy,
            "val_acc_before": round(val_acc_before, 6),
            "val_acc_after": round(val_acc_after, 6),
            "val_nll_before": round(val_nll_before, 6),
            "val_nll_after": round(val_nll_after, 6),
            "val_ece_before": round(val_ece_before, 6),
            "val_ece_after": round(val_ece_after, 6),
        }

        result = StrategyResult(
            strategy_name=self.name,
            success=True,
            params={"alpha": best_alpha, "alphas": alphas, "buffer_policy": buffer_policy},
            seed=context.seed,
            elapsed_wall_s=elapsed,
            compute_units=float(base_compute_units + eval_units),
            grad_steps=base_grad_steps,
            warnings=[],
            artifact_metadata=metadata,
        )

        return best_model, result
