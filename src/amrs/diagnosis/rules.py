"""Pure rule functions implementing AMRS failure mode detection (ML-1 / Section 2.8)."""

from __future__ import annotations

from typing import Any

from amrs.schemas import (
    DiagnosisBnDriftConfig,
    DiagnosisEvidence,
    DiagnosisHeadDegradationConfig,
    DiagnosisInstabilityConfig,
    DiagnosisItem,
    DiagnosisMiscalibrationConfig,
    DiagnosisOverfittingConfig,
)


def check_overfitting(
    train_acc: float,
    val_acc: float,
    history_result: dict[str, Any] | None,
    cfg: DiagnosisOverfittingConfig,
) -> tuple[bool, DiagnosisItem, float]:
    """Rule for overfitting: train_acc >= train_acc_min and train_acc - val_acc >= gap_min."""
    gap = train_acc - val_acc
    # Use 1e-7 tolerance to protect against floating point inaccuracy (e.g. 0.90 - 0.80 = 0.09999999999999998)
    fired = bool((train_acc >= cfg.train_acc_min - 1e-7) and (gap >= cfg.gap_min - 1e-7))

    base_conf = min(1.0, max(0.0, gap) / (cfg.gap_min * 2.0))
    history_condition = bool(history_result and history_result.get("condition_met", False))
    history_boost = 0.2 if history_condition else 0.0
    raw_conf = min(1.0, base_conf + history_boost)
    conf = raw_conf if fired else 0.0

    if fired:
        explanation = (
            f"Overfitting detected: Train accuracy {train_acc:.3f} >= {cfg.train_acc_min:.3f} "
            f"and generalization gap {gap:.3f} >= {cfg.gap_min:.3f}"
        )
        if history_condition:
            explanation += f" with validation loss rising for >= {cfg.val_loss_rise_epochs} epochs while train loss fell (+0.2 confidence boost)."
        else:
            explanation += "."
    else:
        explanation = (
            f"No overfitting: Train accuracy {train_acc:.3f} (min {cfg.train_acc_min:.3f}) "
            f"and gap {gap:.3f} (min {cfg.gap_min:.3f})."
        )

    evidence = DiagnosisEvidence(
        metric_values={
            "train_acc": float(train_acc),
            "val_acc": float(val_acc),
            "gap": float(gap),
            "history_boost": float(history_boost),
        },
        threshold_values={
            "train_acc_min": float(cfg.train_acc_min),
            "gap_min": float(cfg.gap_min),
            "val_loss_rise_epochs": float(cfg.val_loss_rise_epochs),
        },
        source_split="train_and_val",
        explanation=explanation,
        not_evaluable=False,
    )

    item = DiagnosisItem(
        label="overfitting",
        confidence=conf,
        rank=1,
        evidence=evidence,
    )
    return fired, item, raw_conf


def check_miscalibration(
    temp_result: dict[str, Any],
    cfg: DiagnosisMiscalibrationConfig,
) -> tuple[bool, DiagnosisItem, float]:
    """Rule for miscalibration: ECE(val) >= ece_min and |T - 1| >= 0.15."""
    ece_val = float(temp_result.get("ece", 0.0))
    t_diff = float(temp_result.get("temperature_divergence", 0.0))
    fitted_t = float(temp_result.get("fitted_temperature", 1.0))

    fired = bool((ece_val >= cfg.ece_min - 1e-7) and (t_diff >= 0.15 - 1e-7))
    raw_conf = min(1.0, max(0.0, ece_val) / (2.0 * cfg.ece_min))
    conf = raw_conf if fired else 0.0

    if fired:
        explanation = (
            f"Miscalibration detected: Validation ECE {ece_val:.4f} >= {cfg.ece_min:.4f} "
            f"and optimal scaling temperature T={fitted_t:.3f} (|T - 1| = {t_diff:.3f} >= 0.15)."
        )
    else:
        explanation = (
            f"Well-calibrated: ECE {ece_val:.4f} (threshold {cfg.ece_min:.4f}) "
            f"and temperature diff {t_diff:.3f} (threshold 0.15)."
        )

    evidence = DiagnosisEvidence(
        metric_values={
            "ece": float(ece_val),
            "fitted_temperature": float(fitted_t),
            "temperature_divergence": float(t_diff),
        },
        threshold_values={
            "ece_min": float(cfg.ece_min),
            "temp_divergence_min": 0.15,
        },
        source_split="val",
        explanation=explanation,
        not_evaluable=False,
    )

    item = DiagnosisItem(
        label="miscalibration",
        confidence=conf,
        rank=1,
        evidence=evidence,
    )
    return fired, item, raw_conf


