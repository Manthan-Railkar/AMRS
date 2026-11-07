"""Filesystem security, atomic writes, sandbox validation, and path traversal guards (INF-1.2)."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import IO, Any, Callable

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


def safe_join(base: str | Path, *paths: str | Path) -> Path:
    """Safely join paths ensuring the result does not escape the base directory.

    Raises:
        ValidationError: If any path segment attempts path traversal (e.g. '../x')
                         or escapes the base directory.
    """
    base_path = Path(base).resolve()
    current = base_path

    for part in paths:
        part_str = str(part)
        if "\0" in part_str:
            raise ValidationError(
                message="Null byte in path is prohibited.",
                details={"part": part_str},
            )

        # Disallow explicit traversal prefix like "../x" or "..\\x"
        norm = os.path.normpath(part_str)
        if norm == ".." or norm.startswith(f"..{os.sep}") or norm.startswith("../"):
            raise ValidationError(
                message=f"Path traversal attempt detected in path segment '{part_str}'.",
                details={"segment": part_str, "base": str(base_path)},
            )

        # Check for absolute path in segment attempting to reset root
        if os.path.isabs(part_str) or (len(part_str) > 1 and part_str[1] == ":"):
            # Only allowed if it's already within base
            test_target = Path(part_str).resolve()
            try:
                test_target.relative_to(base_path)
            except ValueError:
                raise ValidationError(
                    message=f"Absolute path '{part_str}' escapes base directory '{base_path}'.",
                    details={"path": part_str, "base": str(base_path)},
                )
            current = test_target
            continue

        candidate = (current / part_str).resolve()
        try:
            candidate.relative_to(base_path)
        except ValueError:
            raise ValidationError(
                message=f"Path traversal detected: path escapes base directory '{base_path}'.",
                details={"segment": part_str, "base": str(base_path)},
            )
        current = candidate

    return current


def atomic_write(
    path: str | Path,
    content: bytes | str | Callable[[IO[Any]], None],
    encoding: str = "utf-8",
) -> Path:
    """Write data to path atomically using a temporary file and os.replace.

    Leaves no partial file if the writer raises an exception.
    """
    target = Path(path).resolve()
    target.parent.mkdir(parents=True, exist_ok=True)

    is_binary = isinstance(content, bytes)
    mode = "wb" if is_binary else "w"

    temp_file = tempfile.NamedTemporaryFile(
        dir=target.parent,
        prefix=f".{target.name}.",
        suffix=".tmp",
        delete=False,
        mode=mode,
        encoding=None if is_binary else encoding,
    )
    temp_path = Path(temp_file.name)

    try:
        if callable(content):
            content(temp_file)
        elif is_binary:
            temp_file.write(content)
        else:
            temp_file.write(content)

        temp_file.flush()
        os.fsync(temp_file.fileno())
        temp_file.close()

        os.replace(temp_path, target)
        return target
    except Exception:
        try:
            if not temp_file.closed:
                temp_file.close()
        except Exception:
            pass
        if temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass
        raise


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


__all__ = [
    "is_safe_filename",
    "sanitize_filename",
    "assert_not_symlink",
    "safe_join",
    "atomic_write",
    "ensure_within_directory",
]
