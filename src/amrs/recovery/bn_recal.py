"""BatchNorm running-statistics recalibration strategy (Section ML-4, ML-4.1).

Recomputes BatchNorm running means and variances using permitted unlabeled target inputs
(or validation inputs when target is absent), without gradient updates or parameter mutation.
"""

from __future__ import annotations

import copy
import time
from typing import Any

import numpy as np
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


def recalibrate_bn_stats(
    model: nn.Module,
    loader: DataLoader | Any,
    max_batches: int = 100,
    momentum: float | None = None,
    reset_stats: bool = True,
    device: str = "cpu",
) -> tuple[nn.Module, dict[str, Any]]:
    """Recompute BatchNorm running statistics on unlabeled data without parameter updates.

    Args:
        model: PyTorch model containing BatchNorm layers.
        loader: DataLoader providing unlabeled evaluation/target batches.
        max_batches: Maximum batches to iterate.
        momentum: Momentum for running stats update (None uses cumulative moving average).
        reset_stats: If True, resets running stats before accumulating from loader.
        device: Device to place tensors on.

    Returns:
        (recalibrated_model, stats_dict)
    """
    adapter = ModelAdapter(model)
    bn_layers = adapter.bn_layers()
    if not bn_layers:
        raise ValueError("Model contains no BatchNorm layers to recalibrate (NO_BN_LAYERS).")

    # Deep-copy model so original is never mutated
    candidate = copy.deepcopy(model)
    candidate_adapter = ModelAdapter(candidate)
    cand_bn_layers = candidate_adapter.bn_layers()

    # Track original parameters to verify strict immutability of learned weights
    orig_params = {name: param.detach().clone() for name, param in candidate.named_parameters()}

    # Record original submodule training states
    orig_modes = {mod: mod.training for mod in candidate.modules()}

    # Record initial running stats for divergence calculation
    initial_stats: list[tuple[torch.Tensor, torch.Tensor]] = [
        (bn.running_mean.detach().clone(), bn.running_var.detach().clone())
        for bn in cand_bn_layers
        if bn.running_mean is not None and bn.running_var is not None
    ]

    # Prepare BatchNorm layers for recalibration
    for bn in cand_bn_layers:
        if reset_stats:
            bn.reset_running_stats()
        bn.momentum = momentum

    # Crucial: Put entire model in eval mode, then enable training mode ONLY on BatchNorm layers
    candidate.eval()
    for bn in cand_bn_layers:
        bn.train(True)

    meter = ComputeMeter()
    batches_processed = 0
    samples_processed = 0

    with torch.no_grad():
        for batch in loader:
            if batches_processed >= max_batches:
                break

            if isinstance(batch, (tuple, list)):
                x = batch[0]
            else:
                x = batch

            if len(x) == 0:
                continue

            x = x.to(device)
            n_samples = len(x)

            # Forward pass: updates BatchNorm running stats in place; no gradients
            _ = candidate(x)

            meter.add_fwd(n_samples)
            batches_processed += 1
            samples_processed += n_samples

    # Restore module training modes and ensure final candidate is in eval mode
    for mod, mode in orig_modes.items():
        mod.train(mode)
    candidate.eval()

    if batches_processed == 0 or samples_processed == 0:
        raise ValueError("No data samples were processed during recalibration (EMPTY_DATA).")

    # Verify affine weights and all non-BN parameters are completely unchanged
    for name, param in candidate.named_parameters():
        if not torch.equal(param, orig_params[name]):
            raise RuntimeError(
                f"Learned parameter '{name}' was unexpectedly modified during BatchNorm recalibration!"
            )

    # Compute running statistics divergence (difference from initial stats)
    mean_diffs: list[float] = []
    var_diffs: list[float] = []
    for i, bn in enumerate(cand_bn_layers):
        if bn.running_mean is not None and bn.running_var is not None and i < len(initial_stats):
            init_mean, init_var = initial_stats[i]
            mean_diff = float(torch.mean(torch.abs(bn.running_mean - init_mean)).item())
            var_diff = float(torch.mean(torch.abs(bn.running_var - init_var)).item())
            mean_diffs.append(mean_diff)
            var_diffs.append(var_diff)

    stats = {
        "batches_processed": batches_processed,
        "samples_processed": samples_processed,
        "layers_updated": len(cand_bn_layers),
        "compute_units": meter.units,
        "mean_divergence": float(np.mean(mean_diffs)) if mean_diffs else 0.0,
        "var_divergence": float(np.mean(var_diffs)) if var_diffs else 0.0,
    }

    return candidate, stats


