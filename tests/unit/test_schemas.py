"""Unit tests for Pydantic v2 API and domain schemas."""

import pytest
from pydantic import ValidationError as PydanticValidationError

from amrs.schemas import (
    BenchmarkCreateRequest,
    BenchmarkCreateResponse,
    BenchmarkDetailResponse,
    BenchmarkResultItem,
    CandidateSummary,
    ConfigDefaultsResponse,
    DiagnosisEvidence,
    DiagnosisItem,
    ErrorDetail,
    ErrorEnvelope,
    HealthResponse,
    ModelUploadResponse,
    MonitorEventItem,
    MonitorReplayDetailResponse,
    MonitorReplayRequest,
    MonitorReplayResponse,
    RunCancelResponse,
    RunCreateRequest,
    RunCreateResponse,
    RunDetailResponse,
    RunListResponse,
    RunSummary,
    ScenarioItem,
    ScenarioListResponse,
)


def test_error_schemas() -> None:
    detail = ErrorDetail(
        code="TEST_ERROR",
        message="A test error occurred",
        details={"foo": "bar"},
    )
    envelope = ErrorEnvelope(error=detail)
    data = envelope.model_dump()
    assert data["error"]["code"] == "TEST_ERROR"
    assert data["error"]["message"] == "A test error occurred"
    assert data["error"]["details"] == {"foo": "bar"}


def test_health_response_defaults() -> None:
    res = HealthResponse()
    assert res.status == "healthy"
    assert res.version == "0.1.0"
    assert res.db_status == "ok"


def test_config_defaults_response() -> None:
    cfg = ConfigDefaultsResponse()
    assert cfg.seed == 1234
    assert cfg.device == "auto"
    assert cfg.splits.val_frac == 0.5
    assert cfg.diagnosis.overfitting.gap_min == 0.10
    assert cfg.diagnosis.miscalibration.ece_min == 0.05
    assert cfg.selector.mode == "first_accept"
    assert cfg.selector.max_candidates == 4
    assert cfg.gate.min_retention == 0.95
    assert cfg.gate.bootstrap_samples == 1000
    assert cfg.monitor.ema_beta == 0.6


def test_scenario_schemas() -> None:
    item = ScenarioItem(
        scenario_id="s1_overfit",
        name="Overfit",
        description="Overfit model on small dataset",
        ground_truth_label="overfitting",
        arch="resnet18_cifar",
        artifacts_ready=True,
    )
    list_res = ScenarioListResponse(scenarios=[item], total=1)
    assert len(list_res.scenarios) == 1
    assert list_res.scenarios[0].scenario_id == "s1_overfit"


def test_model_upload_response() -> None:
    res = ModelUploadResponse(
        model_upload_id="upload-123",
        arch="resnet18_cifar",
        filename="model.pt",
        sha256="abc123hash",
        size_bytes=1048576,
    )
    assert res.size_bytes == 1048576


def test_run_create_request_validation() -> None:
    # Valid with scenario_id
    req1 = RunCreateRequest(scenario_id="s1_overfit")
    assert req1.scenario_id == "s1_overfit"

    # Valid with upload_id and arch
    req2 = RunCreateRequest(model_upload_id="up-1", arch="resnet18_cifar")
    assert req2.model_upload_id == "up-1"
    assert req2.arch == "resnet18_cifar"

    # Invalid: neither provided
    with pytest.raises(PydanticValidationError) as exc:
        RunCreateRequest()
    assert "Either 'scenario_id' or 'model_upload_id' must be provided" in str(exc.value)

    # Invalid: model_upload_id provided without arch
    with pytest.raises(PydanticValidationError) as exc:
        RunCreateRequest(model_upload_id="up-1")
    assert "'arch' is required" in str(exc.value)


def test_run_detail_response() -> None:
    evidence = DiagnosisEvidence(
        metric_values={"train_acc": 0.98, "val_acc": 0.76},
        threshold_values={"gap_min": 0.10},
        source_split="val",
        explanation="Generalization gap is 0.22 exceeding 0.10 threshold.",
    )
    diagnosis = DiagnosisItem(
        label="overfitting",
        confidence=0.92,
        rank=1,
        evidence=evidence,
    )
    candidate = CandidateSummary(
        id="cand-1",
        run_id="run-1",
        order_idx=1,
        strategy="checkpoint_reversion",
        params={"epoch": 12},
        cost_units=150.0,
        wall_s=5.2,
        primary_metric="accuracy",
        delta_primary=0.045,
        ci_low=0.021,
        ci_high=0.068,
        retention=0.97,
        agreement=0.91,
        gate_decision="ACCEPT",
        gate_reasons=["Met min gain 0.005 and retention 0.95"],
    )
    run = RunDetailResponse(
        id="run-1",
        created_at="2026-11-06T00:00:00Z",
        status="succeeded",
        progress_stage="done",
        progress_pct=100.0,
        scenario_id="s1_overfit",
        arch="resnet18_cifar",
        original_sha256="abc",
        seed=1234,
        verdict="accepted",
        accepted_strategy="checkpoint_reversion",
        diagnoses=[diagnosis],
        candidates=[candidate],
    )
    data = run.model_dump()
    assert data["verdict"] == "accepted"
    assert len(data["diagnoses"]) == 1
    assert data["candidates"][0]["gate_decision"] == "ACCEPT"


def test_monitor_schemas() -> None:
    req = MonitorReplayRequest(scenario_id="s1_overfit", speed_multiplier=2.0)
    assert req.speed_multiplier == 2.0

    res = MonitorReplayResponse(replay_id="rep-1", status="queued")
    assert res.replay_id == "rep-1"

    detail = MonitorReplayDetailResponse(
        replay_id="rep-1",
        scenario_id="s1_overfit",
        status="running",
        events=[MonitorEventItem(epoch=2, kind="overfit_warning", details={})],
        series={"loss": [0.5, 0.4]},
    )
    assert len(detail.events) == 1


def test_benchmark_schemas() -> None:
    req = BenchmarkCreateRequest(
        scenarios=["s1_overfit"],
        seeds=[1234],
        methods=["amrs", "full_retrain"],
    )
    assert len(req.scenarios) == 1
    assert req.methods == ["amrs", "full_retrain"]

    item = BenchmarkResultItem(
        scenario_id="s1_overfit",
        seed=1234,
        method="amrs",
        accuracy=0.89,
        ece=0.03,
        nll=0.32,
        retention=0.96,
        compute_units=1200.0,
        wall_s=38.0,
        accepted=True,
    )
    detail = BenchmarkDetailResponse(
        benchmark_id="bm-1",
        created_at="2026-11-06T00:00:00Z",
        status="succeeded",
        results=[item],
    )
    assert len(detail.results) == 1
    assert detail.results[0].accepted is True

