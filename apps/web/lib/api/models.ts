import { apiFetch } from "./client";

export interface ModelUploadResponse {
  model_upload_id: string;
  sha256: string;
  filename: string;
  size_bytes: number;
  arch: string;
}

export async function uploadModel(
  file: File,
  arch: string
): Promise<ModelUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("arch", arch);

  return apiFetch<ModelUploadResponse>("/models/upload", {
    method: "POST",
    body: formData,
  });
}

