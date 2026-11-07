"""Unit tests for AMRS utilities: seeding, atomic writes, safe join, logging, and timing (INF-1.2)."""

import json
import logging
import time
from pathlib import Path

import pytest
import torch

from amrs.errors import ValidationError
from amrs.utils.fs import (
    assert_not_symlink,
    atomic_write,
    ensure_within_directory,
    is_safe_filename,
    safe_join,
    sanitize_filename,
)
from amrs.utils.hashing import compute_sha256, sha256_file, verify_sha256
from amrs.utils.logging import JsonFormatter, bind_run_id, get_logger
from amrs.utils.seed import seed_everything
from amrs.utils.timing import Stopwatch

# ---------------------------------------------------------------------------
# Criterion 3: seed_everything(7) Reproducibility
# ---------------------------------------------------------------------------


def test_seed_everything_deterministic() -> None:
    """Criterion 3: Two calls to seed_everything(7) followed by torch.rand(3) produce equal tensors."""
    seed_everything(7)
    t1 = torch.rand(3)

    seed_everything(7)
    t2 = torch.rand(3)

    assert torch.equal(t1, t2)

    # Different seeds produce different tensors
    seed_everything(8)
    t3 = torch.rand(3)
    assert not torch.equal(t1, t3)


# ---------------------------------------------------------------------------
# Criterion 4: atomic_write Leaves No Partial File on Writer Failure
# ---------------------------------------------------------------------------


def test_atomic_write_leaves_no_partial_file_on_failure(tmp_path: Path) -> None:
    """Criterion 4: atomic_write leaves no partial file when the writer raises."""
    target_file = tmp_path / "subdir" / "candidate.txt"

    def crashing_writer(f: object) -> None:
        if hasattr(f, "write"):
            f.write("partial content that should never persist")
        raise RuntimeError("Simulated crash during write operation")

    with pytest.raises(RuntimeError, match="Simulated crash"):
        atomic_write(target_file, crashing_writer)

    # Target file must NOT exist on disk
    assert not target_file.exists()

    # And no lingering temporary files in the directory
    if target_file.parent.exists():
        temp_files = list(target_file.parent.glob(".*.tmp"))
        assert len(temp_files) == 0


def test_atomic_write_success(tmp_path: Path) -> None:
    """atomic_write cleanly persists strings and bytes atomically."""
    # 1. String content
    str_file = tmp_path / "output.txt"
    atomic_write(str_file, "clean content")
    assert str_file.read_text(encoding="utf-8") == "clean content"

    # 2. Binary content
    bin_file = tmp_path / "output.bin"
    atomic_write(bin_file, b"\x00\x01\x02\x03")
    assert bin_file.read_bytes() == b"\x00\x01\x02\x03"

    # 3. Overwriting existing file preserves original if write fails
    def failing_overwrite(f: object) -> None:
        raise ValueError("Cannot overwrite")

    with pytest.raises(ValueError):
        atomic_write(str_file, failing_overwrite)

    # Original content is still preserved!
    assert str_file.read_text(encoding="utf-8") == "clean content"


# ---------------------------------------------------------------------------
# Criterion 5: safe_join(base, "../x") Raises on Traversal
# ---------------------------------------------------------------------------


def test_safe_join_traversal_raises(tmp_path: Path) -> None:
    """Criterion 5: safe_join(base, "../x") raises on path traversal attempts."""
    base = tmp_path / "sandbox"
    base.mkdir()

    # Relative traversal attempting to escape base
    with pytest.raises(ValidationError):
        safe_join(base, "../escaped.txt")

    with pytest.raises(ValidationError):
        safe_join(base, "valid_sub", "../..", "escaped.txt")

    # Null byte injection
    with pytest.raises(ValidationError):
        safe_join(base, "file\0.txt")

    # Legitimate nested joins resolve safely
    safe_path = safe_join(base, "models", "checkpoint.pt")
    assert safe_path.resolve() == (base / "models" / "checkpoint.pt").resolve()


# ---------------------------------------------------------------------------
# Criterion 6: Log Lines Are Valid JSON with run_id When Bound
# ---------------------------------------------------------------------------


