"""AMRS data package."""

from amrs.data.loaders import get_data_loader
from amrs.data.shifts import apply_covariate_shift
from amrs.data.splits import make_splits
from amrs.data.synthetic import generate_synthetic_dataset

__all__ = [
    "make_splits",
    "get_data_loader",
    "apply_covariate_shift",
    "generate_synthetic_dataset",
]
