"""Evaluation package - Verification Gate and Holdout Integrity."""

from amrs.evaluation.evaluator import HoldoutIsolatedContext, ModelEvaluator
from amrs.evaluation.gate import GateDecision, VerificationGate

__all__ = [
    "HoldoutIsolatedContext",
    "ModelEvaluator",
    "VerificationGate",
    "GateDecision",
]
