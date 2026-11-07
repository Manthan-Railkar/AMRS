"""Hardened model upload and validation endpoints (BE-4).

Enforces:
1. Upload disabled by default unless AMRS_ALLOW_UPLOAD=1 (403 Forbidden).
2. Architecture verification against allowlisted registry (422 Validation).
3. Extension and malicious filename rejection (path traversal, null bytes, absolute paths).
4. Streamed size enforcement (413 Payload Too Large).
5. Safe unpickling with weights_only=True (415 Unsafe Or Invalid Checkpoint).
6. Tensor key and shape compatibility check against target architecture (422 Architecture Mismatch).
7. Server-side generated filenames, isolated per-upload storage, and SHA-256 recording.
"""

from __future__ import annotations

import hashlib
import json
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, UploadFile, status

from amrs.errors import (
    ForbiddenError,
    PayloadTooLargeError,
    ValidationError,
)
from amrs.models.loader import build_and_load, load_state_dict_safe
from amrs.models.registry import is_registered, list_registered
from amrs.schemas import ModelUploadResponse
from amrs.utils.fs import assert_not_symlink, is_safe_filename, sanitize_filename

router = APIRouter(prefix="/models", tags=["Models"])

DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB limit by default
ALLOWED_EXTENSIONS = {".pt", ".pth", ".bin"}


def get_uploads_root() -> Path:
    """Return the base directory for model uploads."""
    root = Path(os.getenv("AMRS_UPLOADS_ROOT", "uploads")).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
    response_model=ModelUploadResponse,
    summary="Upload PyTorch model state_dict",
    description="Upload a state_dict checkpoint for registered model architectures with weights_only validation.",
)
async def upload_model(
    file: UploadFile = File(...),
    arch: str = Form(..., description="Architecture name from model registry"),
) -> ModelUploadResponse:
    # 1. Enforce AMRS_ALLOW_UPLOAD environment variable (disabled by default)
    allow_upload = os.getenv("AMRS_ALLOW_UPLOAD", "0").lower() in ("1", "true", "yes")
    if not allow_upload:
        raise ForbiddenError(
            message="Model uploads are disabled on this instance. Enable via AMRS_ALLOW_UPLOAD=1.",
            details={
                "hint": "Set AMRS_ALLOW_UPLOAD=1 in server environment to enable model uploads."
            },
        )

    # 2. Validate architecture against registry
    if not is_registered(arch):
        raise ValidationError(
            message=f"Architecture '{arch}' is not in the supported model registry.",
            details={"arch": arch, "supported_architectures": list_registered()},
        )

    # 3. Validate client filename for path traversal and dangerous characters
    client_filename = file.filename or "model.pt"
    if not is_safe_filename(client_filename):
        raise ValidationError(
            message="Malicious or invalid filename detected. Directory traversal characters are forbidden.",
            details={"filename": client_filename},
        )

    ext = os.path.splitext(client_filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            message=f"File extension '{ext}' is not supported. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
            details={"filename": client_filename, "allowed_extensions": sorted(ALLOWED_EXTENSIONS)},
        )

    safe_name = sanitize_filename(client_filename)

    # 4. Enforce upload size limits
    max_bytes = int(os.getenv("AMRS_MAX_UPLOAD_BYTES", str(DEFAULT_MAX_UPLOAD_BYTES)))

    # 5. Prepare isolated upload directory with server-generated ID
    upload_id = str(uuid.uuid4())
    upload_dir = get_uploads_root() / upload_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Always save under server-controlled filename (never trust client filename directly)
    target_path = upload_dir / "model.pt"

    hasher = hashlib.sha256()
    total_bytes = 0
    chunk_size = 1024 * 1024  # 1MB chunks

    try:
        with open(target_path, "wb") as f_out:
            while chunk := await file.read(chunk_size):
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    raise PayloadTooLargeError(
                        message=f"Uploaded file exceeds limit of {max_bytes // (1024 * 1024)} MB.",
                        details={"size_bytes": total_bytes, "max_bytes": max_bytes},
                    )
                hasher.update(chunk)
                f_out.write(chunk)

        # 6. Reject symlinks
        assert_not_symlink(target_path)

        # 7. Safe state_dict and architecture verification
        # Step 7a: Must load cleanly with weights_only=True and contain only Tensors
        _ = load_state_dict_safe(target_path)

        # Step 7b: Must match target architecture keys and shapes
        _ = build_and_load(arch, target_path)

        # 8. Record metadata immutably
        sha256_hash = hasher.hexdigest()
        meta = {
            "upload_id": upload_id,
            "arch": arch,
            "sha256": sha256_hash,
            "size_bytes": total_bytes,
            "filename": safe_name,
        }
        (upload_dir / "meta.json").write_text(json.dumps(meta, indent=2))

    except Exception:
        # If any validation step fails, delete temporary upload files
        if target_path.exists():
            try:
                target_path.unlink()
            except OSError:
                pass
        meta_file = upload_dir / "meta.json"
        if meta_file.exists():
            try:
                meta_file.unlink()
            except OSError:
                pass
        try:
            upload_dir.rmdir()
        except OSError:
            pass
        raise

    return ModelUploadResponse(
        model_upload_id=upload_id,
        arch=arch,
        filename=safe_name,
        sha256=sha256_hash,
        size_bytes=total_bytes,
    )
