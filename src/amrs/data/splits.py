"""Deterministic stratified data splitting and DataBundle factory for AMRS (DM-2.1).

Enforces the four-way data contract (train, val, holdout, target):
- Pairwise-disjoint dataset sample IDs to prevent holdout data leakage.
- Deterministic stratified splitting across classes.
- Size safety thresholds: raises HoldoutTooSmallError for holdout < 200 (unless allow_small_holdout is True).
- Warning emissions:
    - LEAKAGE_RISK when holdout must be carved from train.
    - HOLDOUT_SIZE_WARNING when holdout size is between 200 and 499.
    - MISSING_CLASS_WARNING when one or more classes are missing from holdout.
"""

from __future__ import annotations

import logging
import warnings
from typing import Any, Sequence

import numpy as np
import torch
from torch.utils.data import Dataset, Subset

from amrs.errors import HoldoutTooSmallError
from amrs.schemas import DataBundle, SplitsConfig

logger = logging.getLogger("amrs.data.splits")


def _extract_labels_and_ids(ds: Dataset) -> tuple[np.ndarray, list[str]]:
    """Extract integer labels and stable sample IDs from a PyTorch Dataset."""
    n = len(ds) if hasattr(ds, "__len__") else 0  # type: ignore[arg-type]

    # 1. Extract IDs
    if hasattr(ds, "ids"):
        ids = list(getattr(ds, "ids"))
        if len(ids) != n:
            raise ValueError(f"Dataset has {n} samples but {len(ids)} ids")
    else:
        # Assign deterministic synthetic sample IDs
        ids = [f"sample_{i:06d}" for i in range(n)]
        try:
            setattr(ds, "ids", ids)
        except Exception:
            pass

    # 2. Extract labels
    labels: list[int] = []
    if hasattr(ds, "targets"):
        targets = getattr(ds, "targets")
        if isinstance(targets, torch.Tensor):
            labels = targets.cpu().numpy().tolist()
        else:
            labels = list(targets)
    elif hasattr(ds, "labels"):
        lbls = getattr(ds, "labels")
        if isinstance(lbls, torch.Tensor):
            labels = lbls.cpu().numpy().tolist()
        else:
            labels = list(lbls)
    elif isinstance(ds, Subset):
        # Subset of dataset with labels
        base = ds.dataset
        base_indices = ds.indices
        if hasattr(base, "targets"):
            t = getattr(base, "targets")
            labels = [int(t[i]) for i in base_indices]
        elif hasattr(base, "labels"):
            lbls = getattr(base, "labels")
            labels = [int(lbls[i]) for i in base_indices]
        else:
            for idx in range(n):
                item = ds[idx]
                labels.append(int(item[1]))
    else:
        # Fallback iteration
        for idx in range(n):
            item = ds[idx]
            if isinstance(item, (tuple, list)) and len(item) >= 2:
                labels.append(int(item[1]))
            else:
                labels.append(0)

    return np.array(labels, dtype=np.int64), ids


def _stratified_split_indices(
    labels: np.ndarray,
    fractions: Sequence[float],
    seed: int,
    stratify: bool = True,
) -> list[list[int]]:
    """Deterministically partition indices into multiple subsets according to given fractions."""
    n = len(labels)
    total_frac = sum(fractions)
    norm_fractions = [f / total_frac for f in fractions]
    n_splits = len(norm_fractions)

    rng = np.random.default_rng(seed)

    if not stratify:
        indices = np.arange(n)
        rng.shuffle(indices)
        counts = [int(round(f * n)) for f in norm_fractions]
        # Adjust remainder on final split
        counts[-1] = n - sum(counts[:-1])
        result: list[list[int]] = []
        curr = 0
        for c in counts:
            result.append(indices[curr : curr + c].tolist())
            curr += c
        return result

    # Stratified by class
    unique_classes = np.unique(labels)
    split_indices: list[list[int]] = [[] for _ in range(n_splits)]

    for c in sorted(unique_classes):
        class_idx = np.where(labels == c)[0]
        rng.shuffle(class_idx)
        c_n = len(class_idx)

        counts = [int(round(f * c_n)) for f in norm_fractions]
        counts[-1] = c_n - sum(counts[:-1])

        curr = 0
        for split_i in range(n_splits):
            take = counts[split_i]
            if take > 0:
                split_indices[split_i].extend(class_idx[curr : curr + take].tolist())
                curr += take

    # Deterministically shuffle within each split
    for split_i in range(n_splits):
        rng.shuffle(split_indices[split_i])

    return split_indices


