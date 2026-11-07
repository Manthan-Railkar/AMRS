import { ApiError } from "./types";

export interface BackendErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export function parseBackendError(
  status: number,
  data: unknown,
  fallbackMessage = "API request failed"
): ApiError {
  if (data && typeof data === "object") {
    const envelope = data as BackendErrorEnvelope;
    if (envelope.error) {
      return new ApiError(
        status,
        envelope.error.code || `HTTP_${status}`,
        envelope.error.message || fallbackMessage,
        envelope.error.details
      );
    }
  }
  return new ApiError(status, `HTTP_${status}`, fallbackMessage, data);
}

export { ApiError };

