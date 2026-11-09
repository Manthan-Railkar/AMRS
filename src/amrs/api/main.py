"""FastAPI application initialization, routing, security hardening, and error handling for AMRS (BE-4)."""

from __future__ import annotations

import logging
import os
import re
import time
from typing import Any

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from amrs import __version__
from amrs.api.routes import (
    benchmarks,
    config,
    datasets,
    health,
    models,
    monitor,
    runs,
    scenarios,
)
from amrs.errors import AmrsError

# Load .env.local / .env if present
for _env_file in (".env.local", ".env"):
    _env_path = os.path.join(os.getcwd(), _env_file)
    if os.path.exists(_env_path):
        try:
            with open(_env_path, "r", encoding="utf-8") as _f:
                for _line in _f:
                    _line = _line.strip()
                    if _line and not _line.startswith("#") and "=" in _line:
                        _k, _v = _line.split("=", 1)
                        _k, _v = _k.strip(), _v.strip()
                        if _k and _k not in os.environ:
                            os.environ[_k] = _v
        except Exception:
            pass

logger = logging.getLogger("amrs.api")

MAX_REQUEST_BODY_BYTES = 200 * 1024 * 1024  # 200 MB maximum upload limit


def sanitize_secret_text(text: str) -> str:
    """Scrub absolute filesystem paths, tokens, and secrets from user-facing error messages."""
    if not isinstance(text, str):
        return text

    # Scrub Windows absolute paths (e.g. C:\Users\... or C:/Users/...)
    text = re.sub(r"[a-zA-Z]:[\\/][^\"'\s]+", "[REDACTED_PATH]", text)
    # Scrub Unix absolute paths (e.g. /home/... or /var/...)
    text = re.sub(r"/(?:Users|home|root|var|etc)[^\"'\s]*", "[REDACTED_PATH]", text)

    # Scrub specific sensitive environment variables if present
    for secret_env in ("AMRS_API_INTERNAL_URL", "AMRS_DB_PATH", "DATABASE_URL"):
        val = os.getenv(secret_env)
        if val and len(val) > 3:
            text = text.replace(val, "[REDACTED_SECRET]")

    return text


def sanitize_payload(obj: Any) -> Any:
    """Recursively sanitize strings inside nested dicts/lists to prevent secret and path leakage."""
    if isinstance(obj, str):
        return sanitize_secret_text(obj)
    if isinstance(obj, dict):
        return {k: sanitize_payload(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_payload(item) for item in obj]
    return obj


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

    # Configurable CORS for production deployment and local development
    cors_env = os.getenv("AMRS_CORS_ORIGINS", "")
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    if cors_env:
        for origin_item in cors_env.split(","):
            origin_item = origin_item.strip()
            if origin_item and origin_item not in allowed_origins:
                allowed_origins.append(origin_item)

    is_wildcard = "*" in allowed_origins

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if is_wildcard else allowed_origins,
        allow_credentials=not is_wildcard,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # -----------------------------------------------------------------------
    # Security Middleware: Headers, Size Bounds & Audit Logging
    # -----------------------------------------------------------------------

    @app.middleware("http")
    async def security_and_audit_middleware(request: Request, call_next: Any) -> Response:
        start_time = time.monotonic()

        # Enforce maximum content length
        content_length_header = request.headers.get("content-length")
        if content_length_header:
            try:
                content_length = int(content_length_header)
                if content_length > MAX_REQUEST_BODY_BYTES:
                    return JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={
                            "error": {
                                "code": "PAYLOAD_TOO_LARGE",
                                "message": f"Request body exceeds maximum size of {MAX_REQUEST_BODY_BYTES // (1024 * 1024)} MB.",
                                "details": {
                                    "content_length": content_length,
                                    "max_bytes": MAX_REQUEST_BODY_BYTES,
                                },
                            }
                        },
                    )
            except ValueError:
                pass

        # Execute downstream request
        response = await call_next(request)

        duration_ms = round((time.monotonic() - start_time) * 1000, 2)

        # Inject hardened HTTP security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"

        # Structured audit log without leaking authorization tokens or sensitive headers
        client_host = request.client.host if request.client else "unknown"
        logger.info(
            "AUDIT: %s %s %d (duration: %sms, client: %s)",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            client_host,
        )

        return response

    # -----------------------------------------------------------------------
    # Standardized Error Envelope Exception Handlers with Sanitization
    # -----------------------------------------------------------------------

    @app.exception_handler(AmrsError)
    async def amrs_error_handler(request: Request, exc: AmrsError) -> JSONResponse:
        sanitized_content = sanitize_payload(exc.to_dict())
        return JSONResponse(
            status_code=exc.status_code,
            content=sanitized_content,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors_list = []
        for err in exc.errors():
            loc = ".".join(str(x) for x in err.get("loc", []))
            errors_list.append(
                {
                    "field": loc,
                    "message": sanitize_secret_text(err.get("msg", "Invalid value")),
                    "type": err.get("type", "value_error"),
                }
            )

        content = {
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed.",
                "details": {"validation_errors": errors_list},
            }
        }
        return JSONResponse(
            status_code=422,
            content=sanitize_payload(content),
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        content = {
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": sanitize_secret_text(str(exc.detail)),
                "details": {},
            }
        }
        return JSONResponse(
            status_code=exc.status_code,
            content=content,
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
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
    v1_router.include_router(datasets.router)
    v1_router.include_router(monitor.router)
    v1_router.include_router(benchmarks.router)

    app.include_router(v1_router)

    # Direct /health alias for root health probes
    app.include_router(health.router)

    return app


app = create_app()
