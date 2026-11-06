"""AMRS custom exceptions and standardized error representations."""

from typing import Any


class AmrsError(Exception):
    """Base exception for all AMRS domain and API errors."""

    def __init__(
        self,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
        status_code: int = 400,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}
        self.status_code = status_code

    def to_dict(self) -> dict[str, Any]:
        """Format into the standardized AMRS error envelope."""
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
            }
        }


class NotFoundError(AmrsError):
    """Resource was not found."""

    def __init__(
        self,
        message: str = "Resource not found",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            code="NOT_FOUND",
            message=message,
            details=details,
            status_code=404,
        )


class ConflictError(AmrsError):
    """Resource conflict, e.g. a recovery run is already active."""

    def __init__(
        self,
        message: str = "Resource conflict or active run already in progress",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            code="CONFLICT",
            message=message,
            details=details,
            status_code=409,
        )


class ValidationError(AmrsError):
    """Configuration or request validation failed."""

    def __init__(
        self,
        message: str = "Validation error",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            details=details,
            status_code=422,
        )


class ConfigInvalidError(AmrsError):
    """Configuration contains invalid or out-of-range thresholds."""

    def __init__(
        self,
        message: str = "Invalid configuration",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            code="CONFIG_INVALID",
            message=message,
            details=details,
            status_code=422,
        )


class ModelArchMismatchError(AmrsError):
    """Supplied weights do not match the specified model architecture."""

    def __init__(
        self,
        message: str = "Model architecture mismatch with checkpoint tensors",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            code="MODEL_ARCH_MISMATCH",
            message=message,
            details=details,
            status_code=422,
        )


class UnsafeOrInvalidCheckpointError(AmrsError):
    """Checkpoint could not be safely loaded with weights_only=True."""

    def __init__(
        self,
        message: str = "Checkpoint is invalid or failed safe loading verification",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            code="UNSAFE_OR_INVALID_CHECKPOINT",
            message=message,
            details=details,
            status_code=415,
        )


class HoldoutTooSmallError(AmrsError):
    """Holdout split has fewer samples than the required minimum."""

    def __init__(
        self,
        message: str = "Holdout dataset size is below the minimum required threshold",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            code="HOLDOUT_TOO_SMALL",
            message=message,
            details=details,
            status_code=422,
        )


class NoHistoryError(AmrsError):
    """Historical checkpoints required by strategy are missing."""

    def __init__(
        self,
        message: str = "No training checkpoint history provided for checkpoint strategies",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            code="NO_HISTORY",
            message=message,
            details=details,
            status_code=422,
        )


class NoBnLayersError(AmrsError):
    """Model does not contain BatchNorm layers for recalibration."""

    def __init__(
        self,
        message: str = "Model does not contain BatchNorm layers for recalibration",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            code="NO_BN_LAYERS",
            message=message,
            details=details,
            status_code=422,
        )


class NonFiniteError(AmrsError):
    """Candidate weights or metrics contain NaN or Inf values."""

    def __init__(
        self,
        message: str = "Non-finite values encountered in candidate weights or outputs",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            code="NON_FINITE",
            message=message,
            details=details,
            status_code=422,
        )


class CandidateError(AmrsError):
    """An unrecoverable exception occurred during candidate generation or evaluation."""

    def __init__(
        self,
        message: str = "Candidate recovery evaluation failed",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            code="CANDIDATE_ERROR",
            message=message,
            details=details,
            status_code=500,
        )


class RunCancelledError(AmrsError):
    """Recovery run was cancelled by user request."""

    def __init__(
        self,
        message: str = "Run was cancelled by user request",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            code="RUN_CANCELLED",
            message=message,
            details=details,
            status_code=409,
        )


class OOMError(AmrsError):
    """Out of memory error during recovery or evaluation."""

    def __init__(
        self,
        message: str = "Out of memory during model execution",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            code="OOM",
            message=message,
            details=details,
            status_code=500,
        )


class ForbiddenError(AmrsError):
    """Action is forbidden, such as uploads when disabled."""

    def __init__(
        self,
        message: str = "Action is not permitted",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            code="FORBIDDEN",
            message=message,
            details=details,
            status_code=403,
        )


class PayloadTooLargeError(AmrsError):
    """Uploaded file or payload exceeds maximum allowed size."""

    def __init__(
        self,
        message: str = "Upload payload exceeds maximum allowed size",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            code="PAYLOAD_TOO_LARGE",
            message=message,
            details=details,
            status_code=413,
        )

