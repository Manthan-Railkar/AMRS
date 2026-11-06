"""FastAPI application initialization and routing for AMRS."""

import logging
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from amrs import __version__
from amrs.api.routes import (
    benchmarks,
    config,
    health,
    models,
    monitor,
    runs,
    scenarios,
)
from amrs.errors import AmrsError

logger = logging.getLogger("amrs.api")


def create_app() -> FastAPI:
    """Application factory for AMRS FastAPI service."""
    app = FastAPI(
        title="AMRS API",
        description="Adaptive Model Recovery System - Automated diagnosis, surgical repair, and held-out verification.",
        version=__version__,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # Narrow CORS configuration for local testing and same-origin proxy
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    # -----------------------------------------------------------------------
    # Standardized Error Envelope Exception Handlers
    # -----------------------------------------------------------------------

    @app.exception_handler(AmrsError)
    async def amrs_error_handler(request: Request, exc: AmrsError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.to_dict(),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # Sanitize error representations for frontend consumption
        errors_list = []
        for err in exc.errors():
            loc = ".".join(str(x) for x in err.get("loc", []))
            errors_list.append(
                {
                    "field": loc,
                    "message": err.get("msg", "Invalid value"),
                    "type": err.get("type", "value_error"),
                }
            )

        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed.",
                    "details": {"validation_errors": errors_list},
                }
            },
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request, exc: HTTPException
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": f"HTTP_{exc.status_code}",
                    "message": str(exc.detail),
                    "details": {},
                }
            },
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception("Unhandled server exception: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred during request processing.",
                    "details": {},
                }
            },
        )

    # -----------------------------------------------------------------------
    # Route Registration under /api/v1
    # -----------------------------------------------------------------------

    v1_router = FastAPI().router
    v1_router.prefix = "/api/v1"

    v1_router.include_router(health.router)
    v1_router.include_router(config.router)
    v1_router.include_router(scenarios.router)
    v1_router.include_router(runs.router)
    v1_router.include_router(models.router)
    v1_router.include_router(monitor.router)
    v1_router.include_router(benchmarks.router)

    app.include_router(v1_router)

    # Direct /health alias for root health probes
    app.include_router(health.router)

    return app


app = create_app()
