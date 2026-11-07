"""Tests asserting required pytest markers are registered in configuration (INF-2.1)."""

import pytest


def test_pytest_markers_registered(pytestconfig: pytest.Config) -> None:
    """Assert that gpu, slow, and e2e markers are registered in pytest configuration."""
    registered_markers = pytestconfig.getini("markers")
    marker_names = [m.split(":")[0].strip() for m in registered_markers]

    assert "gpu" in marker_names, "Marker 'gpu' must be registered in pyproject.toml"
    assert "slow" in marker_names, "Marker 'slow' must be registered in pyproject.toml"
    assert "e2e" in marker_names, "Marker 'e2e' must be registered in pyproject.toml"


@pytest.mark.gpu
def test_gpu_marker_usage() -> None:
    """Verify @pytest.mark.gpu can be applied without warnings."""
    pass


@pytest.mark.slow
def test_slow_marker_usage() -> None:
    """Verify @pytest.mark.slow can be applied without warnings."""
    pass


@pytest.mark.e2e
def test_e2e_marker_usage() -> None:
    """Verify @pytest.mark.e2e can be applied without warnings."""
    pass