def _wrap_subset(base_ds: Dataset, indices: list[int], parent_ids: list[str]) -> Subset:
    """Create a Subset with an attached slice of stable IDs."""
    sub = Subset(base_ds, indices)
    sub.ids = [parent_ids[i] for i in indices]  # type: ignore[attr-defined]
    return sub


def make_bundle(
    train_ds: Dataset,
    val_ds: Dataset | None = None,
    holdout_ds: Dataset | None = None,
    target_ds: Dataset | None = None,
    cfg: Any | None = None,
    seed: int = 42,
) -> DataBundle:
    """Create a verified DataBundle with train, val, holdout, and optional target datasets.

    Split Decision Rules (Section DM-2.1):
      (a) If `holdout_ds` is provided explicitly:
          - Use it directly.
          - If `val_ds` is provided, use it directly.
          - If `val_ds` is NOT provided, carve train into train and val (e.g. 80/20).
      (b) Else if `val_ds` is provided and `cfg.splits.holdout_from_val` is True:
          - Split `val_ds` 50/50 stratified into `val` and `holdout`.
      (c) Else:
          - Carve `train_ds` 70/15/15 (stratified) into train, val, and holdout.
          - Emit a `LEAKAGE_RISK` warning indicating holdout was carved from training data.

    Invariants & Validations:
      - Pairwise-disjoint sample IDs among train, val, and holdout.
      - Holdout sample size >= 200 (raises HoldoutTooSmallError unless allow_small_holdout).
      - Warns if holdout size < 500.
      - Warns if any class present in train is completely absent from holdout.

    Args:
        train_ds: Source training dataset.
        val_ds: Optional validation dataset.
        holdout_ds: Optional holdout dataset.
        target_ds: Optional unlabeled target domain dataset.
        cfg: Optional configuration object (e.g., AmrsConfig or object with .splits and .gate).
        seed: Random seed for deterministic splitting.

    Returns:
        DataBundle satisfying the AMRS data contract.
    """
    splits_cfg = (
        getattr(cfg, "splits", SplitsConfig(val_frac=0.5)) if cfg else SplitsConfig(val_frac=0.5)
    )
    gate_cfg = getattr(cfg, "gate", None)
    allow_small_holdout = getattr(gate_cfg, "allow_small_holdout", False) if gate_cfg else False

    holdout_from_val = getattr(splits_cfg, "holdout_from_val", True)
    stratify = getattr(splits_cfg, "stratify", True)

    provenance: dict[str, Any] = {
        "seed": seed,
        "stratified": stratify,
        "warnings": [],
    }

    # Extract labels and IDs from inputs
    train_labels, train_ids = _extract_labels_and_ids(train_ds)

    final_train: Dataset
    final_val: Dataset
    final_holdout: Dataset

    if holdout_ds is not None:
        # Case (a): Holdout explicitly provided
        final_holdout = holdout_ds
        _, h_ids = _extract_labels_and_ids(final_holdout)

        if val_ds is not None:
            final_val = val_ds
            final_train = train_ds
        else:
            # Carve val from train (80/20)
            splits = _stratified_split_indices(
                train_labels, [0.80, 0.20], seed=seed, stratify=stratify
            )
            final_train = _wrap_subset(train_ds, splits[0], train_ids)
            final_val = _wrap_subset(train_ds, splits[1], train_ids)

        provenance["split_mode"] = "explicit_holdout"

    elif val_ds is not None and holdout_from_val:
        # Case (b): Split val 50/50 stratified into val and holdout
        val_labels, val_ids = _extract_labels_and_ids(val_ds)
        splits = _stratified_split_indices(val_labels, [0.50, 0.50], seed=seed, stratify=stratify)
        final_train = train_ds
        final_val = _wrap_subset(val_ds, splits[0], val_ids)
        final_holdout = _wrap_subset(val_ds, splits[1], val_ids)

        provenance["split_mode"] = "holdout_from_val"

    else:
        # Case (c): Carve train 70/15/15 into train, val, and holdout
        msg = "LEAKAGE_RISK: No separate holdout or validation dataset provided. Carving 70/15/15 from training set."
        warnings.warn(msg, UserWarning, stacklevel=2)
        logger.warning(msg)
        provenance["warnings"].append("LEAKAGE_RISK")

        splits = _stratified_split_indices(
            train_labels, [0.70, 0.15, 0.15], seed=seed, stratify=stratify
        )
        final_train = _wrap_subset(train_ds, splits[0], train_ids)
        final_val = _wrap_subset(train_ds, splits[1], train_ids)
        final_holdout = _wrap_subset(train_ds, splits[2], train_ids)

        provenance["split_mode"] = "carved_from_train"

    # ---------------------------------------------------------------------------
    # Enforce Pairwise-Disjoint IDs Invariant
    # ---------------------------------------------------------------------------
    _, t_ids = _extract_labels_and_ids(final_train)
    _, v_ids = _extract_labels_and_ids(final_val)
    _, h_ids = _extract_labels_and_ids(final_holdout)

    set_t = set(t_ids)
    set_v = set(v_ids)
    set_h = set(h_ids)

    tv_overlap = set_t.intersection(set_v)
    th_overlap = set_t.intersection(set_h)
    vh_overlap = set_v.intersection(set_h)

    if tv_overlap or th_overlap or vh_overlap:
        raise ValueError(
            f"Holdout isolation violated! Overlapping sample IDs detected: "
            f"train-val: {len(tv_overlap)}, train-holdout: {len(th_overlap)}, val-holdout: {len(vh_overlap)}"
        )

    # ---------------------------------------------------------------------------
    # Holdout Size and Class Coverage Validation
    # ---------------------------------------------------------------------------
    holdout_size = len(final_holdout) if hasattr(final_holdout, "__len__") else 0  # type: ignore[arg-type]

    if holdout_size < 200:
        if not allow_small_holdout:
            raise HoldoutTooSmallError(
                f"Holdout dataset size ({holdout_size}) is below the required minimum of 200.",
                details={"holdout_size": holdout_size, "min_required": 200},
            )
        else:
            w_msg = f"HOLDOUT_SIZE_WARNING: Holdout size ({holdout_size}) < 200 permitted by allow_small_holdout=True."
            warnings.warn(w_msg, UserWarning, stacklevel=2)
            provenance["warnings"].append("HOLDOUT_SIZE_WARNING")
    elif holdout_size < 500:
        w_msg = f"HOLDOUT_SIZE_WARNING: Holdout size ({holdout_size}) < 500 may yield wide confidence intervals."
        warnings.warn(w_msg, UserWarning, stacklevel=2)
        provenance["warnings"].append("HOLDOUT_SIZE_WARNING")

    # Check for missing classes in holdout
    t_labels, _ = _extract_labels_and_ids(final_train)
    h_labels, _ = _extract_labels_and_ids(final_holdout)

    train_classes = set(np.unique(t_labels))
    holdout_classes = set(np.unique(h_labels))
    missing_in_holdout = train_classes - holdout_classes

    if missing_in_holdout:
        w_msg = f"MISSING_CLASS_WARNING: Classes {sorted(missing_in_holdout)} are present in train but absent from holdout."
        warnings.warn(w_msg, UserWarning, stacklevel=2)
        logger.warning(w_msg)
        provenance["warnings"].append("MISSING_CLASS_WARNING")

    # Infer metadata
    num_classes = len(train_classes.union(holdout_classes)) if train_classes else 10
    sample_item = final_train[0]
    sample_x = sample_item[0] if isinstance(sample_item, tuple) else sample_item
    input_shape = tuple(sample_x.shape) if hasattr(sample_x, "shape") else (3, 32, 32)

    return DataBundle(
        train=final_train,
        val=final_val,
        holdout=final_holdout,
        target=target_ds,
        num_classes=num_classes,
        input_shape=input_shape,
        provenance=provenance,
    )


def make_splits(*args: Any, **kwargs: Any) -> DataBundle:
    """Alias for make_bundle."""
    return make_bundle(*args, **kwargs)
