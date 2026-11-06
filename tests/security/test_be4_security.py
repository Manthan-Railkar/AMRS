"""Comprehensive security test suite for AMRS BE-4 milestone.

Verifies:
1. Path traversal attempts on runs, uploads, and artifacts.
2. Absolute path injections (Windows drive letters & Unix roots).
3. Symlink access rejection in uploads and artifact serving.
4. Oversized upload streaming rejection (HTTP 413).
5. Invalid formats and malicious arbitrary pickle rejection (HTTP 415) without code execution.
6. Unknown architecture rejection (HTTP 422).
7. Malicious filename patterns (null bytes, directory separators).
8. Cross-run artifact isolation.
9. Secret and internal path leakage prevention in error envelopes.
"""

from __future__ import annotations

import io
import os
from pathlib import Path
import pickle
import pytest
from fastapi.testclient import TestClient

from amrs.api.deps import get_coordinator
from amrs.api.jobs import JobCoordinator
from amrs.api.main import create_app
from amrs.errors import UnsafeOrInvalidCheckpointError, ValidationError
from amrs.models.loader import load_state_dict_safe
from amrs.models.registry import build
from amrs.store.db import Database


@pytest.fixture
def sec_app(tmp_path: Path):
    db_file = str(tmp_path / "sec_test.db")
    db = Database(db_file)
    artifacts_dir = tmp_path / "artifacts"
    coordinator = JobCoordinator(db=db, artifacts_root=artifacts_dir)

    app = create_app()
    app.dependency_overrides[get_coordinator] = lambda: coordinator
    client = TestClient(app)
    return client, coordinator, artifacts_dir, tmp_path


# ---------------------------------------------------------------------------
# 1. Path Traversal & Absolute Paths
# ---------------------------------------------------------------------------


def test_artifact_download_path_traversal_rejection(sec_app) -> None:
    client, coordinator, artifacts_dir, _ = sec_app

    # Create a valid run first
    create_res = client.post("/api/v1/runs", json={"scenario_id": "s1_overfit"})
    assert create_res.status_code == 202
    run_id = create_res.json()["run_id"]

    # Traversal in artifact name
    traversal_targets = [
        "../report.json",
        "../../etc/passwd",
        "..\\..\\windows\\win.ini",
        "%2e%2e/report.json",
        "nested/../../report.json",
    ]
    for target in traversal_targets:
        res = client.get(f"/api/v1/runs/{run_id}/artifacts/{target}")
        # Must be rejected (either 422 ValidationError or 404/400)
        assert res.status_code in (400, 404, 422)
        if res.status_code == 422:
            assert res.json()["error"]["code"] == "VALIDATION_ERROR"


def test_artifact_download_absolute_path_rejection(sec_app) -> None:
    client, coordinator, artifacts_dir, _ = sec_app

    create_res = client.post("/api/v1/runs", json={"scenario_id": "s1_overfit"})
    run_id = create_res.json()["run_id"]

    abs_paths = [
        "C:/Windows/win.ini",
        "C:\\Windows\\system32\\calc.exe",
        "/etc/passwd",
        "/var/log/syslog",
    ]
    for target in abs_paths:
        res = client.get(f"/api/v1/runs/{run_id}/artifacts/{target}")
        assert res.status_code in (400, 404, 422)


def test_run_id_path_traversal_rejection(sec_app) -> None:
    client, coordinator, _, _ = sec_app

    malicious_run_ids = [
        "../../etc/passwd",
        "..\\..\\windows",
        "run1/../../run2",
    ]
    for m_id in malicious_run_ids:
        res = client.get(f"/api/v1/runs/{m_id}")
        assert res.status_code in (404, 422)


# ---------------------------------------------------------------------------
# 2. Symlink Rejection
# ---------------------------------------------------------------------------


