"""Unit tests for AMRS domain errors and standardized error envelopes."""

from amrs.errors import (
    AmrsError,
    CandidateError,
    ConfigInvalidError,
    ConflictError,
    ForbiddenError,
    HoldoutTooSmallError,
    ModelArchMismatchError,
    NoBnLayersError,
    NoHistoryError,
    NonFiniteError,
    NotFoundError,
    OOMError,
    PayloadTooLargeError,
    RunCancelledError,
    UnsafeOrInvalidCheckpointError,
    ValidationError,
)


def test_base_amrs_error_serialization() -> None:
    err = AmrsError(
        code="CUSTOM_CODE",
        message="A custom error",
        details={"foo": "bar"},
        status_code=400,
    )
    assert err.code == "CUSTOM_CODE"
    assert err.status_code == 400
    assert err.to_dict() == {
        "error": {
            "code": "CUSTOM_CODE",
            "message": "A custom error",
            "details": {"foo": "bar"},
        }
    }


def test_standard_subclass_codes_and_statuses() -> None:
    cases = [
        (NotFoundError, "NOT_FOUND", 404),
        (ConflictError, "CONFLICT", 409),
        (ValidationError, "VALIDATION_ERROR", 422),
        (ConfigInvalidError, "CONFIG_INVALID", 422),
        (ModelArchMismatchError, "MODEL_ARCH_MISMATCH", 422),
        (UnsafeOrInvalidCheckpointError, "UNSAFE_OR_INVALID_CHECKPOINT", 415),
        (HoldoutTooSmallError, "HOLDOUT_TOO_SMALL", 422),
        (NoHistoryError, "NO_HISTORY", 422),
        (NoBnLayersError, "NO_BN_LAYERS", 422),
        (NonFiniteError, "NON_FINITE", 422),
        (CandidateError, "CANDIDATE_ERROR", 500),
        (RunCancelledError, "RUN_CANCELLED", 409),
        (OOMError, "OOM", 500),
        (ForbiddenError, "FORBIDDEN", 403),
        (PayloadTooLargeError, "PAYLOAD_TOO_LARGE", 413),
    ]

    for cls, expected_code, expected_status in cases:
        instance = cls(message="Testing error", details={"key": "val"})
        assert instance.code == expected_code
        assert instance.status_code == expected_status
        payload = instance.to_dict()
        assert "error" in payload
        assert payload["error"]["code"] == expected_code
        assert payload["error"]["message"] == "Testing error"
        assert payload["error"]["details"] == {"key": "val"}
