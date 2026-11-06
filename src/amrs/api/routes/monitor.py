"""Live training monitor replay endpoints."""

from fastapi import APIRouter, Depends, status
from amrs.api.deps import get_coordinator
from amrs.api.jobs import JobCoordinator
from amrs.schemas import (
    MonitorReplayDetailResponse,
    MonitorReplayRequest,
    MonitorReplayResponse,
)

router = APIRouter(prefix="/monitor", tags=["Live Monitor"])


@router.post(
    "/replay",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=MonitorReplayResponse,
    summary="Replay training history through live monitor",
    description="Enqueue replay of recorded training history to evaluate monitor triggers and actions.",
)
async def start_monitor_replay(
    req: MonitorReplayRequest,
    coordinator: JobCoordinator = Depends(get_coordinator),
) -> MonitorReplayResponse:
    replay_id = coordinator.create_monitor_replay(req)
    return MonitorReplayResponse(replay_id=replay_id, status="queued")


@router.get(
    "/replay/{replay_id}",
    response_model=MonitorReplayDetailResponse,
    summary="Get monitor replay metrics and events",
    description="Retrieve smoothed metrics, warning events, and recovery triggers generated during replay.",
)
async def get_monitor_replay_detail(
    replay_id: str,
    coordinator: JobCoordinator = Depends(get_coordinator),
) -> MonitorReplayDetailResponse:
    return coordinator.get_monitor_replay(replay_id)

