"""Checkpoint persistence, atomic writes, and training history listing."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any
import torch
import torch.nn as nn


def atomic_write_bytes(dest_path: str | Path, data: bytes) -> None:
    """Atomically write binary data by writing to a temporary file and renaming."""
    dest = Path(dest_path).resolve()
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = dest.parent / f".tmp_{dest.name}_{os.getpid()}"
    try:
        tmp_path.write_bytes(data)
        os.replace(tmp_path, dest)
    finally:
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except OSError:
                pass


def save_checkpoint(
    model: nn.Module,
    path: str | Path,
    meta: dict[str, Any] | None = None,
) -> None:
    """Save model checkpoint atomically containing state_dict and optional metadata.

    The saved dictionary has {'state_dict': model.state_dict(), 'meta': meta or {}}.
    """
    dest = Path(path).resolve()
    dest.parent.mkdir(parents=True, exist_ok=True)

    checkpoint = {
        "state_dict": model.state_dict(),
        "meta": meta or {},
    }

    tmp_path = dest.parent / f".tmp_ckpt_{dest.name}_{os.getpid()}"
    try:
        torch.save(checkpoint, tmp_path)
        os.replace(tmp_path, dest)
    finally:
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except OSError:
                pass


def list_history(directory: str | Path) -> list[Path]:
    """Return chronologically ordered list of epoch checkpoints matching 'ckpt_epochNNN.pt'."""
    dir_path = Path(directory).resolve()
    if not dir_path.exists() or not dir_path.is_dir():
        return []

    pattern = re.compile(r"^ckpt_epoch(\d+)\.pt$")
    checkpoints: list[tuple[int, Path]] = []

    for item in dir_path.iterdir():
        if item.is_file():
            match = pattern.match(item.name)
            if match:
                epoch_num = int(match.group(1))
                checkpoints.append((epoch_num, item))

    # Sort ascending by epoch number
    checkpoints.sort(key=lambda t: t[0])
    return [path for _, path in checkpoints]

