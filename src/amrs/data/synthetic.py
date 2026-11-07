"""Synthetic image dataset generator for AMRS test scenarios and CI (DM-2.1).

Generates deterministic, class-patterned synthetic image classification datasets
that can be trained quickly by small neural networks (MLPs or CNNs) to > 90%
accuracy within seconds on CPU.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import torch
from torch.utils.data import Dataset


class IdentifiedTensorDataset(Dataset):
    """PyTorch Dataset wrapping tensors with stable string identifiers (ids).

    Ensures dataset splits can be mathematically audited for disjointness and zero
    holdout data leakage (AMRS Data Contract Invariant).
    """

    def __init__(
        self,
        images: torch.Tensor,
        labels: torch.Tensor,
        ids: list[str] | None = None,
    ) -> None:
        if len(images) != len(labels):
            raise ValueError(
                f"Number of images ({len(images)}) does not match labels ({len(labels)})"
            )
        self.images = images.float()
        self.labels = labels.long()

        if ids is not None:
            if len(ids) != len(images):
                raise ValueError(
                    f"Number of ids ({len(ids)}) does not match samples ({len(images)})"
                )
            self.ids = list(ids)
        else:
            # Deterministic hash-based IDs based on index and content
            self.ids = [f"sample_{i:06d}" for i in range(len(images))]

    def __len__(self) -> int:
        return len(self.images)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
        return self.images[idx], self.labels[idx]


def make_synthetic_images(
    n: int,
    num_classes: int = 4,
    shape: tuple[int, ...] = (1, 8, 8),
    seed: int = 42,
) -> IdentifiedTensorDataset:
    """Generate synthetic image classification dataset with learnable geometric patterns.

    The dataset is strictly deterministic: runs with the same (n, num_classes, shape, seed)
    produce byte-identical tensors across runs.

    Args:
        n: Total number of samples to generate.
        num_classes: Number of distinct classification classes (default 4).
        shape: Dimensions of each sample image tensor (C, H, W) (default (1, 8, 8)).
        seed: Random seed for deterministic reproducibility.

    Returns:
        IdentifiedTensorDataset with images, labels, and stable `ids`.
    """
    if n <= 0:
        raise ValueError(f"Sample count n must be positive, got {n}")
    if num_classes <= 0:
        raise ValueError(f"num_classes must be positive, got {num_classes}")

    rng = np.random.default_rng(seed)

    # Balanced class assignments
    labels_np = np.zeros(n, dtype=np.int64)
    samples_per_class = n // num_classes
    remainder = n % num_classes

    curr_idx = 0
    for c in range(num_classes):
        count = samples_per_class + (1 if c < remainder else 0)
        labels_np[curr_idx : curr_idx + count] = c
        curr_idx += count

    # Shuffle labels deterministically with the seeded RNG
    rng.shuffle(labels_np)

    channels, height, width = shape
    # Base background noise with small variance
    images_np = rng.normal(loc=0.0, scale=0.1, size=(n, channels, height, width)).astype(np.float32)

    # Inject distinct, linearly or non-linearly separable geometric signals per class
    # Class 0: Center bright quad
    # Class 1: Horizontal stripe
    # Class 2: Vertical stripe
    # Class 3: Corner bright dots
    # Class 4+: Quadrant/checkerboard harmonics
    mid_h, mid_w = height // 2, width // 2

    for i in range(n):
        c = labels_np[i]
        c_mod = c % 4
        if c_mod == 0:
            # Center bright box
            h_start, h_end = max(0, mid_h - 1), min(height, mid_h + 2)
            w_start, w_end = max(0, mid_w - 1), min(width, mid_w + 2)
            images_np[i, :, h_start:h_end, w_start:w_end] += 2.0
        elif c_mod == 1:
            # Horizontal bright band
            h_band = max(0, mid_h - 1)
            images_np[i, :, h_band : h_band + 2, :] += 2.0
        elif c_mod == 2:
            # Vertical bright band
            w_band = max(0, mid_w - 1)
            images_np[i, :, :, w_band : w_band + 2] += 2.0
        elif c_mod == 3:
            # Corner dots
            images_np[i, :, 0:2, 0:2] += 2.0
            images_np[i, :, -2:, -2:] += 2.0

        # If more than 4 classes, modulate overall intensity by class index
        if c >= 4:
            images_np[i] += float(c // 4) * 0.5

    # Generate stable IDs incorporating seed and index hash
    ids = [f"synth_{seed}_{i:06d}" for i in range(n)]

    images_tensor = torch.from_numpy(images_np)
    labels_tensor = torch.from_numpy(labels_np)

    return IdentifiedTensorDataset(images_tensor, labels_tensor, ids=ids)


def generate_synthetic_dataset(*args: Any, **kwargs: Any) -> IdentifiedTensorDataset:
    """Backward compatibility alias for make_synthetic_images."""
    return make_synthetic_images(*args, **kwargs)
