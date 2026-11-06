"""Filesystem security, sandbox validation, and path traversal guards."""

from __future__ import annotations

import os
from pathlib import Path

from amrs.errors import ValidationError


def is_safe_filename(name: str) -> bool:
    """Check whether a filename is safe and free of path traversal sequences."""
    if not name or "\0" in name:
        return False

    # Disallow path separators and traversal tokens
    if "/" in name or "\\" in name or ".." in name:
        return False

    # Disallow root or drive specs (e.g. C:, D:)
    if len(name) > 1 and name[1] == ":":
        return False

    return True


def sanitize_filename(name: str) -> str:
    """Extract base filename and strip unsafe characters."""
    base = os.path.basename(name)
    cleaned = "".join(c for c in base if c.isalnum() or c in (".", "-", "_")).strip()
    return cleaned or "unnamed_artifact"


def assert_not_symlink(path: str | Path) -> None:
    """Raise ValidationError if the given path is a symbolic link."""
    p = Path(path)
    if os.path.islink(p):
        raise ValidationError(
            message=f"Symbolic link detected at '{p.name}'. Symlinks are prohibited for security.",
            details={"path": p.name},
        )


def ensure_within_directory(
    target_path: str | Path,
    parent_directory: str | Path,
    allow_missing: bool = False,
) -> Path:
    """Verify that target_path strictly resolves within parent_directory.

    Raises:
        ValidationError: If target escapes parent_directory (path traversal attempt) or is a symlink.
    """
    parent = Path(parent_directory).resolve()
    target = Path(target_path).resolve()

    # Reject symlinks in the target
    if os.path.islink(target_path):
        raise ValidationError(
            message="Symbolic link target is prohibited for security.",
            details={"target": str(Path(target_path).name)},
        )

    # Check that parent directory is indeed an ancestor
    try:
        target.relative_to(parent)
    except ValueError:
        raise ValidationError(
            message="Path traversal attempt detected. Target path escapes the isolated directory.",
            details={"target": target.name},
        )

    if not allow_missing and not target.exists():
        raise ValidationError(
            message=f"Target file '{target.name}' does not exist.",
            details={"target": target.name},
        )

    return target

