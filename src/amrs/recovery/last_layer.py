"""Last-layer (classification head) fine-tuning strategy (Section ML-6, ML-6.1).

Freezes the entire backbone, validates that the optimizer contains only head parameters,
and fine-tunes only the classification head while monitoring validation metrics for best epoch selection.
"""

from __future__ import annotations

import copy
import time
from typing import Any

import torch
import torch.nn as nn
import torch.nn.functional as F
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


def _has_identifiable_head(model: nn.Module) -> bool:
    """Check whether ModelAdapter can identify a valid classification head."""
    adapter = ModelAdapter(model)
    try:
        adapter.head_module()
        return True
    except Exception:
        return False


def finetune_last_layer(
    model: nn.Module,
    train_loader: DataLoader | Any,
    val_loader: DataLoader | Any | None = None,
    epochs: int = 5,
    lr: float = 0.01,
    weight_decay: float = 5.0e-4,
    seed: int = 1234,
    device: str = "cpu",
) -> tuple[nn.Module, dict[str, Any]]:
    """Fine-tune only the classification head of the model while freezing the backbone.

    Returns:
        (candidate_model, stats_dict)
    """
    torch.manual_seed(seed)
    adapter = ModelAdapter(model)

    try:
        adapter.head_module()
    except Exception as exc:
        raise ValueError(
            f"Could not identify classification head in model (NO_IDENTIFIABLE_HEAD): {exc}"
        )

    # Deep-copy candidate model so original remains byte-identical
    candidate = copy.deepcopy(model)
    cand_adapter = ModelAdapter(candidate)
    cand_head = cand_adapter.head_module()

    # 1. Freeze entire model, then unfreeze ONLY head parameters
    for param in candidate.parameters():
        param.requires_grad = False

    head_params = cand_adapter.head_params()
    head_param_ids = {id(p) for p in head_params}

    for param in head_params:
        param.requires_grad = True

    # 2. Strict optimizer parameter audit: verify optimizer contains ONLY head parameters
    trainable_params = [p for p in candidate.parameters() if p.requires_grad]
    if len(trainable_params) != len(head_params) or any(
        id(p) not in head_param_ids for p in trainable_params
    ):
        raise RuntimeError(
            "Optimizer parameter audit failed: trainable parameters contain backbone tensors!"
        )

    # Record backbone parameter state before training for immutability verification
    backbone_before = {
        name: p.detach().clone()
        for name, p in candidate.named_parameters()
        if id(p) not in head_param_ids
    }

    # 3. Setup optimizer exclusively on head parameters
    optimizer = torch.optim.Adam(
        head_params,
        lr=lr,
        weight_decay=weight_decay,
    )

    meter = ComputeMeter()
    samples_trained = 0
    grad_steps = 0
    best_val_acc = -1.0
    best_epoch = 0
    best_head_state = copy.deepcopy(cand_head.state_dict())

    # Ensure backbone submodules are in eval mode, and head is in train mode
    candidate.eval()
    cand_head.train()

    non_finite_encountered = False

    for epoch in range(1, epochs + 1):
        for batch in train_loader:
            if isinstance(batch, (tuple, list)):
                x, y = batch[0], batch[1]
            else:
                raise ValueError("Train loader must yield (inputs, targets) tuples.")

            x = x.to(device)
            y = y.to(device)
            n_samples = len(x)

            optimizer.zero_grad()
            logits = candidate(x)
            loss = F.cross_entropy(logits, y)

            if not torch.isfinite(loss):
                non_finite_encountered = True
                break

            loss.backward()
            optimizer.step()

            meter.add_fwd(n_samples)
            meter.add_bwd(n_samples)
            meter.add_grad_step()

            samples_trained += n_samples
            grad_steps += 1

        if non_finite_encountered:
            break

        # Validation evaluation at epoch end for model selection
        if val_loader is not None:
            candidate.eval()
            try:
                v_logits, v_labels = predict_logits(candidate, val_loader, device=device)
                meter.add_fwd(len(v_logits))
                epoch_val_acc = accuracy(v_logits, v_labels)
                if epoch_val_acc > best_val_acc:
                    best_val_acc = epoch_val_acc
                    best_epoch = epoch
                    best_head_state = copy.deepcopy(cand_head.state_dict())
            except Exception:
                pass
            cand_head.train()

    # Restore best validation head weights if val_loader was used and succeeded
    if val_loader is not None and best_val_acc >= 0.0:
        cand_head.load_state_dict(best_head_state)

    candidate.eval()

    # 4. Assert strict backbone immutability: zero diff on all non-head parameters
    max_backbone_diff = 0.0
    for name, p in candidate.named_parameters():
        if id(p) not in head_param_ids:
            diff = float(torch.max(torch.abs(p - backbone_before[name])).item())
            if diff > max_backbone_diff:
                max_backbone_diff = diff
            if not torch.equal(p, backbone_before[name]):
                raise RuntimeError(
                    f"Backbone parameter '{name}' was mutated during last-layer fine-tuning (diff: {diff})!"
                )

    stats = {
        "epochs": epochs,
        "lr": lr,
        "weight_decay": weight_decay,
        "samples_trained": samples_trained,
        "grad_steps": grad_steps,
        "compute_units": meter.units,
        "best_epoch": best_epoch if val_loader is not None else epochs,
        "head_param_count": sum(p.numel() for p in head_params),
        "backbone_param_count": sum(p.numel() for p in backbone_before.values()),
        "max_backbone_diff": max_backbone_diff,
        "non_finite_encountered": non_finite_encountered,
    }

    return candidate, stats


