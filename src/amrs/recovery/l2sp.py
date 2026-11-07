"""L2-SP (Starting Point) regularizer (Section ML-7, ML-7.1).

Penalizes parameter divergence from initial checkpoint anchors to prevent
catastrophic forgetting during targeted backbone adaptation.

Objective:
    loss = task_loss + alpha * sum_{i} ||theta_selected,i - theta_original,i||^2
"""

from __future__ import annotations

from typing import Sequence

import torch
import torch.nn as nn


def compute_l2sp_penalty(
    params: Sequence[nn.Parameter | torch.Tensor],
    anchors: Sequence[torch.Tensor],
) -> torch.Tensor:
    """Compute exact unscaled L2-SP penalty: sum((param - anchor)^2) across all tensors.

    Args:
        params: Trainable parameter tensors.
        anchors: Fixed reference anchor tensors.

    Returns:
        Scalar tensor containing the sum of squared differences.
    """
    if len(params) != len(anchors):
        raise ValueError(
            f"Mismatched parameter ({len(params)}) and anchor ({len(anchors)}) counts."
        )

    if not params:
        return torch.tensor(0.0)

    device = params[0].device
    penalty = torch.tensor(0.0, device=device)

    for p, a in zip(params, anchors):
        if p.shape != a.shape:
            raise ValueError(f"Parameter shape {p.shape} does not match anchor shape {a.shape}.")
        anchor_on_device = a.to(p.device)
        diff = p - anchor_on_device
        penalty = penalty + torch.sum(diff * diff)

    return penalty


class L2SPRegularizer:
    """L2-SP regularizer managing immutable parameter anchors and objective computation."""

    def __init__(
        self,
        parameters: Sequence[nn.Parameter],
        alpha: float = 0.1,
    ) -> None:
        """Initialize regularizer with parameters to be anchored.

        Anchors are cloned, detached, and set to requires_grad=False.
        """
        self.alpha = float(alpha)
        self.param_refs: list[nn.Parameter] = list(parameters)

        # Capture immutable anchors
        self.anchors: list[torch.Tensor] = [
            p.detach().clone().requires_grad_(False) for p in self.param_refs
        ]

        # Store initial anchor snapshots for tamper detection
        self._anchor_snapshots: list[bytes] = [a.cpu().numpy().tobytes() for a in self.anchors]

    def penalty(self) -> torch.Tensor:
        """Compute the unscaled penalty: sum((parameter - anchor)^2)."""
        return compute_l2sp_penalty(self.param_refs, self.anchors)

    def loss(self, task_loss: torch.Tensor) -> torch.Tensor:
        """Return combined task_loss + alpha * penalty."""
        if self.alpha <= 0.0 or not self.param_refs:
            return task_loss
        return task_loss + self.alpha * self.penalty()

    def penalty_value(self) -> float:
        """Return scalar penalty value without autograd tracking."""
        with torch.no_grad():
            return float(self.penalty().item())

    def contribution_value(self) -> float:
        """Return alpha * penalty scalar value."""
        return self.alpha * self.penalty_value()

    def verify_anchors_unmodified(self) -> bool:
        """Verify that anchors remain detached, require no grad, and have unmodified bytes."""
        for a, orig_bytes in zip(self.anchors, self._anchor_snapshots):
            if a.requires_grad:
                return False
            if a.cpu().numpy().tobytes() != orig_bytes:
                return False
        return True
