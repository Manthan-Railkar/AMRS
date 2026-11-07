"""AMRS benchmark suite package."""

from amrs.benchmark.baselines import run_baseline
from amrs.benchmark.report import generate_benchmark_report
from amrs.benchmark.runner import run_benchmark_suite
from amrs.benchmark.scenarios import SCENARIO_CATALOG, build_scenario

__all__ = [
    "SCENARIO_CATALOG",
    "build_scenario",
    "run_baseline",
    "run_benchmark_suite",
    "generate_benchmark_report",
]
