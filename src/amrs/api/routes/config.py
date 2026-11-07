"""Configuration endpoints."""

from fastapi import APIRouter

from amrs.schemas import ConfigDefaultsResponse

router = APIRouter(prefix="/config", tags=["Configuration"])


@router.get(
    "/defaults",
    response_model=ConfigDefaultsResponse,
    summary="Get configuration defaults",
    description="Retrieve the default validated AMRS configuration as JSON.",
)
async def get_config_defaults() -> ConfigDefaultsResponse:
    return ConfigDefaultsResponse()
