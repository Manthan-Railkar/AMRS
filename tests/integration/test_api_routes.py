"""Integration tests for the AMRS FastAPI endpoints and OpenAPI contract."""

import os
import pytest
from fastapi.testclient import TestClient

from amrs.api.jobs import coordinator
from amrs.api.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_coordinator_state() -> None:
    """Reset coordinator state before each test."""
    coordinator._runs.clear()
    coordinator._active_run_id = None
    coordinator._monitor_replays.clear()
    coordinator._benchmarks.clear()


# ---------------------------------------------------------------------------
# Health & Config Endpoints
# ---------------------------------------------------------------------------

def test_health_endpoints() -> None:
    # 1. Primary path under /api/v1
    res1 = client.get("/api/v1/health")
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "healthy"
    assert data1["version"] == "0.1.0"
    assert data1["db_status"] == "ok"

    # 2. Direct root alias
    res2 = client.get("/health")
    assert res2.status_code == 200
    assert res2.json() == data1


def test_config_defaults() -> None:
    res = client.get("/api/v1/config/defaults")
    assert res.status_code == 200
    cfg = res.json()
    assert cfg["seed"] == 1234
    assert cfg["device"] == "auto"
    assert "diagnosis" in cfg
    assert "selector" in cfg
    assert "strategies" in cfg
    assert "gate" in cfg
    assert "monitor" in cfg


def test_scenarios_catalog() -> None:
    res = client.get("/api/v1/scenarios")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 6
    scenario_ids = [s["scenario_id"] for s in data["scenarios"]]
    assert scenario_ids == [
        "s1_overfit",
        "s2_miscalibration",
        "s3_bn_drift",
        "s4_instability",
        "s5_degraded_head",
        "s6_healthy",
    ]


# ---------------------------------------------------------------------------
# Recovery Runs Endpoints
# ---------------------------------------------------------------------------

def test_create_run_and_lifecycle() -> None:
    # 1. Create run
    create_res = client.post(
        "/api/v1/runs",
        json={"scenario_id": "s1_overfit", "seed": 42},
    )
    assert create_res.status_code == 202
    run_id = create_res.json()["run_id"]
    assert run_id is not None
    assert create_res.json()["status"] == "queued"

    # 2. Concurrency guard: second active run must return 409 CONFLICT
    conflict_res = client.post(
        "/api/v1/runs",
        json={"scenario_id": "s2_miscalibration"},
    )
    assert conflict_res.status_code == 409
    err = conflict_res.json()
    assert err["error"]["code"] == "CONFLICT"
    assert "active_run_id" in err["error"]["details"]

    # 3. Retrieve run details
    detail_res = client.get(f"/api/v1/runs/{run_id}")
    assert detail_res.status_code == 200
    run_data = detail_res.json()
    assert run_data["id"] == run_id
    assert run_data["scenario_id"] == "s1_overfit"
    assert run_data["status"] == "queued"
    assert run_data["seed"] == 42

    # 4. List runs
    list_res = client.get("/api/v1/runs")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] == 1
    assert list_data["runs"][0]["id"] == run_id

    # 5. Cooperative cancellation
    cancel_res = client.post(f"/api/v1/runs/{run_id}/cancel")
    assert cancel_res.status_code == 202
    assert cancel_res.json()["status"] == "cancel_requested"

    # Verify run is now cancelled
    detail_res_after = client.get(f"/api/v1/runs/{run_id}")
    assert detail_res_after.json()["status"] == "cancelled"

    # Cancelling again should return 409 CONFLICT (already finished)
    cancel_res_again = client.post(f"/api/v1/runs/{run_id}/cancel")
    assert cancel_res_again.status_code == 409

    # Now that active run is cancelled, a new run can be created
    new_res = client.post(
        "/api/v1/runs",
        json={"scenario_id": "s3_bn_drift"},
    )
    assert new_res.status_code == 202


def test_run_validation_errors() -> None:
    # Neither scenario_id nor model_upload_id provided
    res1 = client.post("/api/v1/runs", json={})
    assert res1.status_code == 422
    err1 = res1.json()
    assert err1["error"]["code"] == "VALIDATION_ERROR"
    assert "validation_errors" in err1["error"]["details"]

    # model_upload_id provided without arch
    res2 = client.post("/api/v1/runs", json={"model_upload_id": "up-123"})
    assert res2.status_code == 422
    assert res2.json()["error"]["code"] == "VALIDATION_ERROR"


def test_run_not_found() -> None:
    res = client.get("/api/v1/runs/non-existent-id")
    assert res.status_code == 404
    err = res.json()
    assert err["error"]["code"] == "NOT_FOUND"