def test_json_logging_contains_run_id_when_bound() -> None:
    """Criterion 6: Log lines are valid JSON containing run_id when bound."""
    formatter = JsonFormatter()
    logger = logging.getLogger("test_amrs_json_logger")

    # 1. Unbound run_id
    bind_run_id(None)
    record1 = logger.makeRecord(
        name="test_amrs_json_logger",
        level=logging.INFO,
        fn="test_utils.py",
        lno=100,
        msg="Initial startup",
        args=(),
        exc_info=None,
    )
    formatted1 = formatter.format(record1)
    parsed1 = json.loads(formatted1)
    assert parsed1["level"] == "INFO"
    assert parsed1["message"] == "Initial startup"
    assert parsed1["run_id"] is None

    # 2. Bound run_id
    bind_run_id("run-uuid-777-888")
    record2 = logger.makeRecord(
        name="test_amrs_json_logger",
        level=logging.WARNING,
        fn="test_utils.py",
        lno=105,
        msg="Recovery triggered",
        args=(),
        exc_info=None,
    )
    formatted2 = formatter.format(record2)
    parsed2 = json.loads(formatted2)
    assert parsed2["level"] == "WARNING"
    assert parsed2["message"] == "Recovery triggered"
    assert parsed2["run_id"] == "run-uuid-777-888"

    # Reset
    bind_run_id(None)


# ---------------------------------------------------------------------------
# sha256_file & Stopwatch
# ---------------------------------------------------------------------------


def test_sha256_file_streaming(tmp_path: Path) -> None:
    """sha256_file computes streaming SHA-256 digest matching known values."""
    f = tmp_path / "data.bin"
    data = b"Hello, AMRS cryptographic hashing!"
    f.write_bytes(data)

    hash_val = sha256_file(f)
    assert len(hash_val) == 64
    assert verify_sha256(f, hash_val)

    # Direct bytes hashing
    bytes_hash = compute_sha256(data)
    assert bytes_hash == hash_val


def test_fs_security_helpers(tmp_path: Path) -> None:
    """is_safe_filename, sanitize_filename, and assert_not_symlink validation."""
    assert is_safe_filename("valid_model.pt")
    assert not is_safe_filename("../escaped.pt")
    assert not is_safe_filename("sub/model.pt")
    assert not is_safe_filename("sub\\model.pt")
    assert not is_safe_filename("file\0.pt")
    assert not is_safe_filename("C:model.pt")
    assert not is_safe_filename("")

    assert sanitize_filename("bad/..//file*&^.pt") == "file.pt"
    assert sanitize_filename("???") == "unnamed_artifact"

    # assert_not_symlink on regular file
    regular = tmp_path / "reg.txt"
    regular.write_text("hello", encoding="utf-8")
    assert_not_symlink(regular)


def test_ensure_within_directory_bounds(tmp_path: Path) -> None:
    """ensure_within_directory validates isolation within parent."""
    parent = tmp_path / "sandbox"
    parent.mkdir()
    child = parent / "valid.txt"
    child.write_text("ok", encoding="utf-8")

    res = ensure_within_directory(child, parent)
    assert res == child.resolve()

    # Traversal escaping parent raises
    with pytest.raises(ValidationError):
        ensure_within_directory(tmp_path / "other.txt", parent)

    # Missing file raises when allow_missing=False
    missing = parent / "missing.txt"
    with pytest.raises(ValidationError):
        ensure_within_directory(missing, parent, allow_missing=False)

    # Allowed when allow_missing=True
    assert ensure_within_directory(missing, parent, allow_missing=True) == missing.resolve()


def test_get_logger_configuration() -> None:
    """get_logger creates logger with JsonFormatter and stream handler."""
    logger = get_logger("amrs_test_custom_stream")
    assert logger.handlers
    assert any(isinstance(h.formatter, JsonFormatter) for h in logger.handlers)

    # Test exception formatting
    try:
        raise ValueError("Simulated log exception")
    except ValueError:
        import sys

        record = logger.makeRecord(
            name="amrs_test_custom_stream",
            level=logging.ERROR,
            fn="test_utils.py",
            lno=200,
            msg="Failure occurred",
            args=(),
            exc_info=sys.exc_info(),
        )
        formatter = JsonFormatter()
        out_json = formatter.format(record)
        data = json.loads(out_json)
        assert "exception" in data
        assert "Simulated log exception" in data["exception"]


def test_stopwatch_context_manager() -> None:
    """Stopwatch measures elapsed wall-clock seconds."""
    with Stopwatch() as sw:
        time.sleep(0.01)

    assert sw.elapsed >= 0.005

    # Manual start/stop
    sw2 = Stopwatch()
    sw2.start()
    time.sleep(0.01)
    elapsed = sw2.stop()
    assert elapsed >= 0.005
