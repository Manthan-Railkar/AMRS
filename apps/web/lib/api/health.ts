import { apiFetch } from "./client";
import type { Health } from "./types";

export async function getApiHealth(): Promise<Health> {
  return apiFetch<Health>("/health");
}

