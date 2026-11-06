"""Model upload and validation endpoints."""

import hashlib
import os
import uuid
from fastapi import APIRouter, File, Form, UploadFile, status
from amrs.errors import ForbiddenError, PayloadTooLargeError, ValidationError
from amrs.schemas import ModelUploadResponse

router = APIRouter(prefix="/models", tags=["Models"])

MAX_UPLOAD_BYTES = 200 * 1024 * 1024  # 200 MB limit
ALLOWED_EXTENSIONS = {".pt", ".pth", ".bin"}
SUPPORTED_ARCHITECTURES = {"mlp_small", "small_cnn", "resnet18_cifar"}


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
            details={"hint": "Set AMRS_ALLOW_UPLOAD=1 in server environment to enable model uploads."},
        )

    # 2. Validate architecture against registry
    if arch not in SUPPORTED_ARCHITECTURES:
        raise ValidationError(
            message=f"Architecture '{arch}' is not in the supported model registry.",
            details={"arch": arch, "supported_architectures": sorted(SUPPORTED_ARCHITECTURES)},
        )

    # 3. Validate file extension
    filename = file.filename or "model.pt"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            message=f"File extension '{ext}' is not supported. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
            details={"filename": filename, "allowed_extensions": sorted(ALLOWED_EXTENSIONS)},
        )

    # 4. Stream and hash payload while checking size limit
    hasher = hashlib.sha256()
    total_bytes = 0
    chunk_size = 1024 * 1024  # 1MB chunks

    while chunk := await file.read(chunk_size):
        total_bytes += len(chunk)
        if total_bytes > MAX_UPLOAD_BYTES:
            raise PayloadTooLargeError(
                message=f"Uploaded file exceeds limit of {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
                details={"size_bytes": total_bytes, "max_bytes": MAX_UPLOAD_BYTES},
            )
        hasher.update(chunk)

    upload_id = str(uuid.uuid4())
    sha256_hash = hasher.hexdigest()

    return ModelUploadResponse(
        model_upload_id=upload_id,
        arch=arch,
        filename=filename,
        sha256=sha256_hash,
        size_bytes=total_bytes,
    )

