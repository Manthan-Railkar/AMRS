"""Paired bootstrap confidence interval calculation for comparative model evaluation."""

from __future__ import annotations

from typing import Callable

import numpy as np


def paired_bootstrap_delta(
    orig_samples: np.ndarray,
    cand_samples: np.ndarray,
    n_boot: int = 1000,
    confidence: float = 0.95,
    seed: int = 1234,
    higher_is_better: bool = True,
    metric_fn: Callable[[np.ndarray], float] | None = None,
) -> dict[str, float]:
    """Compute paired-bootstrap confidence interval of the performance difference.

    Positive delta always indicates improvement:
    - If higher_is_better=True: delta = cand - orig
    - If higher_is_better=False: delta = orig - cand

    Shared resample indices ensure paired variance reduction.
    """
    orig_arr = np.asarray(orig_samples)
    cand_arr = np.asarray(cand_samples)

    if len(orig_arr) != len(cand_arr):
        raise ValueError("Original and candidate sample arrays must have identical length.")

    n = len(orig_arr)
    if n == 0:
        raise ValueError("Cannot perform bootstrap on empty samples.")

    rng = np.random.default_rng(seed)

    # 1. Point estimate
    if metric_fn is not None:
        val_orig = float(metric_fn(orig_arr))
        val_cand = float(metric_fn(cand_arr))
    else:
        val_orig = float(np.mean(orig_arr))
        val_cand = float(np.mean(cand_arr))

    point_delta = (val_cand - val_orig) if higher_is_better else (val_orig - val_cand)

    # 2. Resampling with replacement
    # Generate shared random indices matrix: shape (n_boot, n)
    boot_indices = rng.integers(0, n, size=(n_boot, n))

    deltas = np.empty(n_boot, dtype=float)

    if metric_fn is not None:
        for b in range(n_boot):
            idx = boot_indices[b]
            b_orig = metric_fn(orig_arr[idx])
            b_cand = metric_fn(cand_arr[idx])
            deltas[b] = (b_cand - b_orig) if higher_is_better else (b_orig - b_cand)
    else:
        # Fast vectorized calculation for mean-based metrics (e.g. accuracy)
        b_orig_means = np.mean(orig_arr[boot_indices], axis=1)
        b_cand_means = np.mean(cand_arr[boot_indices], axis=1)
        if higher_is_better:
            deltas = b_cand_means - b_orig_means
        else:
            deltas = b_orig_means - b_cand_means

    # 3. Percentile confidence bounds
    alpha = 1.0 - confidence
    q_low = (alpha / 2.0) * 100.0
    q_high = (1.0 - alpha / 2.0) * 100.0

    ci_low = float(np.percentile(deltas, q_low))
    ci_high = float(np.percentile(deltas, q_high))

    return {
        "delta": float(point_delta),
        "ci_low": ci_low,
        "ci_high": ci_high,
        "confidence": float(confidence),
    }