def check_bn_drift(
    bn_result: dict[str, Any],
    train_acc: float,
    val_acc: float,
    cfg: DiagnosisBnDriftConfig,
) -> tuple[bool, DiagnosisItem, float]:
    """Rule for BatchNorm drift: running-stat divergence >= divergence_min and train_acc - val_acc >= acc_drop_min."""
    if not bn_result.get("evaluable", True):
        reason = str(bn_result.get("reason", "NO_BN_LAYERS"))
        evidence = DiagnosisEvidence(
            source_split="target_or_val",
            explanation=f"BatchNorm drift cannot be evaluated: {reason}.",
            not_evaluable=True,
            not_evaluable_reason=reason,
        )
        item = DiagnosisItem(
            label="bn_drift",
            confidence=0.0,
            rank=1,
            evidence=evidence,
        )
        return False, item, 0.0

    divergence = float(bn_result.get("divergence", 0.0))
    acc_drop = float(train_acc - val_acc)

    fired = bool((divergence >= cfg.divergence_min - 1e-7) and (acc_drop >= cfg.acc_drop_min - 1e-7))
    raw_conf = min(1.0, max(0.0, divergence) / (2.0 * cfg.divergence_min))
    conf = raw_conf if fired else 0.0

    if fired:
        explanation = (
            f"BatchNorm drift detected: Running statistic divergence {divergence:.3f} >= {cfg.divergence_min:.3f} "
            f"and accuracy drop {acc_drop:.3f} >= {cfg.acc_drop_min:.3f} across {bn_result.get('num_bn_layers', 0)} BN layers."
        )
    else:
        explanation = (
            f"No BN drift: Divergence {divergence:.3f} (min {cfg.divergence_min:.3f}) "
            f"and accuracy drop {acc_drop:.3f} (min {cfg.acc_drop_min:.3f})."
        )

    evidence = DiagnosisEvidence(
        metric_values={
            "divergence": float(divergence),
            "acc_drop": float(acc_drop),
            "num_bn_layers": float(bn_result.get("num_bn_layers", 0)),
        },
        threshold_values={
            "divergence_min": float(cfg.divergence_min),
            "acc_drop_min": float(cfg.acc_drop_min),
        },
        source_split="target_or_val",
        explanation=explanation,
        not_evaluable=False,
    )

    item = DiagnosisItem(
        label="bn_drift",
        confidence=conf,
        rank=1,
        evidence=evidence,
    )
    return fired, item, raw_conf


def check_instability(
    instability_result: dict[str, Any],
    cfg: DiagnosisInstabilityConfig,
) -> tuple[bool, DiagnosisItem, float]:
    """Rule for training instability: loss spike >= spike_ratio or detrended loss CV >= cv_min."""
    if not instability_result.get("evaluable", True):
        reason = str(instability_result.get("reason", "NO_HISTORY"))
        evidence = DiagnosisEvidence(
            source_split="history",
            explanation=f"Instability cannot be evaluated: {reason}.",
            not_evaluable=True,
            not_evaluable_reason=reason,
        )
        item = DiagnosisItem(
            label="instability",
            confidence=0.0,
            rank=1,
            evidence=evidence,
        )
        return False, item, 0.0

    max_spike = float(instability_result.get("max_spike_ratio", 0.0))
    cv_detrended = float(instability_result.get("cv_detrended", 0.0))
    spike_fired = bool(instability_result.get("spike_fired", False))
    cv_fired = bool(instability_result.get("cv_fired", False))
    fired = spike_fired or cv_fired

    spike_conf = min(1.0, max_spike / (2.0 * cfg.spike_ratio))
    cv_conf = min(1.0, cv_detrended / (2.0 * cfg.cv_min))
    raw_conf = min(1.0, max(spike_conf if spike_fired else 0.0, cv_conf if cv_fired else 0.0))
    conf = raw_conf if fired else 0.0

    if fired:
        reasons = []
        if spike_fired:
            reasons.append(f"loss spike ratio {max_spike:.2f} >= {cfg.spike_ratio:.2f}")
        if cv_fired:
            reasons.append(f"detrended loss CV {cv_detrended:.2f} >= {cfg.cv_min:.2f}")
        explanation = f"Training instability detected: {', '.join(reasons)}."
    else:
        explanation = (
            f"Stable training: Max spike {max_spike:.2f} (threshold {cfg.spike_ratio:.2f}) "
            f"and detrended CV {cv_detrended:.2f} (threshold {cfg.cv_min:.2f})."
        )

    evidence = DiagnosisEvidence(
        metric_values={
            "max_spike_ratio": float(max_spike),
            "cv_detrended": float(cv_detrended),
        },
        threshold_values={
            "spike_ratio": float(cfg.spike_ratio),
            "cv_min": float(cfg.cv_min),
        },
        source_split="history",
        explanation=explanation,
        not_evaluable=False,
    )

    item = DiagnosisItem(
        label="instability",
        confidence=conf,
        rank=1,
        evidence=evidence,
    )
    return fired, item, raw_conf


