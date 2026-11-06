"""Unit tests for worker isolation, workspace directory sandboxing, and path safety (BE-3)."""

from pathlib import Path
import pytest

from amrs.api.jobs import JobCoordinator
from amrs.errors import ValidationError
from amrs.store.db import Database


@pytest.fixture
def coordinator_with_tmp_dir(tmp_path: Path) -> JobCoordinator:
    db = Database(":memory:")
    coord = JobCoordinator(db=db, artifacts_root=tmp_path / "artifacts")
    return coord


def test_per_run_directory_isolation(coordinator_with_tmp_dir: JobCoordinator) -> None:
    run_a = "run-aaa-111"
    run_b = "run-bbb-222"

    dir_a = coordinator_with_tmp_dir.get_run_artifact_dir(run_a)
    dir_b = coordinator_with_tmp_dir.get_run_artifact_dir(run_b)

    assert dir_a.exists()
    assert dir_b.exists()
    assert dir_a != dir_b
    assert dir_a.name == run_a
    assert dir_b.name == run_b

    # Run A writing a file must not affect Run B
    file_a = dir_a / "accepted_model.pt"
    file_a.write_bytes(b"model_a_weights")

    assert file_a.exists()
    assert not (dir_b / "accepted_model.pt").exists()


def test_path_traversal_prevention(coordinator_with_tmp_dir: JobCoordinator) -> None:
    malicious_ids = [
        "../outside",
        "../../etc/passwd",
        "run/../../secret",
        "run\\..\\secret",
        "/absolute/path",
        "run:with:colons",
        "run with spaces",
    ]

    for bad_id in malicious_ids:
        with pytest.raises(ValidationError) as exc:
            coordinator_with_tmp_dir.get_run_artifact_dir(bad_id)
        assert exc.value.code == "VALIDATION_ERROR"

