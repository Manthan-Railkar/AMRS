"""Dataset loaders and deterministic DataLoader factories for AMRS (DM-2.1).

Provides loaders for standard vision benchmarks (CIFAR-10, Fashion-MNIST) and
the canonical deterministic make_loader factory using PyTorch seed generators
and worker_init_fn.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import torch
from torch.utils.data import DataLoader, Dataset, Subset


def seed_worker(worker_id: int) -> None:
    """Worker initialization function setting deterministic seed per DataLoader worker process."""
    worker_seed = torch.initial_seed() % 2**32
    import random

    import numpy as np

    np.random.seed(worker_seed)
    random.seed(worker_seed)


def make_loader(
    ds: Dataset,
    batch_size: int = 64,
    shuffle: bool = False,
    seed: int = 42,
    num_workers: int = 0,
    drop_last: bool = False,
) -> DataLoader:
    """Create a fully deterministic PyTorch DataLoader.

    Args:
        ds: PyTorch Dataset to load batches from.
        batch_size: Batch size for loader.
        shuffle: Whether to shuffle samples each epoch.
        seed: Random seed for deterministic shuffling.
        num_workers: Subprocess worker count (default 0 for single-process CPU).
        drop_last: Whether to drop the final incomplete batch.

    Returns:
        Deterministic DataLoader instance.
    """
    g = torch.Generator()
    g.manual_seed(seed)

    return DataLoader(
        ds,
        batch_size=batch_size,
        shuffle=shuffle,
        generator=g if shuffle else None,
        num_workers=num_workers,
        worker_init_fn=seed_worker if num_workers > 0 else None,
        drop_last=drop_last,
    )


def get_data_loader(*args: Any, **kwargs: Any) -> DataLoader:
    """Alias for make_loader."""
    return make_loader(*args, **kwargs)


def load_cifar10(
    root: str | Path,
    train_subset: int | None = None,
    seed: int = 42,
    download: bool = True,
) -> tuple[Dataset, Dataset]:
    """Load standard CIFAR-10 vision dataset with canonical image normalization.

    Args:
        root: Storage directory for CIFAR-10 files.
        train_subset: Optional sample count to subsample training set.
        seed: Random seed for deterministic subsampling.
        download: Whether to download if not present locally.

    Returns:
        (cifar_train, cifar_test) PyTorch datasets with attached `.ids`.
    """
    import torchvision
    import torchvision.transforms as transforms

    transform_train = transforms.Compose(
        [
            transforms.ToTensor(),
            transforms.Normalize((0.4914, 0.4822, 0.4465), (0.2023, 0.1994, 0.2010)),
        ]
    )
    transform_test = transforms.Compose(
        [
            transforms.ToTensor(),
            transforms.Normalize((0.4914, 0.4822, 0.4465), (0.2023, 0.1994, 0.2010)),
        ]
    )

    root_path = Path(root)
    root_path.mkdir(parents=True, exist_ok=True)

    train_ds = torchvision.datasets.CIFAR10(
        root=str(root_path), train=True, download=download, transform=transform_train
    )
    test_ds = torchvision.datasets.CIFAR10(
        root=str(root_path), train=False, download=download, transform=transform_test
    )

    # Attach stable IDs
    train_ds.ids = [f"cifar10_train_{i:06d}" for i in range(len(train_ds))]
    test_ds.ids = [f"cifar10_test_{i:06d}" for i in range(len(test_ds))]

    if train_subset is not None and train_subset < len(train_ds):
        g = torch.Generator().manual_seed(seed)
        indices = torch.randperm(len(train_ds), generator=g)[:train_subset].tolist()
        subset_ds = Subset(train_ds, indices)
        setattr(subset_ds, "ids", [train_ds.ids[i] for i in indices])
        return subset_ds, test_ds

    return train_ds, test_ds


def load_fashion_mnist(
    root: str | Path,
    train_subset: int | None = None,
    seed: int = 42,
    download: bool = True,
) -> tuple[Dataset, Dataset]:
    """Load Fashion-MNIST vision dataset with standard normalization.

    Args:
        root: Storage directory for Fashion-MNIST files.
        train_subset: Optional sample count to subsample training set.
        seed: Random seed for deterministic subsampling.
        download: Whether to download if not present locally.

    Returns:
        (fmnist_train, fmnist_test) PyTorch datasets with attached `.ids`.
    """
    import torchvision
    import torchvision.transforms as transforms

    transform = transforms.Compose(
        [
            transforms.ToTensor(),
            transforms.Normalize((0.2860,), (0.3530,)),
        ]
    )

    root_path = Path(root)
    root_path.mkdir(parents=True, exist_ok=True)

    train_ds = torchvision.datasets.FashionMNIST(
        root=str(root_path), train=True, download=download, transform=transform
    )
    test_ds = torchvision.datasets.FashionMNIST(
        root=str(root_path), train=False, download=download, transform=transform
    )

    train_ds.ids = [f"fmnist_train_{i:06d}" for i in range(len(train_ds))]
    test_ds.ids = [f"fmnist_test_{i:06d}" for i in range(len(test_ds))]

    if train_subset is not None and train_subset < len(train_ds):
        g = torch.Generator().manual_seed(seed)
        indices = torch.randperm(len(train_ds), generator=g)[:train_subset].tolist()
        subset_ds = Subset(train_ds, indices)
        setattr(subset_ds, "ids", [train_ds.ids[i] for i in indices])
        return subset_ds, test_ds

    return train_ds, test_ds