class BnRecalibrationStrategy(RecoveryStrategy):
    """BatchNorm running-statistics recalibration strategy using target or validation inputs."""

    @property
    def name(self) -> str:
        return "bn_recalibration"

    def is_applicable(self, model: ModelAdapter, context: RecoveryContext) -> Applicability:
        """Check prerequisites for BatchNorm recalibration."""
        if not model.supports_bn():
            return Applicability(
                can_apply=False,
                reason="NO_BN_LAYERS",
                message="Model contains no BatchNorm layers to recalibrate.",
            )

        has_target = context.target_loader is not None
        has_val = context.val_loader is not None
        if not has_target and not has_val:
            return Applicability(
                can_apply=False,
                reason="MISSING_TARGET",
                message="Neither target_loader nor val_loader is available for recalibration.",
            )

        return Applicability(can_apply=True)

    def estimate_cost(
        self, context: RecoveryContext, model: ModelAdapter | None = None
    ) -> CostEstimate:
        """Estimate compute units: pure forward passes up to max_batches (BR12)."""
        max_batches = 100
        if context.config and hasattr(context.config, "strategies"):
            cfg = getattr(context.config.strategies, "bn_recalibration", None)
            if cfg is not None:
                max_batches = getattr(cfg, "max_batches", 100)

        loader = context.target_loader or context.val_loader
        batch_size = 32
        if loader and hasattr(loader, "batch_size"):
            batch_size = getattr(loader, "batch_size", 32) or 32

        if loader and hasattr(loader, "__len__"):
            num_batches = min(max_batches, len(loader))
            fwd_samples = num_batches * batch_size
        else:
            fwd_samples = min(max_batches * batch_size, 3200)

        return CostEstimate(
            estimated_units=float(fwd_samples),
            details={"fwd_samples": fwd_samples, "bwd_samples": 0, "strategy": self.name},
        )

    def apply(
        self, model_copy: nn.Module, context: RecoveryContext
    ) -> tuple[nn.Module, StrategyResult]:
        """Apply BatchNorm recalibration on a deep copy of model using permitted data."""
        t0 = time.monotonic()

        # Split isolation check: NEVER touch holdout
        if hasattr(context, "_holdout_loader") or "holdout" in context.extra:
            raise ValueError(
                "Split discipline violation: holdout data cannot enter BnRecalibrationStrategy."
            )

        adapter = ModelAdapter(model_copy)
        if not adapter.supports_bn():
            return model_copy, StrategyResult(
                strategy_name=self.name,
                success=False,
                error_message="Model has no BatchNorm layers (NO_BN_LAYERS).",
            )

        # Resolve data source: target_loader first, falling back to val_loader
        data_source: str
        loader: Any
        if context.target_loader is not None:
            data_source = "target"
            loader = context.target_loader
        elif context.val_loader is not None:
            data_source = "val"
            loader = context.val_loader
        else:
            return model_copy, StrategyResult(
                strategy_name=self.name,
                success=False,
                error_message="Missing target and validation data for recalibration (MISSING_TARGET).",
            )

        # Config parameters
        max_batches = 100
        momentum: float | None = None
        if context.config and hasattr(context.config, "strategies"):
            cfg = getattr(context.config.strategies, "bn_recalibration", None)
            if cfg is not None:
                max_batches = getattr(cfg, "max_batches", 100)
                momentum = getattr(cfg, "momentum", None)

        # Collect before validation metrics if val_loader exists
        val_acc_before = 0.0
        val_nll_before = 0.0
        val_ece_before = 0.0
        if context.val_loader is not None:
            try:
                logits_before, labels_before = predict_logits(
                    model_copy, context.val_loader, device=context.device
                )
                val_acc_before = accuracy(logits_before, labels_before)
                val_nll_before = nll(logits_before, labels_before)
                val_ece_before = ece(logits_before, labels_before)
            except Exception:
                pass

        # Execute recalibration on a deep copy
        try:
            candidate_model, stats = recalibrate_bn_stats(
                model=model_copy,
                loader=loader,
                max_batches=max_batches,
                momentum=momentum,
                reset_stats=True,
                device=context.device,
            )
        except Exception as exc:
            return model_copy, StrategyResult(
                strategy_name=self.name,
                success=False,
                error_message=f"Recalibration failed: {exc}",
            )

        # Collect after validation metrics
        val_acc_after = val_acc_before
        val_nll_after = val_nll_before
        val_ece_after = val_ece_before
        if context.val_loader is not None:
            try:
                logits_after, labels_after = predict_logits(
                    candidate_model, context.val_loader, device=context.device
                )
                val_acc_after = accuracy(logits_after, labels_after)
                val_nll_after = nll(logits_after, labels_after)
                val_ece_after = ece(logits_after, labels_after)
            except Exception:
                pass

        elapsed = round(time.monotonic() - t0, 3)

        metadata = {
            "data_source": data_source,
            "max_batches": max_batches,
            "batches_processed": stats["batches_processed"],
            "samples_processed": stats["samples_processed"],
            "layers_updated": stats["layers_updated"],
            "mean_divergence": stats["mean_divergence"],
            "var_divergence": stats["var_divergence"],
            "val_acc_before": round(val_acc_before, 6),
            "val_acc_after": round(val_acc_after, 6),
            "val_ece_before": round(val_ece_before, 6),
            "val_ece_after": round(val_ece_after, 6),
            "val_nll_before": round(val_nll_before, 6),
            "val_nll_after": round(val_nll_after, 6),
        }

        result = StrategyResult(
            strategy_name=self.name,
            success=True,
            params={"max_batches": max_batches, "momentum": momentum, "data_source": data_source},
            seed=context.seed,
            elapsed_wall_s=elapsed,
            compute_units=float(stats["compute_units"]),
            grad_steps=0,  # Zero gradient steps (BR12)
            warnings=[],
            artifact_metadata=metadata,
        )

        return candidate_model, result
