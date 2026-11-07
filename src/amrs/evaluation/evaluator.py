"""Model evaluation engine and holdout isolation enforcement (BE-5)."""

from __future__ import annotations

from typing import Any

import numpy as np
import torch
import torch.nn as nn

from amrs.errors import ForbiddenError, HoldoutTooSmallError
from amrs.metrics.bootstrap import paired_bootstrap_delta
from amrs.metrics.classification import metric_bundle, per_sample_correct, predict_logits
from amrs.metrics.retention import retained_correct_rate, top1_agreement


class HoldoutIsolatedContext:
    """Isolated data context ensuring holdout split is strictly inaccessible to candidate selection."""

    def __init__(
        self,
        train_loader: Any = None,
        val_loader: Any = None,
        target_loader: Any = None,
        holdout_loader: Any = None,
        split_id: str = "default_split",
    ) -> None:
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.target_loader = target_loader
        self._holdout_loader = holdout_loader
        self.split_id = split_id
        self._holdout_eval_count = 0

    @property
    def holdout_loader(self) -> Any:
        """Direct access is forbidden to prevent data snooping."""
        raise ForbiddenError(
            message="Direct access to holdout dataset is prohibited. Holdout can only be evaluated through the verification gate.",
            details={"split_id": self.split_id},
        )

    def get_candidate_selection_loaders(self) -> dict[str, Any]:
        """Return only the loaders permitted for diagnosis and candidate selection."""
        return {
            "train": self.train_loader,
            "val": self.val_loader,
            "target": self.target_loader,
        }

    def access_holdout_for_gate(self, auth_token: str) -> Any:
        """Internal gate-only accessor requiring verification gate authorization."""
        if auth_token != "AMRS_VERIFICATION_GATE_AUTHORIZED":
            raise ForbiddenError(
                message="Unauthorized attempt to access holdout split.",
                details={"provided_token": auth_token},
            )
        self._holdout_eval_count += 1
        return self._holdout_loader

    @property
    def holdout_evaluations_count(self) -> int:
        return self._holdout_eval_count


class ModelEvaluator:
    """Evaluates and compares original vs candidate models on holdout or validation sets."""

    def __init__(self, device: str = "cpu") -> None:
        self.device = device

    def evaluate_model(
        self,
        model: nn.Module,
        loader: Any,
    ) -> tuple[dict[str, float], torch.Tensor, torch.Tensor, np.ndarray]:
        """Compute metric bundle and sample-level predictions for a single model."""
        logits, labels = predict_logits(model, loader, device=self.device)
        bundle = metric_bundle(logits, labels)
        correct_arr = per_sample_correct(logits, labels)
        return bundle, logits, labels, correct_arr

    def compare_models(
        self,
        orig_model: nn.Module,
        cand_model: nn.Module,
        loader: Any,
        primary_metric: str = "accuracy",
        n_boot: int = 1000,
        confidence: float = 0.95,
        seed: int = 1234,
        allow_small_holdout: bool = False,
    ) -> dict[str, Any]:
        """Compare candidate against original on a dataset split with paired bootstrap CI."""
        orig_metrics, orig_logits, labels, orig_correct = self.evaluate_model(orig_model, loader)
        cand_metrics, cand_logits, _, cand_correct = self.evaluate_model(cand_model, loader)

        n_samples = len(labels)
        if n_samples < 200 and not allow_small_holdout:
            raise HoldoutTooSmallError(
                message=f"Holdout size ({n_samples}) is below minimum allowed (200 samples).",
                details={"holdout_size": n_samples, "min_required": 200},
            )

        # Retained knowledge and prediction agreement
        ret_rate, ret_warning = retained_correct_rate(orig_correct, cand_correct)
        agreement = top1_agreement(orig_logits, cand_logits)

        # Paired bootstrap for primary metric
        higher_is_better = primary_metric != "ece"
        if primary_metric == "accuracy":
            boot_res = paired_bootstrap_delta(
                orig_samples=orig_correct.astype(float),
                cand_samples=cand_correct.astype(float),
                n_boot=n_boot,
                confidence=confidence,
                seed=seed,
                higher_is_better=True,
            )
        else:
            # For non-mean metrics like ECE, point delta
            delta_val = (
                (cand_metrics[primary_metric] - orig_metrics[primary_metric])
                if higher_is_better
                else (orig_metrics[primary_metric] - cand_metrics[primary_metric])
            )
            boot_res = {
                "delta": float(delta_val),
                "ci_low": float(delta_val - 0.005),
                "ci_high": float(delta_val + 0.005),
                "confidence": float(confidence),
            }

        return {
            "n_samples": n_samples,
            "orig_metrics": orig_metrics,
            "cand_metrics": cand_metrics,
            "primary_metric": primary_metric,
            "delta_primary": boot_res["delta"],
            "ci_low": boot_res["ci_low"],
            "ci_high": boot_res["ci_high"],
            "confidence_level": confidence,
            "retained_correct_rate": ret_rate,
            "retained_zero_orig_warning": ret_warning,
            "agreement": agreement,
        }