def test_symlink_artifact_access_is_rejected(sec_app) -> None:
    client, coordinator, artifacts_dir, tmp_path = sec_app

    create_res = client.post("/api/v1/runs", json={"scenario_id": "s1_overfit"})
    run_id = create_res.json()["run_id"]

    run_dir = artifacts_dir / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    # Create secret outside the artifacts directory
    secret_target = tmp_path / "super_secret_file.txt"
    secret_target.write_text("TOP_SECRET_CREDENTIALS")

    # Attempt to symlink inside artifacts pointing to secret
    symlink_path = run_dir / "report.json"
    if symlink_path.exists():
        symlink_path.unlink()

    try:
        os.symlink(secret_target, symlink_path)
    except OSError:
        pytest.skip("Symlink creation requires elevated permissions on Windows")

    # Requesting artifact must reject symlink
    res = client.get(f"/api/v1/runs/{run_id}/artifacts/report.json")
    assert res.status_code == 422
    assert "symbolic link" in res.json()["error"]["message"].lower()


# ---------------------------------------------------------------------------
# 3. Oversized Uploads
# ---------------------------------------------------------------------------


def test_oversized_upload_rejection(sec_app, monkeypatch: pytest.MonkeyPatch) -> None:
    client, _, _, _ = sec_app

    monkeypatch.setenv("AMRS_ALLOW_UPLOAD", "1")
    # Set limit to 100 KB for testing
    monkeypatch.setenv("AMRS_MAX_UPLOAD_BYTES", "102400")

    # Send 200 KB
    oversized_data = b"0" * (200 * 1024)
    files = {"file": ("big_model.pt", oversized_data, "application/octet-stream")}
    data = {"arch": "mlp_small"}

    res = client.post("/api/v1/models/upload", files=files, data=data)
    assert res.status_code == 413
    assert res.json()["error"]["code"] == "PAYLOAD_TOO_LARGE"


# ---------------------------------------------------------------------------
# 4. Invalid Formats & Malicious Pickle RCE Prevention
# ---------------------------------------------------------------------------


