"""Covariate shift and corruption transforms for AMRS (DM-2.1).

Provides lazy, reproducible dataset transformations applying photometric and noise
shifts to image datasets, testing model resilience under covariate distribution shift.
"""

from __future__ import annotations

from collections.abc import Sized
from typing import Any, Literal

import numpy as np
import torch
from torch.utils.data import Dataset

ShiftPreset = Literal["mild", "medium", "severe"]

PRESET_PARAMS: dict[ShiftPreset, dict[str, float]] = {
    "mild": {"brightness": 0.2, "contrast": 0.8, "noise_std": 0.15},
    "medium": {"brightness": 0.5, "contrast": 0.5, "noise_std": 0.40},
    "severe": {"brightness": 1.2, "contrast": 0.2, "noise_std": 0.85},
}


class ShiftedDataset(Dataset):
    """Lazy transformed PyTorch Dataset applying photometric drift and Gaussian noise."""

    def __init__(
        self,
        base_ds: Dataset,
        brightness: float = 0.0,
        contrast: float = 1.0,
        noise_std: float = 0.0,
        seed: int = 42,
    ) -> None:
        self.base_ds = base_ds
        self.brightness = float(brightness)
        self.contrast = float(contrast)
        self.noise_std = float(noise_std)
        self.seed = int(seed)

        # Inherit stable ids if present on the base dataset
        if hasattr(base_ds, "ids"):
            self.ids = [f"{sid}_shifted" for sid in getattr(base_ds, "ids")]
        elif isinstance(base_ds, Sized):
            self.ids = [f"sample_{i:06d}_shifted" for i in range(len(base_ds))]
        else:
            self.ids = []

    def __len__(self) -> int:
        return len(self.base_ds) if isinstance(self.base_ds, Sized) else 0

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, Any] | torch.Tensor:
        item = self.base_ds[idx]
        if isinstance(item, tuple):
            x, y = item[0], item[1]
            return self._transform(x, idx), y
        else:
            return self._transform(item, idx)

    def _transform(self, x: torch.Tensor, idx: int) -> torch.Tensor:
        # Deterministic per-sample transform based on seed and sample index
        x_trans = x.clone().float()

        # Apply contrast scaling: (x - mean) * contrast + mean
        mean = x_trans.mean()
        x_trans = (x_trans - mean) * self.contrast + mean

        # Apply brightness shift
        x_trans = x_trans + self.brightness

        # Apply deterministic Gaussian noise per sample
        if self.noise_std > 0.0:
            sample_seed = (self.seed * 1000003 + idx) & 0xFFFFFFFF
            rng = np.random.default_rng(sample_seed)
            noise = rng.normal(0.0, self.noise_std, size=x_trans.shape).astype(np.float32)
            x_trans = x_trans + torch.from_numpy(noise)

        return x_trans


def apply_shift(
    ds: Dataset,
    brightness: float | None = None,
    contrast: float | None = None,
    noise_std: float | None = None,
    seed: int = 42,
    preset: ShiftPreset | None = None,
) -> ShiftedDataset:
    """Apply lazy photometric and Gaussian noise shift to a dataset.

    Args:
        ds: Underlying PyTorch dataset.
        brightness: Additive brightness factor (default 0.0 unless preset given).
        contrast: Multiplicative contrast factor (default 1.0 unless preset given).
        noise_std: Standard deviation of additive Gaussian noise (default 0.0 unless preset given).
        seed: Random seed for deterministic sample noise.
        preset: Optional named severity preset ('mild', 'medium', 'severe').

    Returns:
        ShiftedDataset wrapping the base dataset.
    """
    if preset is not None:
        if preset not in PRESET_PARAMS:
            raise ValueError(
                f"Unknown shift preset: '{preset}'. Valid presets: {list(PRESET_PARAMS.keys())}"
            )
        p = PRESET_PARAMS[preset]
        b = brightness if brightness is not None else p["brightness"]
        c = contrast if contrast is not None else p["contrast"]
        n = noise_std if noise_std is not None else p["noise_std"]
    else:
        b = brightness if brightness is not None else 0.0
        c = contrast if contrast is not None else 1.0
        n = noise_std if noise_std is not None else 0.0

    return ShiftedDataset(ds, brightness=b, contrast=c, noise_std=n, seed=seed)


def apply_covariate_shift(*args: Any, **kwargs: Any) -> ShiftedDataset:
    """Alias for apply_shift."""
    return apply_shift(*args, **kwargs)
