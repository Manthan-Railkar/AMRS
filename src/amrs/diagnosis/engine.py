"""Diagnosis engine orchestrating evidence gathering, pure rules, and multi-label ranking (ML-1 / Section 2.8)."""

from __future__ import annotations

import logging
from typing import Any

import torch.nn as nn
from torch.utils.data import DataLoader

from amrs.config import load_config
from amrs.diagnosis.probes import (
    analyze_history_trend,
    analyze_instability,
    compute_acc_and_gap,
    compute_bn_divergence,
    fit_linear_probe,
    fit_temperature_diagnostic,
)
from amrs.diagnosis.rules import (
    check_bn_drift,
    check_head_degradation,
    check_healthy,
    check_instability,
    check_miscalibration,
    check_overfitting,
)
from amrs.schemas import (
    ConfigDefaultsResponse,
    DiagnosisConfig,
    DiagnosisItem,
    DiagnosisReport,
)

logger = logging.getLogger("amrs.diagnosis")

TIE_BREAK_ORDER: list[str] = [
    "bn_drift",
    "head_degradation",
    "instability",
    "overfitting",
    "miscalibration",
]


class DiagnosisEngine:
    """Deterministic, evidence-based classifier diagnosis service.

    Guarantees:
    - Holdout split is strictly inaccessible and never evaluated.
    - Pure rule execution with thresholds loaded from validated config.
    - Deterministic confidence scores and tie-breaking order.
    - Explicit not_evaluable tracking for missing evidence or unsupported architectures.
    """

    def __init__(self, config: DiagnosisConfig | ConfigDefaultsResponse | None = None) -> None:
        if config is None:
            self.config = load_config().diagnosis
        elif isinstance(config, ConfigDefaultsResponse):
            self.config = config.diagnosis
        else:
            self.config = config

    def _extract_loaders(self, data: Any) -> tuple[DataLoader, DataLoader, DataLoader | None]:
        """Extract train, val, and optional target loaders without ever accessing holdout."""
        # HoldoutIsolatedContext or duck-typing get_candidate_selection_loaders
        if hasattr(data, "get_candidate_selection_loaders"):
            loaders = data.get_candidate_selection_loaders()
            return loaders["train"], loaders["val"], loaders.get("target")

        if isinstance(data, dict):
            return data["train"], data["val"], data.get("target")

        if hasattr(data, "train") and hasattr(data, "val"):
            return data.train, data.val, getattr(data, "target", None)

        if hasattr(data, "train_loader") and hasattr(data, "val_loader"):
            return data.train_loader, data.val_loader, getattr(data, "target_loader", None)

        raise ValueError(
            "Data object must provide train and val loaders (e.g. HoldoutIsolatedContext, dict, or DataBundle)."
        )

    def diagnose(
        self,
        model: nn.Module,
        data: Any,
        history: list[dict[str, Any]] | None = None,
        config_override: DiagnosisConfig | None = None,
        seed: int = 1234,
        device: str = "cpu",
    ) -> DiagnosisReport:
        """Run diagnostic probes, apply failure rules, and return ranked multi-label report."""
        cfg = config_override or self.config
        train_loader, val_loader, target_loader = self._extract_loaders(data)

        # 1. Classification performance & Generalization gap probe
        acc_gap_res = compute_acc_and_gap(model, train_loader, val_loader, device=device)
        train_acc = acc_gap_res["train_acc"]
        val_acc = acc_gap_res["val_acc"]
        gap = acc_gap_res["gap"]
        val_logits = acc_gap_res["val_logits"]
        val_labels = acc_gap_res["val_labels"]

        # 2. History trend probe (validation loss rising while train loss falling)
        history_trend_res = analyze_history_trend(
            history, val_loss_rise_epochs=cfg.overfitting.val_loss_rise_epochs
        )

        # 3. Calibration & Temperature scaling diagnostic
        temp_res = fit_temperature_diagnostic(
            val_logits, val_labels, ece_bins=cfg.miscalibration.ece_bins
        )

        # 4. BatchNorm running statistics divergence probe
        eval_bn_loader = target_loader if target_loader is not None else val_loader
        bn_res = compute_bn_divergence(model, eval_bn_loader, device=device)

        # 5. Training instability probe (loss spike & detrended CV)
        instability_res = analyze_instability(
            history, spike_ratio=cfg.instability.spike_ratio, cv_min=cfg.instability.cv_min
        )

        # 6. Frozen linear probe for head degradation
        probe_res = fit_linear_probe(
            model, train_loader, val_loader, model_val_acc=val_acc, device=device, seed=seed
        )

        # Evaluate pure rules
        fired_overfit, item_overfit, raw_overfit = check_overfitting(
            train_acc, val_acc, history_trend_res, cfg.overfitting
        )
        fired_miscal, item_miscal, raw_miscal = check_miscalibration(temp_res, cfg.miscalibration)
        fired_bndrift, item_bndrift, raw_bndrift = check_bn_drift(
            bn_res, train_acc, val_acc, cfg.bn_drift
        )
        fired_instab, item_instab, raw_instab = check_instability(instability_res, cfg.instability)
        fired_headdeg, item_headdeg, raw_headdeg = check_head_degradation(
            probe_res, cfg.head_degradation
        )

        # Track not-evaluable rules
        not_evaluable: list[str] = []
        not_evaluable_reasons: dict[str, str] = {}
        for item in (item_bndrift, item_instab, item_headdeg):
            if item.evidence.not_evaluable and item.evidence.not_evaluable_reason:
                not_evaluable.append(item.label)
                not_evaluable_reasons[item.label] = item.evidence.not_evaluable_reason

        # Collect fired failure rules
        fired_items: list[DiagnosisItem] = []
        if fired_bndrift:
            fired_items.append(item_bndrift)
        if fired_headdeg:
            fired_items.append(item_headdeg)
        if fired_instab:
            fired_items.append(item_instab)
        if fired_overfit:
            fired_items.append(item_overfit)
        if fired_miscal:
            fired_items.append(item_miscal)

        # Rank diagnoses and tie-break
        evidence_trail: dict[str, Any] = {
            "train_acc": float(train_acc),
            "val_acc": float(val_acc),
            "gap": float(gap),
            "ece": float(temp_res["ece"]),
            "fitted_temperature": float(temp_res["fitted_temperature"]),
            "bn_divergence": bn_res.get("divergence"),
            "max_spike_ratio": instability_res.get("max_spike_ratio"),
            "cv_detrended": instability_res.get("cv_detrended"),
            "probe_gain": probe_res.get("probe_gain"),
            "history_available": history_trend_res["available"],
            "not_evaluable": not_evaluable,
            "not_evaluable_reasons": not_evaluable_reasons,
        }

        if not fired_items:
            raw_confs = [raw_overfit, raw_miscal, raw_bndrift, raw_instab, raw_headdeg]
            is_healthy, healthy_item = check_healthy(raw_confs, any_fired=False)
            primary_label = "healthy"
            diagnoses = [healthy_item]
            is_healthy_flag = True
        else:
            is_healthy_flag = False
            tie_priority = {lbl: i for i, lbl in enumerate(TIE_BREAK_ORDER)}
            # Sort primarily by descending confidence, secondarily by tie-break order
            fired_items.sort(key=lambda it: (-it.confidence, tie_priority.get(it.label, 99)))
            for rank_idx, it in enumerate(fired_items, start=1):
                it.rank = rank_idx
            primary_label = fired_items[0].label
            diagnoses = fired_items

        return DiagnosisReport(
            primary_label=primary_label,
            diagnoses=diagnoses,
            is_healthy=is_healthy_flag,
            not_evaluable=not_evaluable,
            not_evaluable_reasons=not_evaluable_reasons,
            evidence_trail=evidence_trail,
        )
