"""Recovery run lifecycle and artifact endpoints."""

from fastapi import APIRouter, Depends, Query, Response, status
from amrs.api.deps import get_coordinator
from amrs.api.jobs import JobCoordinator
from amrs.schemas import (
    RunCancelResponse,
    RunCreateRequest,
    RunCreateResponse,
    RunDetailResponse,
    RunListResponse,
)

router = APIRouter(prefix="/runs", tags=["Runs"])


@router.post(
    "",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=RunCreateResponse,
    summary="Create a recovery run",
    description="Enqueue an asynchronous recovery run from a scenario or uploaded model.",
)
async def create_run(
    req: RunCreateRequest,
    coordinator: JobCoordinator = Depends(get_coordinator),
) -> RunCreateResponse:
    run_id = coordinator.create_run(req)
    return RunCreateResponse(run_id=run_id, status="queued")


@router.get(
    "",
    response_model=RunListResponse,
    summary="List recovery runs",
    description="Get a paginated history of recovery runs with optional filtering.",
)
async def list_runs(
    verdict: str | None = Query(None, description="Filter by terminal verdict"),
    scenario_id: str | None = Query(None, description="Filter by scenario ID"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    offset: int = Query(0, ge=0, description="Page offset"),
    coordinator: JobCoordinator = Depends(get_coordinator),
) -> RunListResponse:
    runs, total = coordinator.list_runs(
        verdict=verdict,
        scenario_id=scenario_id,
        limit=limit,
        offset=offset,
    )
    return RunListResponse(runs=runs, total=total, limit=limit, offset=offset)


@router.get(
    "/{run_id}",
    response_model=RunDetailResponse,
    summary="Get run detail and progress",
    description="Retrieve full execution status, diagnosis, candidate summaries, and verification verdicts.",
)
async def get_run_detail(
    run_id: str,
    coordinator: JobCoordinator = Depends(get_coordinator),
) -> RunDetailResponse:
    return coordinator.get_run(run_id)


@router.post(
    "/{run_id}/cancel",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=RunCancelResponse,
    summary="Cancel active run",
    description="Request cooperative cancellation of an active recovery run, preserving original model weights.",
)
async def cancel_run(
    run_id: str,
    coordinator: JobCoordinator = Depends(get_coordinator),
) -> RunCancelResponse:
    cancelled_id = coordinator.cancel_run(run_id)
    return RunCancelResponse(
        run_id=cancelled_id,
        status="cancel_requested",
        message="Cooperative cancellation requested. Original weights will remain untouched.",
    )


@router.get(
    "/{run_id}/artifacts/{name}",
    summary="Download run artifact",
    description="Securely download allowlisted artifacts ('accepted_model.pt', 'report.json', 'report.md').",
)
async def download_artifact(
    run_id: str,
    name: str,
    coordinator: JobCoordinator = Depends(get_coordinator),
) -> Response:
    content, media_type = coordinator.get_artifact(run_id, name)
    filename = f"{run_id}_{name}"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return Response(content=content, media_type=media_type, headers=headers)

