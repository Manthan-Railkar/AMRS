"""FastAPI dependency injection utilities."""

from collections.abc import Generator
from amrs.api.jobs import JobCoordinator, get_job_coordinator


def get_coordinator() -> JobCoordinator:
    """Provide the global job coordinator instance."""
    return get_job_coordinator()

