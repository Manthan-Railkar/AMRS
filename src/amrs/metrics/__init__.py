"""Metrics package for classification, retention, paired bootstrap, and compute accounting."""

from amrs.metrics.bootstrap import paired_bootstrap_delta
from amrs.metrics.classification import (
    accuracy,
    ece,
    metric_bundle,
    nll,
    per_sample_correct,
    predict_logits,
)
from amrs.metrics.compute import ComputeMeter, NullMeter, meter_scope
from amrs.metrics.retention import retained_correct_rate, top1_agreement

__all__ = [
    "accuracy",
    "nll",
    "ece",
    "per_sample_correct",
    "predict_logits",
    "metric_bundle",
    "retained_correct_rate",
    "top1_agreement",
    "paired_bootstrap_delta",
    "ComputeMeter",
    "NullMeter",
    "meter_scope",
]
