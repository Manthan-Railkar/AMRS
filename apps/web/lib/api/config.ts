import { apiFetch } from "./client";

export interface ConfigDefaults {
  seed?: number;
  device?: string;
  gate?: Record<string, unknown>;
  diagnosis?: Record<string, unknown>;
  recovery?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function getConfigDefaults(): Promise<ConfigDefaults> {
  return apiFetch<ConfigDefaults>("/config/defaults");
}

