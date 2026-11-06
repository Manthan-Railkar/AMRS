"""Benchmark runner and comparative analysis endpoints."""

from fastapi import APIRouter, Depends, status
from amrs.api.deps import get_coordinator
from amrs.api.jobs import JobCoordinator
from amrs.schemas import (
    BenchmarkCreateRequest,
    BenchmarkCreateResponse,
    BenchmarkDetailResponse,
)

router = APIRouter(prefix="/benchmarks", tags=["Benchmarks"])


@router.post(
    "",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=BenchmarkCreateResponse,
    summary="Start benchmark evaluation",
    description="Enqueue comparative matrix execution across scenarios, seeds, and recovery baselines.",
)
async def start_benchmark(
    req: BenchmarkCreateRequest,
    coordinator: JobCoordinator = Depends(get_coordinator),
) -> BenchmarkCreateResponse:
    benchmark_id = coordinator.create_benchmark(req)
    return BenchmarkCreateResponse(benchmark_id=benchmark_id, status="queued")


@router.get(
    "/latest",
    response_model=BenchmarkDetailResponse,
    summary="Get latest benchmark results",
    description="Retrieve results from the most recent completed benchmark evaluation.",
)
async def get_latest_benchmark(
    coordinator: JobCoordinator = Depends(get_coordinator),
) -> BenchmarkDetailResponse:
    return coordinator.get_latest_benchmark()


@router.get(
    "/{benchmark_id}",
    response_model=BenchmarkDetailResponse,
    summary="Get benchmark detail and results",
    description="Retrieve execution status, accuracy, ECE, retention, and compute unit comparisons.",
)
async def get_benchmark_detail(
    benchmark_id: str,
    coordinator: JobCoordinator = Depends(get_coordinator),
) -> BenchmarkDetailResponse:
    return coordinator.get_benchmark(benchmark_id)

