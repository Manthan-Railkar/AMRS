"""Historical checkpoint recovery strategies: reversion and averaging (Section ML-5, ML-5.1).

Ranks training checkpoints on validation data to produce optimal reversion candidates,
and performs deterministic tensor averaging across compatible floating-point weights
with non-floating buffer preservation and BatchNorm recalibration.
"""

from __future__ import annotations

import copy
import re
import time
from collections import OrderedDict
from pathlib import Path
from typing import Any

import torch
import torch.nn as nn

from amrs.metrics.classification import accuracy, ece, nll, predict_logits
from amrs.metrics.compute import ComputeMeter
from amrs.models.adapter import ModelAdapter
from amrs.models.loader import load_state_dict_safe
from amrs.recovery.base import (
    Applicability,
    CostEstimate,
    RecoveryContext,
    RecoveryStrategy,
    StrategyResult,
)
from amrs.recovery.bn_recal import recalibrate_bn_stats

_EPOCH_PATTERN = re.compile(r"(\d+)")


def _extract_epoch_number(path: Path | str) -> int:
    """Extract integer epoch number from checkpoint path for chronological ordering."""
    name = Path(path).stem
    matches = _EPOCH_PATTERN.findall(name)
    if matches:
        try:
            return int(matches[-1])
        except ValueError:
            pass
    return 0


def _sort_checkpoints_chronologically(checkpoints: list[Path | str]) -> list[Path]:
    """Sort checkpoints ascending by epoch number, falling back to lexicographical filename."""
    parsed = [Path(p) for p in checkpoints]
    return sorted(parsed, key=lambda p: (_extract_epoch_number(p), p.name))


def validate_checkpoint(
    checkpoint_path: Path | str,
    target_model: nn.Module,
) -> tuple[bool, str | None, OrderedDict[str, torch.Tensor] | None]:
    """Validate checkpoint architecture, tensor compatibility, and finiteness.

    Returns:
        (is_valid, skip_reason, state_dict)
    """
    path = Path(checkpoint_path)
    if not path.exists() or not path.is_file():
        return False, "FILE_NOT_FOUND", None

    try:
        state_dict = load_state_dict_safe(path)
    except Exception:
        return False, "INVALID_CHECKPOINT", None

    # 1. Finiteness check: reject any state_dict containing NaN or Inf
    for key, tensor in state_dict.items():
        if not torch.isfinite(tensor).all():
            return False, "NON_FINITE", None

    # 2. Architecture compatibility check: keys and tensor shapes must match exactly
    model_state = target_model.state_dict()
    expected_keys = set(model_state.keys())
    provided_keys = set(state_dict.keys())

    if expected_keys != provided_keys:
        return False, "ARCH_MISMATCH", None

    for key in expected_keys:
        if model_state[key].shape != state_dict[key].shape:
            return False, "ARCH_MISMATCH", None

    return True, None, state_dict


def average_state_dicts(
    state_dicts: list[OrderedDict[str, torch.Tensor]],
) -> OrderedDict[str, torch.Tensor]:
    """Deterministically average floating-point tensors across state dicts.

    Non-floating buffers (e.g. integer batch counters) are copied from the latest state_dict.
    """
    if not state_dicts:
        raise ValueError("Cannot average empty list of state dicts.")
    if len(state_dicts) == 1:
        return copy.deepcopy(state_dicts[0])

    k = len(state_dicts)
    latest_dict = state_dicts[-1]
    averaged: OrderedDict[str, torch.Tensor] = OrderedDict()

    reference_keys = list(state_dicts[0].keys())

    for key in reference_keys:
        sample_tensor = state_dicts[0][key]

        if torch.is_floating_point(sample_tensor):
            # Compute high-precision mean across all K checkpoints
            accum = torch.zeros_like(sample_tensor, dtype=torch.float64)
            for sd in state_dicts:
                accum.add_(sd[key].to(dtype=torch.float64))
            accum.div_(k)
            averaged[key] = accum.to(dtype=sample_tensor.dtype)
        else:
            # Deterministic rule for non-floating buffers: copy from the latest checkpoint
            averaged[key] = latest_dict[key].clone()

    return averaged


# ---------------------------------------------------------------------------
# Checkpoint Reversion Strategy
# ---------------------------------------------------------------------------