class LastLayerFinetuneStrategy(RecoveryStrategy):
    """Fine-tunes only the classification head while preserving a frozen, byte-identical backbone."""

    @property
    def name(self) -> str:
        return "last_layer_finetune"

    def is_applicable(self, model: ModelAdapter, context: RecoveryContext) -> Applicability:
        """Check prerequisites for last layer fine-tuning."""
        if not _has_identifiable_head(model.model):
            return Applicability(
                can_apply=False,
                reason="NO_IDENTIFIABLE_HEAD",
                message="Model has no identifiable classification head.",
            )

        has_train = context.train_loader is not None
        has_val = context.val_loader is not None
        if not has_train and not has_val:
            return Applicability(
                can_apply=False,
                reason="MISSING_TRAINING_DATA",
                message="Training data is required for last-layer fine-tuning.",
            )

        return Applicability(can_apply=True)

    def estimate_cost(
        self, context: RecoveryContext, model: ModelAdapter | None = None
    ) -> CostEstimate:
        """Estimate compute units: epochs * N_train * (1 + 3 * r_head) (BR12)."""
        adapter = model or context.adapter
        epochs = 5
        if context.config and hasattr(context.config, "strategies"):
            cfg = getattr(context.config.strategies, "last_layer_finetune", None)
            if cfg is not None:
                epochs = getattr(cfg, "epochs", 5)

        loader = context.train_loader or context.val_loader
        n_train = 1000
        if loader is not None:
            if hasattr(loader, "dataset") and hasattr(loader.dataset, "__len__"):
                try:
                    n_train = len(loader.dataset)
                except Exception:
                    pass
            elif hasattr(loader, "__len__"):
                batch_size = getattr(loader, "batch_size", 32) or 32
                n_train = len(loader) * batch_size

        r_head = 0.05
        if adapter is not None:
            try:
                head_p = sum(p.numel() for p in adapter.head_params())
                total_p = max(1, adapter.num_params())
                r_head = max(0.01, min(1.0, head_p / total_p))
            except Exception:
                pass

        fwd_samples = epochs * n_train
        bwd_samples = epochs * n_train * r_head
        units = round(fwd_samples + 3.0 * bwd_samples, 2)

        return CostEstimate(
            estimated_units=float(units),
            details={
                "epochs": epochs,
                "fwd_samples": fwd_samples,
                "bwd_samples": bwd_samples,
                "head_param_ratio": r_head,
                "strategy": self.name,
            },
        )

    def apply(
        self, model_copy: nn.Module, context: RecoveryContext
    ) -> tuple[nn.Module, StrategyResult]:
        """Apply head-only fine-tuning on a deep copy of model using training inputs."""
        t0 = time.monotonic()

        # Split isolation check: NEVER evaluate or train on holdout
        if hasattr(context, "_holdout_loader") or "holdout" in context.extra:
            raise ValueError(
                "Split discipline violation: holdout data cannot enter LastLayerFinetuneStrategy."
            )

        if not _has_identifiable_head(model_copy):
            return model_copy, StrategyResult(
                strategy_name=self.name,
                success=False,
                error_message="Could not identify classification head in model (NO_IDENTIFIABLE_HEAD).",
            )

        # Resolve training loader: train_loader preferred, fallback to val_loader
        train_loader = context.train_loader or context.val_loader
        if train_loader is None:
            return model_copy, StrategyResult(
                strategy_name=self.name,
                success=False,
                error_message="Missing training data for last-layer fine-tuning (MISSING_TRAINING_DATA).",
            )

        # Configuration parameters
        epochs = 5
        lr = 0.01
        weight_decay = 5.0e-4

        if context.config and hasattr(context.config, "strategies"):
            cfg = getattr(context.config.strategies, "last_layer_finetune", None)
            if cfg is not None:
                epochs = getattr(cfg, "epochs", 5)
                lr = getattr(cfg, "lr", 0.01)
                weight_decay = getattr(cfg, "weight_decay", 5.0e-4)

        # Baseline validation metrics before fine-tuning
        val_acc_before = 0.0
        val_nll_before = 0.0
        val_ece_before = 0.0
        if context.val_loader is not None:
            try:
                v_logits, v_labels = predict_logits(
                    model_copy, context.val_loader, device=context.device
                )
                val_acc_before = accuracy(v_logits, v_labels)
                val_nll_before = nll(v_logits, v_labels)
                val_ece_before = ece(v_logits, v_labels)
            except Exception:
                pass

        try:
            candidate_model, stats = finetune_last_layer(
                model=model_copy,
                train_loader=train_loader,
                val_loader=context.val_loader,
                epochs=epochs,
                lr=lr,
                weight_decay=weight_decay,
                seed=context.seed,
                device=context.device,
            )
        except Exception as exc:
            return model_copy, StrategyResult(
                strategy_name=self.name,
                success=False,
                error_message=f"Fine-tuning failed: {exc}",
            )

        if stats.get("non_finite_encountered", False):
            return model_copy, StrategyResult(
                strategy_name=self.name,
                success=False,
                error_message="Non-finite loss encountered during head fine-tuning.",
            )

        # Final validation metrics after fine-tuning
        val_acc_after = val_acc_before
        val_nll_after = val_nll_before
        val_ece_after = val_ece_before
        if context.val_loader is not None:
            try:
                v_logits, v_labels = predict_logits(
                    candidate_model, context.val_loader, device=context.device
                )
                val_acc_after = accuracy(v_logits, v_labels)
                val_nll_after = nll(v_logits, v_labels)
                val_ece_after = ece(v_logits, v_labels)
            except Exception:
                pass

        elapsed = round(time.monotonic() - t0, 3)

        metadata = {
            "epochs": epochs,
            "lr": lr,
            "weight_decay": weight_decay,
            "samples_trained": stats["samples_trained"],
            "grad_steps": stats["grad_steps"],
            "best_epoch": stats["best_epoch"],
            "head_param_count": stats["head_param_count"],
            "backbone_param_count": stats["backbone_param_count"],
            "max_backbone_diff": stats["max_backbone_diff"],
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
            params={"epochs": epochs, "lr": lr, "weight_decay": weight_decay},
            seed=context.seed,
            elapsed_wall_s=elapsed,
            compute_units=float(stats["compute_units"]),
            grad_steps=stats["grad_steps"],
            warnings=[],
            artifact_metadata=metadata,
        )

        return candidate_model, result
