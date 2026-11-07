"""End-to-end tests for Docker and container health verification (INF-2.2).

These tests verify container configuration, Docker Compose health endpoints, and
non-root security policies. Marked as 'e2e' and automatically skipped if the Docker
daemon or docker CLI is unavailable in the execution environment.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def is_docker_available() -> bool:
    """Check if docker and docker-compose / docker compose are available on PATH."""
    docker_bin = shutil.which("docker")
    if not docker_bin:
        return False
    try:
        res = subprocess.run(
            ["docker", "info"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=5,
        )
        return res.returncode == 0
    except Exception:
        return False


@pytest.mark.e2e
@pytest.mark.slow
@pytest.mark.skipif(
    not is_docker_available(),
    reason="Docker daemon or CLI is not available in current test environment.",
)
def test_docker_compose_build_and_health() -> None:
    """Validate that docker compose build succeeds and serves the /api/v1/health endpoint."""
    # Build containers
    build_res = subprocess.run(
        ["docker", "compose", "build"],
        cwd=REPO_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=300,
    )
    assert build_res.returncode == 0, (
        f"docker compose build failed:\n{build_res.stderr}\n{build_res.stdout}"
    )

    # Launch services in background
    try:
        up_res = subprocess.run(
            ["docker", "compose", "up", "-d"],
            cwd=REPO_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=60,
        )
        assert up_res.returncode == 0, (
            f"docker compose up failed:\n{up_res.stderr}\n{up_res.stdout}"
        )

        # Wait for healthcheck to pass on api container
        import time
        import urllib.request

        health_url = "http://localhost:8000/api/v1/health"
        passed = False
        last_error = None

        for _ in range(12):
            try:
                with urllib.request.urlopen(health_url, timeout=3) as resp:
                    if resp.status == 200:
                        passed = True
                        break
            except Exception as e:
                last_error = e
                time.sleep(2)

        assert passed, f"Healthcheck did not return 200 within timeout. Last error: {last_error}"

    finally:
        # Tear down containers and volumes
        subprocess.run(
            ["docker", "compose", "down", "-v"],
            cwd=REPO_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=60,
        )


def test_dockerfile_configuration_integrity() -> None:
    """Static validation of Dockerfile specifications without requiring Docker daemon.

    Verifies non-root user creation, python:3.11-slim base, and port exposure.
    """
    dockerfile_path = REPO_ROOT / "Dockerfile"
    assert dockerfile_path.exists(), "Dockerfile must exist at repository root"

    content = dockerfile_path.read_text(encoding="utf-8")

    # (1) Base image must be python:3.11-slim
    assert "python:3.11-slim" in content, "Dockerfile must use python:3.11-slim base image"

    # (2) Must have build argument for TORCH_INDEX
    assert "ARG TORCH_INDEX=" in content, "Dockerfile must define ARG TORCH_INDEX"

    # (3) Must run as non-root user
    assert "useradd" in content, "Dockerfile must create a system user"
    assert "USER amrs" in content, "Dockerfile must specify non-root USER"

    # (4) Must expose internal port 8000 and 3000
    assert "EXPOSE 8000" in content, "Dockerfile must expose port 8000"
    assert "EXPOSE 8000 3000" in content or ("EXPOSE 8000" in content and "3000" in content), (
        "Dockerfile must expose ports 8000 and 3000"
    )

    # (5) Must have healthcheck for /api/v1/health
    assert "HEALTHCHECK" in content and "/api/v1/health" in content, (
        "Dockerfile must define HEALTHCHECK on /api/v1/health"
    )


def test_docker_compose_configuration_integrity() -> None:
    """Static validation of docker-compose.yml configuration without requiring Docker daemon.

    Verifies dual services (api, web), internal network, persistent volumes, and AMRS_API_INTERNAL_URL.
    """
    compose_path = REPO_ROOT / "docker-compose.yml"
    assert compose_path.exists(), "docker-compose.yml must exist at repository root"

    content = compose_path.read_text(encoding="utf-8")

    # (1) Must define services 'api' and 'web'
    assert "api:" in content, "docker-compose.yml must define 'api' service"
    assert "web:" in content, "docker-compose.yml must define 'web' service"

    # (2) Web service must set AMRS_API_INTERNAL_URL to internal API service
    assert "AMRS_API_INTERNAL_URL=http://api:8000" in content, (
        "web service must set AMRS_API_INTERNAL_URL=http://api:8000"
    )

    # (3) API service must mount persistent artifacts volume
    assert "amrs_artifacts:/app/artifacts" in content, (
        "api service must mount amrs_artifacts volume"
    )

    # (4) Healthcheck on /api/v1/health
    assert "/api/v1/health" in content, (
        "docker-compose.yml must configure healthcheck on /api/v1/health"
    )

    # (5) Web service publishes port 3000, API only exposes 8000
    assert '"3000:3000"' in content, "web service must publish port 3000 to the host"
    assert (
        'expose:\n      - "8000"' in content
        or "expose:\n      - '8000'" in content
        or 'expose:\n      - "8000"' in content
    ), "api service must expose port 8000 only to internal network"


def test_dockerignore_integrity() -> None:
    """Static validation of .dockerignore to ensure sensitive files and caches are excluded."""
    dockerignore_path = REPO_ROOT / ".dockerignore"
    assert dockerignore_path.exists(), ".dockerignore must exist at repository root"

    content = dockerignore_path.read_text(encoding="utf-8")
    assert ".git" in content, ".dockerignore must ignore .git"
    assert "__pycache__" in content, ".dockerignore must ignore __pycache__"
    assert "*.pt" in content, ".dockerignore must ignore *.pt weights"
    assert "artifacts/*" in content, ".dockerignore must ignore artifacts/*"
    assert "node_modules" in content, ".dockerignore must ignore node_modules"
