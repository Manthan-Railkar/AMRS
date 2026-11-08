import { apiFetch } from "./client";
import type { Health } from "./types";

export async function getApiHealth(): Promise<Health> {
  const data = await apiFetch<{ status?: string; version?: string; db_status?: string }>("/health");
  const isOnline = data?.status === "healthy" || data?.status === "online" || data?.status === "ok";
  return {
    status: isOnline ? "online" : data?.status === "degraded" ? "degraded" : "offline",
    version: data?.version ?? "0.1.0",
    checked_at: new Date().toISOString(),
  };
}

