"""Unit tests for AMRS lifecycle state machine and transitions (BE-3)."""

import pytest

from amrs.errors import ConflictError
from amrs.pipeline.lifecycle import (
    LEGAL_TRANSITIONS,
    RunStatus,
    validate_status_transition,
)


def test_status_enum_values() -> None:
    expected = {"queued", "running", "succeeded", "failed", "cancel_requested", "cancelled"}
    actual = {s.value for s in RunStatus}
    assert actual == expected


def test_terminal_and_active_properties() -> None:
    assert RunStatus.SUCCEEDED.is_terminal is True
    assert RunStatus.FAILED.is_terminal is True
    assert RunStatus.CANCELLED.is_terminal is True
    assert RunStatus.QUEUED.is_terminal is False
    assert RunStatus.RUNNING.is_terminal is False
    assert RunStatus.CANCEL_REQUESTED.is_terminal is False

    assert RunStatus.QUEUED.is_active is True
    assert RunStatus.RUNNING.is_active is True
    assert RunStatus.CANCEL_REQUESTED.is_active is True
    assert RunStatus.SUCCEEDED.is_active is False
    assert RunStatus.FAILED.is_active is False
    assert RunStatus.CANCELLED.is_active is False


def test_legal_transitions() -> None:
    # All defined transitions in LEGAL_TRANSITIONS must succeed
    for current, targets in LEGAL_TRANSITIONS.items():
        for target in targets:
            result = validate_status_transition(current, target)
            assert result == target

    # Identity transition (same status) always succeeds
    for status in RunStatus:
        assert validate_status_transition(status, status) == status


def test_illegal_transitions_raise_conflict() -> None:
    illegal_cases = [
        # Terminal state mutations
        (RunStatus.SUCCEEDED, RunStatus.RUNNING),
        (RunStatus.SUCCEEDED, RunStatus.QUEUED),
        (RunStatus.FAILED, RunStatus.RUNNING),
        (RunStatus.FAILED, RunStatus.CANCELLED),
        (RunStatus.CANCELLED, RunStatus.RUNNING),
        # Skipped or backward transitions
        (RunStatus.QUEUED, RunStatus.SUCCEEDED),  # Cannot succeed without running
        (RunStatus.RUNNING, RunStatus.QUEUED),  # Cannot move backward
        (
            RunStatus.CANCEL_REQUESTED,
            RunStatus.SUCCEEDED,
        ),  # Cannot succeed once cancellation requested
        (RunStatus.CANCEL_REQUESTED, RunStatus.RUNNING),  # Cannot resume running
    ]

    for current, target in illegal_cases:
        with pytest.raises(ConflictError) as exc_info:
            validate_status_transition(current, target)
        assert exc_info.value.code == "CONFLICT"
        assert (
            f"Illegal state transition from '{current.value}' to '{target.value}'"
            in exc_info.value.message
        )


def test_invalid_status_string_raises() -> None:
    with pytest.raises(ConflictError):
        validate_status_transition("invalid_status", RunStatus.RUNNING)

    with pytest.raises(ConflictError):
        validate_status_transition(RunStatus.QUEUED, "unknown_status")
