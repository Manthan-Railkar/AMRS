import { apiFetch } from "./client";
import type { Benchmark, ScenarioId } from "./types";
import { mockBenchmarks } from "@/lib/mock/benchmarks";

export interface BenchmarkCreateRequest {
  scenarios?: ScenarioId[];
  seeds?: number[];
  baselines?: string[];
}

export interface BenchmarkStartResponse {
  benchmark_id: string;
  status: string;
}

export async function startBenchmarkApi(
  req: BenchmarkCreateRequest = {}
): Promise<BenchmarkStartResponse> {
  return apiFetch<BenchmarkStartResponse>("/benchmarks", {
    method: "POST",
    body: req,
  });
}

export async function getLatestBenchmarkApi(): Promise<Benchmark> {
  return apiFetch<Benchmark>("/benchmarks/latest");
}

export async function getBenchmarkApi(benchmarkId: string): Promise<Benchmark> {
  return apiFetch<Benchmark>(`/benchmarks/${benchmarkId}`);
}

