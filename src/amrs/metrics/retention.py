"""Retained knowledge and inter-model prediction agreement metrics."""

from __future__ import annotations

import numpy as np
import torch


def retained_correct_rate(
    orig_correct: np.ndarray | list[bool],
    cand_correct: np.ndarray | list[bool],
) -> tuple[float, bool]:
    """Calculate the retained-correct rate: |orig correct AND cand correct| / |orig correct|.

    Returns:
        tuple[float, bool]: (retained_rate, zero_orig_correct_warning)
        If original had zero correct samples, returns (1.0, True) with warning flag.
    """
    orig_arr = np.asarray(orig_correct, dtype=bool)
    cand_arr = np.asarray(cand_correct, dtype=bool)

    if len(orig_arr) != len(cand_arr):
        raise ValueError(
            f"Array length mismatch: orig ({len(orig_arr)}) vs cand ({len(cand_arr)})"
        )

    orig_correct_count = int(np.sum(orig_arr))
    if orig_correct_count == 0:
        return 1.0, True

    both_correct_count = int(np.sum(orig_arr & cand_arr))
    retained_rate = float(both_correct_count / orig_correct_count)
    return retained_rate, False


def top1_agreement(
    logits_a: torch.Tensor,
    logits_b: torch.Tensor,
) -> float:
    """Compute the top-1 prediction agreement between two sets of logits."""
    if len(logits_a) != len(logits_b):
        raise ValueError("Logits shape mismatch for agreement calculation.")

    preds_a = torch.argmax(logits_a, dim=-1)
    preds_b = torch.argmax(logits_b, dim=-1)

    agreement = (preds_a == preds_b).float().mean().item()
    return float(agreement)

