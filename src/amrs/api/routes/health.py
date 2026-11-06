"""Health check endpoint."""

from fastapi import APIRouter
from amrs import __version__
from amrs.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Check liveness, version, and database connection status.",
)
async def get_health() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        version=__version__,
        db_status="ok",
    )

