"""AMRS run lifecycle states and state transition validation (BE-3)."""

from __future__ import annotations

from enum import Enum

from amrs.errors import ConflictError


class RunStatus(str, Enum):
    """Explicit lifecycle states for AMRS recovery runs."""

    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCEL_REQUESTED = "cancel_requested"
    CANCELLED = "cancelled"

    @property
    def is_terminal(self) -> bool:
        """Return True if this state is terminal and immutable."""
        return self in (RunStatus.SUCCEEDED, RunStatus.FAILED, RunStatus.CANCELLED)

    @property
    def is_active(self) -> bool:
        """Return True if this state is active and consuming worker resources."""
        return self in (RunStatus.QUEUED, RunStatus.RUNNING, RunStatus.CANCEL_REQUESTED)


# Explicit directed graph of legal state transitions
LEGAL_TRANSITIONS: dict[RunStatus, set[RunStatus]] = {
    RunStatus.QUEUED: {
        RunStatus.RUNNING,
        RunStatus.CANCEL_REQUESTED,
        RunStatus.CANCELLED,
        RunStatus.FAILED,
    },
    RunStatus.RUNNING: {
        RunStatus.SUCCEEDED,
        RunStatus.FAILED,
        RunStatus.CANCEL_REQUESTED,
        RunStatus.CANCELLED,
    },
    RunStatus.CANCEL_REQUESTED: {
        RunStatus.CANCELLED,
        RunStatus.FAILED,
    },
    RunStatus.SUCCEEDED: set(),  # Terminal: no transitions allowed
    RunStatus.FAILED: set(),  # Terminal: no transitions allowed
    RunStatus.CANCELLED: set(),  # Terminal: no transitions allowed
}


def validate_status_transition(current: str | RunStatus, target: str | RunStatus) -> RunStatus:
    """Validate that transition from current to target status is legal.

    Raises:
        ConflictError: If the transition is illegal or attempts to mutate a terminal run.
    """
    try:
        curr_enum = RunStatus(current)
    except ValueError:
        raise ConflictError(
            message=f"Current status '{current}' is not a recognized RunStatus.",
            details={"current": str(current), "target": str(target)},
        )

    try:
        target_enum = RunStatus(target)
    except ValueError:
        raise ConflictError(
            message=f"Target status '{target}' is not a recognized RunStatus.",
            details={"current": str(current), "target": str(target)},
        )

    if curr_enum == target_enum:
        return target_enum

    allowed = LEGAL_TRANSITIONS.get(curr_enum, set())
    if target_enum not in allowed:
        raise ConflictError(
            message=f"Illegal state transition from '{curr_enum.value}' to '{target_enum.value}'.",
            details={
                "current": curr_enum.value,
                "target": target_enum.value,
                "allowed_transitions": sorted(s.value for s in allowed),
            },
        )

    return target_enum