class CheckpointReversionStrategy(RecoveryStrategy):
    """Reverts to the top-performing historical training checkpoint based on validation score."""

    @property
    def name(self) -> str:
        return "checkpoint_reversion"

    def is_applicable(self, model: ModelAdapter, context: RecoveryContext) -> Applicability:
        if not context.checkpoints:
            return Applicability(
                can_apply=False,
                reason="NO_HISTORY",
                message="No checkpoints supplied for reversion.",
            )
        if context.val_loader is None and "logits" not in context.extra:
            return Applicability(
                can_apply=False,
                reason="MISSING_VALIDATION_DATA",
                message="Validation loader is required to evaluate and rank checkpoints.",
            )
        return Applicability(can_apply=True)

    def estimate_cost(
        self, context: RecoveryContext, model: ModelAdapter | None = None
    ) -> CostEstimate:
        loader = context.val_loader
        n_val = 500
        if loader is not None:
            if hasattr(loader, "dataset") and hasattr(loader.dataset, "__len__"):
                try:
                    n_val = len(loader.dataset)
                except Exception:
                    pass
            elif hasattr(loader, "__len__"):
                batch_size = getattr(loader, "batch_size", 32) or 32
                n_val = len(loader) * batch_size

        return CostEstimate(
            estimated_units=float(n_val),
            details={"fwd_samples": n_val, "bwd_samples": 0, "strategy": self.name},
        )

    def apply(
        self, model_copy: nn.Module, context: RecoveryContext
    ) -> tuple[nn.Module, StrategyResult]:
        t0 = time.monotonic()

        # Split isolation check
        if hasattr(context, "_holdout_loader") or "holdout" in context.extra:
            raise ValueError(
                "Split discipline violation: holdout data cannot enter CheckpointReversionStrategy."
            )

        if not context.checkpoints:
            return model_copy, StrategyResult(
                strategy_name=self.name,
                success=False,
                error_message="No checkpoints provided for reversion (NO_HISTORY).",
            )

        if context.val_loader is None:
            return model_copy, StrategyResult(
                strategy_name=self.name,
                success=False,
                error_message="Validation loader required to rank checkpoints (MISSING_VALIDATION_DATA).",
            )

        # Config: top_k search limit
        top_k = 3
        if context.config and hasattr(context.config, "strategies"):
            cfg = getattr(context.config.strategies, "checkpoint_reversion", None)
            if cfg is not None:
                top_k = getattr(cfg, "top_k", 3)

        sorted_ckpts = _sort_checkpoints_chronologically(context.checkpoints)
        # Inspect top_k most recent checkpoints (or all if fewer)
        candidate_paths = sorted_ckpts[-top_k:] if len(sorted_ckpts) > top_k else sorted_ckpts

        evaluated_checkpoints: list[dict[str, Any]] = []
        skipped_checkpoints: dict[str, str] = {}
        valid_candidates: list[tuple[Path, OrderedDict[str, torch.Tensor], float]] = []

        meter = ComputeMeter()

        # Record baseline metrics on input model
        logits_base, labels_base = predict_logits(
            model_copy, context.val_loader, device=context.device
        )
        base_acc = accuracy(logits_base, labels_base)
        base_nll = nll(logits_base, labels_base)
        base_ece = ece(logits_base, labels_base)

        eval_model = copy.deepcopy(model_copy)

        for ckpt_path in candidate_paths:
            is_valid, reason, state_dict = validate_checkpoint(ckpt_path, model_copy)
            if not is_valid or state_dict is None:
                skipped_checkpoints[ckpt_path.name] = reason or "INVALID"
                continue

            # Load into test copy and evaluate on val_loader
            eval_model.load_state_dict(state_dict, strict=True)
            eval_model.eval()

            val_logits, val_labels = predict_logits(
                eval_model, context.val_loader, device=context.device
            )
            meter.add_fwd(len(val_logits))

            val_acc = accuracy(val_logits, val_labels)
            val_loss = nll(val_logits, val_labels)
            val_ece = ece(val_logits, val_labels)

            evaluated_checkpoints.append(
                {
                    "path": str(ckpt_path),
                    "name": ckpt_path.name,
                    "epoch": _extract_epoch_number(ckpt_path),
                    "accuracy": round(val_acc, 6),
                    "nll": round(val_loss, 6),
                    "ece": round(val_ece, 6),
                }
            )

            valid_candidates.append((ckpt_path, state_dict, val_acc))

        if not valid_candidates:
            elapsed = round(time.monotonic() - t0, 3)
            return model_copy, StrategyResult(
                strategy_name=self.name,
                success=False,
                elapsed_wall_s=elapsed,
                compute_units=meter.units,
                error_message="No compatible or valid checkpoints were found for reversion.",
                artifact_metadata={"skipped_checkpoints": skipped_checkpoints},
            )

        # Rank candidates by validation accuracy descending (highest accuracy wins)
        valid_candidates.sort(key=lambda t: t[2], reverse=True)
        best_path, best_state, best_acc = valid_candidates[0]

        # Produce independent candidate model copy
        candidate_model = copy.deepcopy(model_copy)
        candidate_model.load_state_dict(best_state, strict=True)
        candidate_model.eval()

        val_logits_best, val_labels_best = predict_logits(
            candidate_model, context.val_loader, device=context.device
        )
        final_acc = accuracy(val_logits_best, val_labels_best)
        final_nll = nll(val_logits_best, val_labels_best)
        final_ece = ece(val_logits_best, val_labels_best)

        elapsed = round(time.monotonic() - t0, 3)

        metadata = {
            "selected_checkpoint": best_path.name,
            "selected_checkpoint_path": str(best_path),
            "selected_epoch": _extract_epoch_number(best_path),
            "evaluated_count": len(valid_candidates),
            "evaluated_checkpoints": evaluated_checkpoints,
            "skipped_checkpoints": skipped_checkpoints,
            "val_acc_before": round(base_acc, 6),
            "val_acc_after": round(final_acc, 6),
            "val_nll_before": round(base_nll, 6),
            "val_nll_after": round(final_nll, 6),
            "val_ece_before": round(base_ece, 6),
            "val_ece_after": round(final_ece, 6),
        }

        result = StrategyResult(
            strategy_name=self.name,
            success=True,
            params={"top_k": top_k, "selected_checkpoint": best_path.name},
            seed=context.seed,
            elapsed_wall_s=elapsed,
            compute_units=float(meter.units),
            grad_steps=0,
            warnings=[],
            artifact_metadata=metadata,
        )

        return candidate_model, result