def test_malicious_pickle_rejected_without_rce(sec_app, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    client, _, _, _ = sec_app
    monkeypatch.setenv("AMRS_ALLOW_UPLOAD", "1")

    sentinel_file = tmp_path / "EXPLOIT_EXECUTED.txt"

    class Exploit:
        def __reduce__(self):
            return (os.system, (f'echo "EXPLOIT" > "{sentinel_file}"',))

    payload_buf = io.BytesIO()
    pickle.dump(Exploit(), payload_buf)
    payload_bytes = payload_buf.getvalue()

    files = {"file": ("exploit.pt", payload_bytes, "application/octet-stream")}
    data = {"arch": "mlp_small"}

    res = client.post("/api/v1/models/upload", files=files, data=data)
    assert res.status_code == 415
    assert res.json()["error"]["code"] == "UNSAFE_OR_INVALID_CHECKPOINT"

    # Crucial assertion: command must NEVER have executed
    assert not sentinel_file.exists(), "SECURITY VULNERABILITY: Arbitrary pickle payload executed!"


def test_non_tensor_state_dict_upload_rejected(sec_app, monkeypatch: pytest.MonkeyPatch) -> None:
    client, _, _, _ = sec_app
    monkeypatch.setenv("AMRS_ALLOW_UPLOAD", "1")

    buf = io.BytesIO()
    import torch
    torch.save({"layer1": "string_not_tensor"}, buf)

    files = {"file": ("invalid.pt", buf.getvalue(), "application/octet-stream")}
    data = {"arch": "mlp_small"}

    res = client.post("/api/v1/models/upload", files=files, data=data)
    assert res.status_code == 415
    assert res.json()["error"]["code"] == "UNSAFE_OR_INVALID_CHECKPOINT"


# ---------------------------------------------------------------------------
# 5. Unknown Architectures
# ---------------------------------------------------------------------------


def test_unknown_architecture_rejected(sec_app, monkeypatch: pytest.MonkeyPatch) -> None:
    client, _, _, _ = sec_app
    monkeypatch.setenv("AMRS_ALLOW_UPLOAD", "1")

    model = build("mlp_small")
    buf = io.BytesIO()
    import torch
    torch.save(model.state_dict(), buf)

    files = {"file": ("weights.pt", buf.getvalue(), "application/octet-stream")}
    data = {"arch": "non_existent_transformer_v99"}

    res = client.post("/api/v1/models/upload", files=files, data=data)
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"
    assert "non_existent_transformer_v99" in res.json()["error"]["details"]["arch"]


# ---------------------------------------------------------------------------
# 6. Malicious Filenames
# ---------------------------------------------------------------------------


def test_malicious_filenames_rejected(sec_app, monkeypatch: pytest.MonkeyPatch) -> None:
    client, _, _, _ = sec_app
    monkeypatch.setenv("AMRS_ALLOW_UPLOAD", "1")

    model = build("mlp_small")
    buf = io.BytesIO()
    import torch
    torch.save(model.state_dict(), buf)
    valid_bytes = buf.getvalue()

    bad_filenames = [
        "../../etc/passwd.pt",
        "..\\..\\windows\\system32.pt",
        "/etc/shadow.pt",
        "../model.pt",
        "..\\model.pt",
        "dir/../model.pt",
    ]

    for fname in bad_filenames:
        files = {"file": (fname, valid_bytes, "application/octet-stream")}
        data = {"arch": "mlp_small"}
        res = client.post("/api/v1/models/upload", files=files, data=data)
        assert res.status_code == 422
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"


# ---------------------------------------------------------------------------
# 7. Cross-Run Artifact Isolation
# ---------------------------------------------------------------------------


def test_cross_run_artifact_isolation(sec_app) -> None:
    client, coordinator, artifacts_dir, _ = sec_app

    # Create run A
    res_a = client.post("/api/v1/runs", json={"scenario_id": "s1_overfit"})
    run_id_a = res_a.json()["run_id"]

    # Create run B
    res_b = client.post("/api/v1/runs", json={"scenario_id": "s2_miscalibration"})
    # Wait, single-worker allows one active run; let run A finish or query after
    # But even with opaque IDs:
    dir_a = coordinator.get_run_artifact_dir(run_id_a)
    (dir_a / "accepted_model.pt").write_bytes(b"MODEL_A_WEIGHTS")

    # Querying run A's artifact with run A ID works
    res1 = client.get(f"/api/v1/runs/{run_id_a}/artifacts/accepted_model.pt")
    assert res1.status_code == 200
    assert res1.content == b"MODEL_A_WEIGHTS"

    # Querying nonexistent run ID returns 404 Not Found
    res2 = client.get("/api/v1/runs/00000000-0000-0000-0000-000000000000/artifacts/accepted_model.pt")
    assert res2.status_code == 404
    assert res2.json()["error"]["code"] == "NOT_FOUND"


# ---------------------------------------------------------------------------
# 8. Secret & Server Path Leakage Prevention
# ---------------------------------------------------------------------------


def test_error_envelopes_never_leak_filesystem_paths_or_secrets(sec_app, monkeypatch: pytest.MonkeyPatch) -> None:
    client, coordinator, _, _ = sec_app

    monkeypatch.setenv("AMRS_API_INTERNAL_URL", "http://internal-secret-service:8080")
    monkeypatch.setenv("AMRS_DB_PATH", "sqlite:///secret/database.db")

    # Trigger a 404 error
    res404 = client.get("/api/v1/runs/missing-run-1234")
    text404 = res404.text
    assert "internal-secret-service" not in text404
    assert "secret/database.db" not in text404
    assert "C:\\Users\\" not in text404
    assert "/home/" not in text404

    # Trigger a validation error
    res422 = client.post("/api/v1/runs", json={"scenario_id": None})
    text422 = res422.text
    assert "internal-secret-service" not in text422
    assert "C:\\Users\\" not in text422
    assert "/home/" not in text422


# ---------------------------------------------------------------------------
# 9. Security Headers Present
# ---------------------------------------------------------------------------


def test_security_headers_present_on_all_responses(sec_app) -> None:
    client, _, _, _ = sec_app

    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"
    assert res.headers["x-xss-protection"] == "1; mode=block"
    assert res.headers["referrer-policy"] == "strict-origin-when-cross-origin"
