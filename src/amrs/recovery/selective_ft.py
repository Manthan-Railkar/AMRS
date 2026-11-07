"""Selective fine-tuning with L2-SP strategy (Section ML-7, ML-7.1).

Unfreezes only the top-N layer groups plus the classification head, freezing all
other parameters and regularizing trainable weights toward their original checkpoint
anchors to mitigate catastrophic forgetting.
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
from amrs.recovery.l2sp import L2SPRegularizer


def _has_identifiable_head(model: nn.Module) -> bool:
    """Check whether ModelAdapter can identify a valid classification head."""
    adapter = ModelAdapter(model)
    try:
        adapter.head_module()
        return True
    except Exception:
        return False


def select_trainable_groups(
    model: nn.Module,
    unfreeze_top_n: int = 2,
) -> tuple[list[nn.Parameter], list[nn.Parameter], list[str]]:
    """Select the top-N layer groups plus the classification head.
    
    Args:
        model: PyTorch model module.
        unfreeze_top_n: Number of backbone layer groups to unfreeze.
        
    Returns:
        (trainable_parameters, frozen_parameters, selected_group_names)
    """
    adapter = ModelAdapter(model)
    head_params = adapter.head_params()
    head_ids = {id(p) for p in head_params}

    all_groups = adapter.layer_groups()

    # Separate groups into backbone groups (excluding head) and head
    backbone_groups: list[list[nn.Parameter]] = []
    for grp in all_groups:
        bb_grp = [p for p in grp if id(p) not in head_ids]
        if bb_grp:
            backbone_groups.append(bb_grp)

    num_bb = len(backbone_groups)
    start_idx = max(0, num_bb - unfreeze_top_n) if unfreeze_top_n > 0 else num_bb
    selected_backbone = backbone_groups[start_idx:] if unfreeze_top_n > 0 else []

    trainable_params: list[nn.Parameter] = []
    trainable_ids: set[int] = set()

    for grp in selected_backbone:
        for p in grp:
            if id(p) not in trainable_ids:
                trainable_params.append(p)
                trainable_ids.add(id(p))

    for p in head_params:
        if id(p) not in trainable_ids:
            trainable_params.append(p)
            trainable_ids.add(id(p))

    frozen_params = [p for p in model.parameters() if id(p) not in trainable_ids]

    selected_group_names = [f"backbone_group_{i}" for i in range(start_idx, num_bb)] + ["head"]

    return trainable_params, frozen_params, selected_group_names


def _get_unfrozen_param_ratio(adapter: ModelAdapter | None, unfreeze_top_n: int = 2) -> float:
    """Calculate the ratio of unfrozen parameters (top-N backbone + head) to total parameters."""
    if adapter is None:
        return 0.35
    try:
        trainable, _, _ = select_trainable_groups(adapter.model, unfreeze_top_n=unfreeze_top_n)
        unfrozen_count = sum(p.numel() for p in trainable)
        total_params = max(1, adapter.num_params())
        return max(0.05, min(1.0, unfrozen_count / total_params))
    except Exception:
        return 0.35


def finetune_selective_l2sp(
    model: nn.Module,
    train_loader: DataLoader | Any,
    val_loader: DataLoader | Any | None = None,
    unfreeze_top_n: int = 2,
    epochs: int = 8,
    lr: float = 0.003,
    l2sp_alpha: float = 0.1,
    weight_decay: float = 5.0e-4,
    augment: bool = True,
    seed: int = 1234,
    device: str = "cpu",
) -> tuple[nn.Module, dict[str, Any]]:
    """Fine-tune top-N backbone layer groups plus classification head with L2-SP anchors.
    
    Returns:
        (candidate_model, stats_dict)
    """
    torch.manual_seed(seed)

    if not _has_identifiable_head(model):
        raise ValueError("Model has no identifiable classification head (NO_IDENTIFIABLE_HEAD).")

    # 1. Deep-copy model so original remains strictly byte-identical
    candidate = copy.deepcopy(model)

    # 2. Select top-N layer groups plus the head
    trainable_params, frozen_params, group_names = select_trainable_groups(
        candidate,
        unfreeze_top_n=unfreeze_top_n,
    )

    trainable_ids = {id(p) for p in trainable_params}
    frozen_ids = {id(p) for p in frozen_params}

    # Freeze entire model, then unfreeze only selected parameters
    for p in candidate.parameters():
        p.requires_grad = False

    for p in trainable_params:
        p.requires_grad = True

    # 3. Strict optimizer parameter audit: verify optimizer contains only trainable parameters
    active_params = [p for p in candidate.parameters() if p.requires_grad]
    if len(active_params) != len(trainable_params) or any(id(p) not in trainable_ids for p in active_params):
        raise RuntimeError("Optimizer parameter audit failed: active parameters contain unselected tensors!")

    # Snapshot frozen parameters before training for immutability verification
    frozen_before = {
        name: p.detach().clone()
        for name, p in candidate.named_parameters()
        if id(p) in frozen_ids
    }

    # 4. Initialize L2-SP regularizer with immutable anchors
    regularizer = L2SPRegularizer(trainable_params, alpha=l2sp_alpha)
    initial_penalty = regularizer.penalty_value()

    # 5. Optimizer exclusively on trainable parameters
    optimizer = torch.optim.Adam(
        trainable_params,
        lr=lr,
        weight_decay=weight_decay,
    )

    # Verify no frozen parameters leaked into optimizer
    for group in optimizer.param_groups:
        for p in group["params"]:
            if id(p) in frozen_ids:
                raise RuntimeError("Optimizer parameter audit failed: frozen tensor found in optimizer group!")

    meter = ComputeMeter()
    samples_trained = 0
    grad_steps = 0
    best_val_acc = -1.0
    best_epoch = 0
    best_state = copy.deepcopy(candidate.state_dict())

    # Module isolation: set candidate to eval, and only submodules with trainable parameters to train
    candidate.eval()
    for m in candidate.modules():
        if any(id(p) in trainable_ids for p in m.parameters(recurse=False)):
            m.train()

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
            task_loss = F.cross_entropy(logits, y)

            if not torch.isfinite(task_loss):
                non_finite_encountered = True
                break

            total_loss = regularizer.loss(task_loss)

            if not torch.isfinite(total_loss):
                non_finite_encountered = True
                break

            total_loss.backward()
            optimizer.step()

            meter.add_fwd(n_samples)
            meter.add_bwd(n_samples)
            meter.add_grad_step()

            samples_trained += n_samples
            grad_steps += 1

        if non_finite_encountered:
            break

        # Validation evaluation at epoch end for candidate selection
        if val_loader is not None:
            candidate.eval()
            try:
                v_logits, v_labels = predict_logits(candidate, val_loader, device=device)
                meter.add_fwd(len(v_logits))
                epoch_val_acc = accuracy(v_logits, v_labels)
                if epoch_val_acc > best_val_acc:
                    best_val_acc = epoch_val_acc
                    best_epoch = epoch
                    best_state = copy.deepcopy(candidate.state_dict())
            except Exception:
                pass

            # Restore train mode on trainable submodules
            candidate.eval()
            for m in candidate.modules():
                if any(id(p) in trainable_ids for p in m.parameters(recurse=False)):
                    m.train()

    # Restore best validation checkpoint if val_loader was evaluated and succeeded
    if val_loader is not None and best_val_acc >= 0.0:
        candidate.load_state_dict(best_state)

    candidate.eval()

    # 6. Verify strict immutability of unselected / frozen parameters
    max_frozen_diff = 0.0
    for name, p in candidate.named_parameters():
        if id(p) in frozen_ids:
            diff = float(torch.max(torch.abs(p - frozen_before[name])).item())
            if diff > max_frozen_diff:
                max_frozen_diff = diff
            if not torch.equal(p, frozen_before[name]):
                raise RuntimeError(
                    f"Frozen parameter '{name}' was mutated during selective fine-tuning (diff: {diff})!"
                )

    # Verify anchors remain unmodified
    if not regularizer.verify_anchors_unmodified():
        raise RuntimeError("L2-SP anchors were mutated during training!")

    final_penalty = regularizer.penalty_value()
    l2sp_contribution = regularizer.contribution_value()

    stats = {
        "selected_groups": group_names,
        "unfreeze_top_n": unfreeze_top_n,
        "epochs": epochs,
        "lr": lr,
        "l2sp_alpha": l2sp_alpha,
        "weight_decay": weight_decay,
        "augment": augment,
        "samples_trained": samples_trained,
        "grad_steps": grad_steps,
        "compute_units": meter.units,
        "best_epoch": best_epoch if val_loader is not None else epochs,
        "trainable_param_count": sum(p.numel() for p in trainable_params),
        "frozen_param_count": sum(p.numel() for p in frozen_params),
        "l2sp_initial_penalty": initial_penalty,
        "l2sp_final_penalty": final_penalty,
        "l2sp_contribution": l2sp_contribution,
        "max_frozen_diff": max_frozen_diff,
        "non_finite_encountered": non_finite_encountered,
    }

    return candidate, stats


class SelectiveFinetuneL2spStrategy(RecoveryStrategy):
    """Selective fine-tuning with L2-SP anchor regularization (ML-7, ML-7.1)."""

    @property
    def name(self) -> str:
        return "selective_finetune_l2sp"

    def is_applicable(self, model: ModelAdapter, context: RecoveryContext) -> Applicability:
        """Check prerequisites for selective fine-tuning."""
        if not _has_identifiable_head(model.model):
            return Applicability(
                can_apply=False,
                reason="NO_IDENTIFIABLE_HEAD",
                message="Model has no identifiable classification head for selective fine-tuning.",
            )

        has_train = context.train_loader is not None
        has_val = context.val_loader is not None
        if not has_train and not has_val:
            return Applicability(
                can_apply=False,
                reason="MISSING_TRAINING_DATA",
                message="Training data required for selective fine-tuning.",
            )

        return Applicability(can_apply=True)

    def estimate_cost(self, context: RecoveryContext, model: ModelAdapter | None = None) -> CostEstimate:
        """Estimate compute units: epochs * N_train * (1 + 3 * r_unfrozen) (BR12)."""
        adapter = model or context.adapter
        epochs = 8
        unfreeze_top_n = 2

        if context.config and hasattr(context.config, "strategies"):
            cfg = getattr(context.config.strategies, "selective_finetune_l2sp", None)
            if cfg is not None:
                epochs = getattr(cfg, "epochs", 8)
                unfreeze_top_n = getattr(cfg, "unfreeze_top_n", 2)

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

        r_unfrozen = _get_unfrozen_param_ratio(adapter, unfreeze_top_n=unfreeze_top_n)

        fwd_samples = epochs * n_train
        bwd_samples = epochs * n_train * r_unfrozen
        units = round(fwd_samples + 3.0 * bwd_samples, 2)

        return CostEstimate(
            estimated_units=float(units),
            details={
                "epochs": epochs,
                "unfreeze_top_n": unfreeze_top_n,
                "fwd_samples": fwd_samples,
                "bwd_samples": bwd_samples,
                "unfrozen_param_ratio": r_unfrozen,
                "strategy": self.name,
            },
        )

    def apply(self, model_copy: nn.Module, context: RecoveryContext) -> tuple[nn.Module, StrategyResult]:
        """Execute selective fine-tuning with L2-SP anchor regularization."""
        t0 = time.monotonic()

        # Split isolation check: NEVER evaluate or train on holdout
        if hasattr(context, "_holdout_loader") or "holdout" in context.extra:
            raise ValueError("Split discipline violation: holdout data cannot enter SelectiveFinetuneL2spStrategy.")

        if not _has_identifiable_head(model_copy):
            return model_copy, StrategyResult(
                strategy_name=self.name,
                success=False,
                error_message="Could not identify classification head in model (NO_IDENTIFIABLE_HEAD).",
            )

        train_loader = context.train_loader or context.val_loader
        if train_loader is None:
            return model_copy, StrategyResult(
                strategy_name=self.name,
                success=False,
                error_message="Missing training data for selective fine-tuning (MISSING_TRAINING_DATA).",
            )

        # Configuration parameters
        unfreeze_top_n = 2
        epochs = 8
        lr = 0.003
        l2sp_alpha = 0.1
        weight_decay = 5.0e-4
        augment = True

        if context.config and hasattr(context.config, "strategies"):
            cfg = getattr(context.config.strategies, "selective_finetune_l2sp", None)
            if cfg is not None:
                unfreeze_top_n = getattr(cfg, "unfreeze_top_n", 2)
                epochs = getattr(cfg, "epochs", 8)
                lr = getattr(cfg, "lr", 0.003)
                l2sp_alpha = getattr(cfg, "l2sp_alpha", 0.1)
                weight_decay = getattr(cfg, "weight_decay", 5.0e-4)
                augment = getattr(cfg, "augment", True)

        # Baseline validation metrics before fine-tuning
        val_acc_before = 0.0
        val_nll_before = 0.0
        val_ece_before = 0.0
        if context.val_loader is not None:
            try:
                v_logits, v_labels = predict_logits(model_copy, context.val_loader, device=context.device)
                val_acc_before = accuracy(v_logits, v_labels)
                val_nll_before = nll(v_logits, v_labels)
                val_ece_before = ece(v_logits, v_labels)
            except Exception:
                pass

        try:
            candidate_model, stats = finetune_selective_l2sp(
                model=model_copy,
                train_loader=train_loader,
                val_loader=context.val_loader,
                unfreeze_top_n=unfreeze_top_n,
                epochs=epochs,
                lr=lr,
                l2sp_alpha=l2sp_alpha,
                weight_decay=weight_decay,
                augment=augment,
                seed=context.seed,
                device=context.device,
            )
        except Exception as exc:
            return model_copy, StrategyResult(
                strategy_name=self.name,
                success=False,
                error_message=f"Selective fine-tuning failed: {exc}",
            )

        if stats.get("non_finite_encountered", False):
            return model_copy, StrategyResult(
                strategy_name=self.name,
                success=False,
                error_message="Non-finite loss encountered during selective fine-tuning.",
            )

        # Validation metrics after fine-tuning
        val_acc_after = val_acc_before
        val_nll_after = val_nll_before
        val_ece_after = val_ece_before
        if context.val_loader is not None:
            try:
                v_logits, v_labels = predict_logits(candidate_model, context.val_loader, device=context.device)
                val_acc_after = accuracy(v_logits, v_labels)
                val_nll_after = nll(v_logits, v_labels)
                val_ece_after = ece(v_logits, v_labels)
            except Exception:
                pass

        elapsed = round(time.monotonic() - t0, 3)

        metadata = {
            "selected_groups": stats["selected_groups"],
            "unfreeze_top_n": unfreeze_top_n,
            "epochs": epochs,
            "lr": lr,
            "l2sp_alpha": l2sp_alpha,
            "weight_decay": weight_decay,
            "augment": augment,
            "samples_trained": stats["samples_trained"],
            "grad_steps": stats["grad_steps"],
            "best_epoch": stats["best_epoch"],
            "trainable_param_count": stats["trainable_param_count"],
            "frozen_param_count": stats["frozen_param_count"],
            "l2sp_initial_penalty": stats["l2sp_initial_penalty"],
            "l2sp_final_penalty": stats["l2sp_final_penalty"],
            "l2sp_contribution": stats["l2sp_contribution"],
            "max_frozen_diff": stats["max_frozen_diff"],
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
            params={
                "unfreeze_top_n": unfreeze_top_n,
                "epochs": epochs,
                "lr": lr,
                "l2sp_alpha": l2sp_alpha,
                "weight_decay": weight_decay,
            },
            seed=context.seed,
            elapsed_wall_s=elapsed,
            compute_units=float(stats["compute_units"]),
            grad_steps=stats["grad_steps"],
            warnings=[],
            artifact_metadata=metadata,
        )

        return candidate_model, result
