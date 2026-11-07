"""Deterministic random number generator seeding for AMRS."""

from __future__ import annotations

import os
import random
from typing import Any

import numpy as np
import torch


def seed_everything(seed: int = 1234, deterministic: bool = True) -> dict[str, Any]:
    """Seed python, numpy, torch, and CUDA random number generators."""
    random.seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)

    if deterministic:
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False
        try:
            torch.use_deterministic_algorithms(True, warn_only=True)
        except Exception:
            pass

    return {
        "seed": seed,
        "deterministic": deterministic,
        "cuda_available": torch.cuda.is_available(),
    }