# ---------------------------------------------------------------------------
# Checkpoint Averaging Strategy
# ---------------------------------------------------------------------------


class CheckpointAveragingStrategy(RecoveryStrategy):
    """Averages floating-point weights across the last-K training checkpoints with BatchNorm recalibration."""

    @property
    def name(self) -> str:
        return "checkpoint_averaging"

    def is_applicable(self, model: ModelAdapter, context: RecoveryContext) -> Applicability:
        if len(context.checkpoints) < 2:
            return Applicability(
                can_apply=False,
                reason="NO_HISTORY",
                message="At least 2 historical checkpoints required for checkpoint averaging.",
            )
        return Applicability(can_apply=True)

    def estimate_cost(
        self, context: RecoveryContext, model: ModelAdapter | None = None
    ) -> CostEstimate:
        loader = context.val_loader
        n_val = 500
        if loader is not None:
            if hasattr(loader, "dataset") and hasattr(loader.dataset, "__len__"):
                try:
                    n_val = len(loader.dataset)
                except Exception:
                    pass
            elif hasattr(loader, "__len__"):
                batch_size = getattr(loader, "batch_size", 32) or 32
                n_val = len(loader) * batch_size

        units = round(n_val * 1.25, 2)
        return CostEstimate(
            estimated_units=float(units),
            details={"fwd_samples": n_val, "bwd_samples": 0, "strategy": self.name},
        )

    def apply(
        self, model_copy: nn.Module, context: RecoveryContext
    ) -> tuple[nn.Module, StrategyResult]:
        t0 = time.monotonic()

        # Split isolation check
        if hasattr(context, "_holdout_loader") or "holdout" in context.extra:
            raise ValueError(
                "Split discipline violation: holdout data cannot enter CheckpointAveragingStrategy."
            )

        # Config: last_k checkpoints limit
        last_k = 5
        if context.config and hasattr(context.config, "strategies"):
            cfg = getattr(context.config.strategies, "checkpoint_averaging", None)
            if cfg is not None:
                last_k = getattr(cfg, "last_k", 5)

        sorted_ckpts = _sort_checkpoints_chronologically(context.checkpoints)
        candidate_paths = sorted_ckpts[-last_k:] if len(sorted_ckpts) > last_k else sorted_ckpts

        valid_state_dicts: list[OrderedDict[str, torch.Tensor]] = []
        valid_paths: list[Path] = []
        skipped_checkpoints: dict[str, str] = {}

        for ckpt_path in candidate_paths:
            is_valid, reason, state_dict = validate_checkpoint(ckpt_path, model_copy)
            if not is_valid or state_dict is None:
                skipped_checkpoints[ckpt_path.name] = reason or "INVALID"
                continue
            valid_state_dicts.append(state_dict)
            valid_paths.append(ckpt_path)

        if len(valid_state_dicts) < 2:
            elapsed = round(time.monotonic() - t0, 3)
            return model_copy, StrategyResult(
                strategy_name=self.name,
                success=False,
                elapsed_wall_s=elapsed,
                compute_units=0.0,
                error_message=(
                    f"Fewer than 2 compatible checkpoints found for averaging "
                    f"(found {len(valid_state_dicts)} compatible, required >= 2)."
                ),
                artifact_metadata={"skipped_checkpoints": skipped_checkpoints},
            )

        # Baseline metrics on input model
        base_acc = 0.0
        base_nll = 0.0
        base_ece = 0.0
        if context.val_loader is not None:
            try:
                logits_base, labels_base = predict_logits(
                    model_copy, context.val_loader, device=context.device
                )
                base_acc = accuracy(logits_base, labels_base)
                base_nll = nll(logits_base, labels_base)
                base_ece = ece(logits_base, labels_base)
            except Exception:
                pass

        # 1. Compute deterministic tensor average
        averaged_state = average_state_dicts(valid_state_dicts)

        # 2. Build candidate model from averaged state
        candidate_model = copy.deepcopy(model_copy)
        candidate_model.load_state_dict(averaged_state, strict=True)
        candidate_model.eval()

        # 3. BatchNorm statistics handling: recalibrate on validation/target data if BN is supported
        adapter = ModelAdapter(candidate_model)
        bn_recalibrated = False
        recal_units = 0.0

        if adapter.supports_bn():
            recal_loader = context.val_loader or context.target_loader
            if recal_loader is not None:
                try:
                    candidate_model, recal_stats = recalibrate_bn_stats(
                        model=candidate_model,
                        loader=recal_loader,
                        max_batches=50,
                        reset_stats=True,
                        device=context.device,
                    )
                    bn_recalibrated = True
                    recal_units = float(recal_stats.get("compute_units", 0.0))
                except Exception:
                    pass

        # 4. Evaluate candidate on validation data
        final_acc = base_acc
        final_nll = base_nll
        final_ece = base_ece
        val_eval_units = 0.0

        if context.val_loader is not None:
            val_logits, val_labels = predict_logits(
                candidate_model, context.val_loader, device=context.device
            )
            final_acc = accuracy(val_logits, val_labels)
            final_nll = nll(val_logits, val_labels)
            final_ece = ece(val_logits, val_labels)
            val_eval_units = float(len(val_logits))

        elapsed = round(time.monotonic() - t0, 3)
        total_compute_units = recal_units + val_eval_units

        epochs_list = [_extract_epoch_number(p) for p in valid_paths]
        metadata = {
            "averaged_checkpoints": [p.name for p in valid_paths],
            "averaged_checkpoint_paths": [str(p) for p in valid_paths],
            "k_averaged": len(valid_paths),
            "epoch_range": [min(epochs_list), max(epochs_list)] if epochs_list else [],
            "averaging_policy": "uniform_last_k_with_bn_recalibration"
            if bn_recalibrated
            else "uniform_last_k",
            "bn_recalibrated": bn_recalibrated,
            "skipped_checkpoints": skipped_checkpoints,
            "val_acc_before": round(base_acc, 6),
            "val_acc_after": round(final_acc, 6),
            "val_nll_before": round(base_nll, 6),
            "val_nll_after": round(final_nll, 6),
            "val_ece_before": round(base_ece, 6),
            "val_ece_after": round(final_ece, 6),
        }

        result = StrategyResult(
            strategy_name=self.name,
            success=True,
            params={"last_k": last_k, "k_averaged": len(valid_paths)},
            seed=context.seed,
            elapsed_wall_s=elapsed,
            compute_units=round(total_compute_units, 2),
            grad_steps=0,
            warnings=[],
            artifact_metadata=metadata,
        )

        return candidate_model, result
