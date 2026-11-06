"""Unit tests for AMRS checkpoint persistence and history discovery (BE-4 / DM-3.1)."""

from pathlib import Path
import torch
import torch.nn as nn

from amrs.models.loader import load_state_dict_safe
from amrs.models.registry import build
from amrs.models.zoo import (
    atomic_write_bytes,
    list_history,
    save_checkpoint,
)


def test_atomic_write_bytes(tmp_path: Path) -> None:
    dest = tmp_path / "output.bin"
    atomic_write_bytes(dest, b"binary_content_1234")
    assert dest.exists()
    assert dest.read_bytes() == b"binary_content_1234"


def test_save_checkpoint_atomic(tmp_path: Path) -> None:
    model = build("mlp_small")
    dest = tmp_path / "checkpoints" / "ckpt_epoch005.pt"

    meta = {"epoch": 5, "val_loss": 0.42}
    save_checkpoint(model, dest, meta=meta)

    assert dest.exists()
    loaded_dict = load_state_dict_safe(dest)
    assert set(loaded_dict.keys()) == set(model.state_dict().keys())

    # Raw checkpoint includes meta
    raw = torch.load(dest, map_location="cpu", weights_only=True)
    assert "meta" in raw
    assert raw["meta"]["epoch"] == 5
    assert raw["meta"]["val_loss"] == 0.42


def test_list_history_ordered(tmp_path: Path) -> None:
    history_dir = tmp_path / "history"
    history_dir.mkdir()

    # Create unordered checkpoints and ignore non-checkpoint files
    (history_dir / "ckpt_epoch10.pt").write_bytes(b"epoch10")
    (history_dir / "ckpt_epoch1.pt").write_bytes(b"epoch1")
    (history_dir / "ckpt_epoch2.pt").write_bytes(b"epoch2")
    (history_dir / "ckpt_epoch20.pt").write_bytes(b"epoch20")
    (history_dir / "history.json").write_text("{}")
    (history_dir / "random.txt").write_text("ignore")

    ordered = list_history(history_dir)
    assert len(ordered) == 4
    assert [p.name for p in ordered] == [
        "ckpt_epoch1.pt",
        "ckpt_epoch2.pt",
        "ckpt_epoch10.pt",
        "ckpt_epoch20.pt",
    ]