def check_head_degradation(
    probe_result: dict[str, Any],
    cfg: DiagnosisHeadDegradationConfig,
) -> tuple[bool, DiagnosisItem, float]:
    """Rule for degraded head: linear probe gain val_acc(probe) - val_acc(model) >= probe_gain_min."""
    if not probe_result.get("evaluable", True):
        reason = str(probe_result.get("reason", "NO_IDENTIFIABLE_HEAD"))
        evidence = DiagnosisEvidence(
            source_split="train_and_val",
            explanation=f"Head degradation cannot be evaluated: {reason}.",
            not_evaluable=True,
            not_evaluable_reason=reason,
        )
        item = DiagnosisItem(
            label="head_degradation",
            confidence=0.0,
            rank=1,
            evidence=evidence,
        )
        return False, item, 0.0

    probe_gain = float(probe_result.get("probe_gain", 0.0))
    probe_acc = float(probe_result.get("probe_val_acc", 0.0))
    model_acc = float(probe_result.get("model_val_acc", 0.0))

    fired = bool(probe_gain >= cfg.probe_gain_min - 1e-7)
    raw_conf = min(1.0, max(0.0, probe_gain) / (2.0 * cfg.probe_gain_min))
    conf = raw_conf if fired else 0.0

    if fired:
        explanation = (
            f"Degraded head detected: Frozen linear probe validation accuracy {probe_acc:.3f} "
            f"exceeds model accuracy {model_acc:.3f} by gain {probe_gain:.3f} >= {cfg.probe_gain_min:.3f}."
        )
    else:
        explanation = (
            f"Head intact: Linear probe gain {probe_gain:.3f} below threshold {cfg.probe_gain_min:.3f}."
        )

    evidence = DiagnosisEvidence(
        metric_values={
            "probe_val_acc": float(probe_acc),
            "model_val_acc": float(model_acc),
            "probe_gain": float(probe_gain),
        },
        threshold_values={
            "probe_gain_min": float(cfg.probe_gain_min),
        },
        source_split="train_and_val",
        explanation=explanation,
        not_evaluable=False,
    )

    item = DiagnosisItem(
        label="head_degradation",
        confidence=conf,
        rank=1,
        evidence=evidence,
    )
    return fired, item, raw_conf


def check_healthy(
    evaluated_raw_confs: list[float],
    any_fired: bool,
) -> tuple[bool, DiagnosisItem]:
    """Rule for healthy control: no failure rule fired. Confidence = 1 - max(raw_conf)."""
    if any_fired:
        return False, DiagnosisItem(
            label="healthy",
            confidence=0.0,
            rank=99,
            evidence=DiagnosisEvidence(
                explanation="Model is not healthy; one or more failure rules fired.",
                source_split="val",
            ),
        )

    max_conf = max(evaluated_raw_confs) if evaluated_raw_confs else 0.0
    healthy_conf = max(0.0, min(1.0, 1.0 - max_conf))
    evidence = DiagnosisEvidence(
        metric_values={"max_evaluated_confidence": float(max_conf)},
        threshold_values={},
        source_split="val",
        explanation=f"No failure rules fired. Model is healthy with confidence {healthy_conf:.3f}.",
        not_evaluable=False,
    )
    item = DiagnosisItem(
        label="healthy",
        confidence=healthy_conf,
        rank=1,
        evidence=evidence,
    )
    return True, item
