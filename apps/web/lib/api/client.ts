import { ApiError } from "./types";
import { parseBackendError } from "./errors";

export { ApiError };

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  timeoutMs?: number;
}

/**
 * Standard same-origin API client for AMRS backend (Section 4.6.4 of plan.md).
 * Always hits relative /api/v1 path with timeout, error normalization, and credential handling.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { body, timeoutMs = 30000, headers = {}, ...rest } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const normalizedPath = path.startsWith("/api/v1")
    ? path
    : `/api/v1${path.startsWith("/") ? path : `/${path}`}`;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const mergedHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(headers as Record<string, string>),
  };

  try {
    const res = await fetch(normalizedPath, {
      ...rest,
      headers: mergedHeaders,
      credentials: "same-origin",
      signal: options.signal || controller.signal,
      body: isFormData
        ? (body as FormData)
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorData: unknown;
      try {
        errorData = await res.json();
      } catch {
        errorData = await res.text();
      }
      throw parseBackendError(
        res.status,
        errorData,
        `API request returned ${res.status}`
      );
    }

    if (res.status === 204) {
      return undefined as unknown as T;
    }

    return (await res.json()) as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(408, "TIMEOUT", "Request timed out");
    }
    throw new ApiError(
      500,
      "NETWORK_ERROR",
      err instanceof Error ? err.message : "Network error"
    );
  }
}

/**
 * Simulates network latency with a delay between minMs and maxMs (defaults to 300-800ms).
 */
export async function delay(minMs = 300, maxMs = 800): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Checks whether an unknown error is an instance of ApiError.
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Creates a generic ApiError instance.
 */
export function createApiError(
  status: number,
  code: string,
  message: string,
  details?: unknown
): ApiError {
  return new ApiError(status, code, message, details);
}

/**
 * Error helper for 404 Not Found.
 */
export function notFoundError(entity: string, id: string): ApiError {
  return new ApiError(404, "not_found", `${entity} '${id}' not found`);
}

/**
 * Error helper for 409 Conflict.
 */
export function conflictError(message = "Operation conflict", code = "conflict"): ApiError {
  return new ApiError(409, code, message);
}

/**
 * Error helper for 400 Bad Request.
 */
export function badRequestError(message: string, details?: unknown): ApiError {
  return new ApiError(400, "bad_request", message, details);
}
