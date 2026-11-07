import { delay } from "./client";
import { mockDashboardStats, mockUploadedModels } from "@/lib/mock/dashboard";
import type { DashboardStats, UploadedModel } from "@/lib/schemas/dashboard";

/**
 * Returns aggregate KPI stats and chart data for the dashboard.
 * Simulates 300–800 ms network latency.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  await delay();
  return structuredClone(mockDashboardStats);
}

/**
 * Returns the 8 most-recently uploaded models (sorted newest first).
 * Simulates 300–800 ms network latency.
 */
export async function getRecentModels(): Promise<UploadedModel[]> {
  await delay();
  const sorted = [...mockUploadedModels].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
  return structuredClone(sorted.slice(0, 8));
}
