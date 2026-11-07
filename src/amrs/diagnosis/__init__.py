"""Diagnosis module for AMRS (ML-1 / Section 2.8)."""

from amrs.diagnosis.engine import DiagnosisEngine, TIE_BREAK_ORDER
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
    DiagnosisEvidence,
    DiagnosisItem,
    DiagnosisLabel,
    DiagnosisReport,
)

__all__ = [
    "DiagnosisEngine",
    "DiagnosisEvidence",
    "DiagnosisItem",
    "DiagnosisLabel",
    "DiagnosisReport",
    "TIE_BREAK_ORDER",
    "analyze_history_trend",
    "analyze_instability",
    "compute_acc_and_gap",
    "compute_bn_divergence",
    "fit_linear_probe",
    "fit_temperature_diagnostic",
    "check_bn_drift",
    "check_head_degradation",
    "check_healthy",
    "check_instability",
    "check_miscalibration",
    "check_overfitting",
]
