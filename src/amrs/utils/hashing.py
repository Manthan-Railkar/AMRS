"""Cryptographic hashing utilities for models, datasets, and artifacts."""

from __future__ import annotations

import hashlib
from pathlib import Path


def compute_sha256(source: str | Path | bytes) -> str:
    """Compute SHA-256 hexadecimal digest for bytes or a file on disk."""
    hasher = hashlib.sha256()

    if isinstance(source, bytes):
        hasher.update(source)
    else:
        path = Path(source).resolve()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b""):
                hasher.update(chunk)

    return hasher.hexdigest()


def verify_sha256(source: str | Path | bytes, expected_hash: str) -> bool:
    """Check whether SHA-256 matches the expected hexadecimal digest."""
    return compute_sha256(source).lower() == expected_hash.strip().lower()