def test_artifacts_download() -> None:
    create_res = client.post("/api/v1/runs", json={"scenario_id": "s1_overfit"})
    run_id = create_res.json()["run_id"]

    # Allowlisted artifacts
    for name in ["accepted_model.pt", "report.json", "report.md"]:
        res = client.get(f"/api/v1/runs/{run_id}/artifacts/{name}")
        assert res.status_code == 200
        assert f'attachment; filename="{run_id}_{name}"' in res.headers["content-disposition"]

    # Disallowed artifact
    bad_res = client.get(f"/api/v1/runs/{run_id}/artifacts/malicious.sh")
    assert bad_res.status_code == 422
    assert bad_res.json()["error"]["code"] == "VALIDATION_ERROR"


# ---------------------------------------------------------------------------
# Models Upload Endpoints
# ---------------------------------------------------------------------------

def test_model_upload_disabled_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AMRS_ALLOW_UPLOAD", raising=False)
    files = {"file": ("model.pt", b"dummy model bytes", "application/octet-stream")}
    data = {"arch": "resnet18_cifar"}
    res = client.post("/api/v1/models/upload", files=files, data=data)
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN"


def test_model_upload_success_when_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AMRS_ALLOW_UPLOAD", "1")
    content = b"fake pytorch state dict bytes"
    files = {"file": ("weights.pt", content, "application/octet-stream")}
    data = {"arch": "resnet18_cifar"}
    res = client.post("/api/v1/models/upload", files=files, data=data)
    assert res.status_code == 201
    payload = res.json()
    assert payload["arch"] == "resnet18_cifar"
    assert payload["filename"] == "weights.pt"
    assert payload["size_bytes"] == len(content)
    assert "sha256" in payload


def test_model_upload_invalid_arch(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AMRS_ALLOW_UPLOAD", "1")
    files = {"file": ("weights.pt", b"content", "application/octet-stream")}
    data = {"arch": "unsupported_vgg16"}
    res = client.post("/api/v1/models/upload", files=files, data=data)
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


# ---------------------------------------------------------------------------
# Monitor Replay Endpoints
# ---------------------------------------------------------------------------

def test_monitor_replay_flow() -> None:
    # 1. Start replay
    post_res = client.post(
        "/api/v1/monitor/replay",
        json={"scenario_id": "s1_overfit", "speed_multiplier": 1.5},
    )
    assert post_res.status_code == 202
    replay_id = post_res.json()["replay_id"]

    # 2. Get replay detail
    get_res = client.get(f"/api/v1/monitor/replay/{replay_id}")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["replay_id"] == replay_id
    assert "train_loss" in data["series"]
    assert len(data["events"]) > 0

    # 3. Not found
    nf_res = client.get("/api/v1/monitor/replay/unknown-id")
    assert nf_res.status_code == 404
    assert nf_res.json()["error"]["code"] == "NOT_FOUND"


# ---------------------------------------------------------------------------
# Benchmarks Endpoints
# ---------------------------------------------------------------------------

def test_benchmarks_flow() -> None:
    # 1. Start benchmark
    post_res = client.post(
        "/api/v1/benchmarks",
        json={
            "scenarios": ["s1_overfit", "s2_miscalibration"],
            "seeds": [1234],
            "methods": ["amrs", "full_retrain"],
        },
    )
    assert post_res.status_code == 202
    benchmark_id = post_res.json()["benchmark_id"]

    # 2. Get benchmark detail
    get_res = client.get(f"/api/v1/benchmarks/{benchmark_id}")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["benchmark_id"] == benchmark_id
    assert len(data["results"]) == 4  # 2 scenarios * 1 seed * 2 methods

    # 3. Get latest benchmark
    latest_res = client.get("/api/v1/benchmarks/latest")
    assert latest_res.status_code == 200
    assert latest_res.json()["benchmark_id"] == benchmark_id

    # 4. Unknown benchmark
    nf_res = client.get("/api/v1/benchmarks/unknown-bm")
    assert nf_res.status_code == 404
    assert nf_res.json()["error"]["code"] == "NOT_FOUND"


# ---------------------------------------------------------------------------
# OpenAPI Schema Verification
# ---------------------------------------------------------------------------

def test_openapi_schema_contains_all_canonical_routes() -> None:
    openapi = app.openapi()
    assert openapi["info"]["title"] == "AMRS API"
    assert openapi["info"]["version"] == "0.1.0"

    paths = openapi["paths"]
    expected_routes = [
        "/api/v1/health",
        "/api/v1/config/defaults",
        "/api/v1/scenarios",
        "/api/v1/runs",
        "/api/v1/runs/{run_id}",
        "/api/v1/runs/{run_id}/cancel",
        "/api/v1/runs/{run_id}/artifacts/{name}",
        "/api/v1/models/upload",
        "/api/v1/monitor/replay",
        "/api/v1/monitor/replay/{replay_id}",
        "/api/v1/benchmarks",
        "/api/v1/benchmarks/latest",
        "/api/v1/benchmarks/{benchmark_id}",
    ]

    for route in expected_routes:
        assert route in paths, f"Route '{route}' missing from OpenAPI paths"

