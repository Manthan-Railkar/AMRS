"""Supabase database and storage synchronization service for AMRS.

Leverages:
- Supabase Storage API for model checkpoints, datasets, and run artifacts.
- PostgREST REST API for PostgreSQL tables:
  - model_uploads
  - dataset_uploads
  - recovery_runs
  - recovery_results
  - run_artifacts
"""

from __future__ import annotations

import json
import logging
import mimetypes
import os
import sys
from pathlib import Path
from typing import Any

import requests

logger = logging.getLogger("amrs.supabase")


class SupabaseSync:
    """Synchronizes AMRS files and run metadata with Supabase Storage and database."""

    def __init__(self) -> None:
        self.url = (
            os.getenv("NEXT_PUBLIC_SUPABASE_URL")
            or os.getenv("SUPABASE_URL")
            or "https://yauxyihsdggbvsrdimhs.supabase.co"
        ).rstrip("/")
        self.key = (
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
            or ""
        )
        # Avoid blocking network timeouts during pytest runs
        if "pytest" in sys.modules or os.getenv("PYTEST_CURRENT_TEST"):
            self.enabled = False
        else:
            self.enabled = bool(self.url and self.key)
        self._default_user_id: str | None = None

    @property
    def headers(self) -> dict[str, str]:
        return {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
        }

    def get_first_user_id(self) -> str:
        """Retrieve an existing user ID for database foreign keys, or fallback to zero UUID."""
        if self._default_user_id:
            return self._default_user_id
        try:
            res = requests.get(
                f"{self.url}/rest/v1/profiles?select=id&limit=1",
                headers=self.headers,
                timeout=5.0,
            )
            if res.status_code == 200:
                data = res.json()
                if data and isinstance(data, list) and len(data) > 0:
                    self._default_user_id = data[0]["id"]
                    return self._default_user_id
        except Exception as e:
            logger.debug("Notice getting default profile id: %s", e)
        # Fallback to standard deterministic UUID
        return "e4b082b8-0000-0000-0000-000000000000"

    def upload_storage_file(self, bucket: str, path_in_bucket: str, file_bytes: bytes, content_type: str = "application/octet-stream") -> str | None:
        """Upload a file to Supabase Storage bucket and return its public URL."""
        if not self.enabled:
            return None
        try:
            upload_url = f"{self.url}/storage/v1/object/{bucket}/{path_in_bucket}"
            hdrs = {**self.headers, "Content-Type": content_type}
            res = requests.post(upload_url, headers=hdrs, data=file_bytes, timeout=15.0)
            if res.status_code in (200, 201):
                return f"{self.url}/storage/v1/object/public/{bucket}/{path_in_bucket}"
            elif res.status_code == 400 and "already exists" in res.text:
                # Update/overwrite object
                put_res = requests.put(upload_url, headers=hdrs, data=file_bytes, timeout=15.0)
                if put_res.status_code in (200, 201):
                    return f"{self.url}/storage/v1/object/public/{bucket}/{path_in_bucket}"
        except Exception as exc:
            logger.warning("Supabase storage upload failed for %s/%s: %s", bucket, path_in_bucket, exc)
        return None

    def postgrest_insert(self, table: str, record: dict[str, Any]) -> bool:
        """Insert or upsert a row in a Supabase table."""
        if not self.enabled:
            return False
        try:
            url = f"{self.url}/rest/v1/{table}"
            hdrs = {
                **self.headers,
                "Content-Type": "application/json",
                "Prefer": "return=minimal,resolution=merge-duplicates",
            }
            res = requests.post(url, headers=hdrs, json=record, timeout=5.0)
            return res.status_code in (200, 201, 204)
        except Exception as exc:
            logger.debug("PostgREST insert notice on %s: %s", table, exc)
            return False

    def postgrest_update(self, table: str, filter_param: str, update_data: dict[str, Any]) -> bool:
        """Update rows in a Supabase table matching query filter."""
        if not self.enabled:
            return False
        try:
            url = f"{self.url}/rest/v1/{table}?{filter_param}"
            hdrs = {
                **self.headers,
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            }
            res = requests.patch(url, headers=hdrs, json=update_data, timeout=5.0)
            return res.status_code in (200, 204)
        except Exception as exc:
            logger.debug("PostgREST update notice on %s: %s", table, exc)
            return False

    # ---------------------------------------------------------------------
    # Domain entities sync
    # ---------------------------------------------------------------------

    def sync_model(self, model_id: str, name: str, arch: str, checkpoint_bytes: bytes, sha256: str) -> None:
        """Upload model checkpoint to Supabase Storage and record in model_uploads table."""
        storage_path = f"{model_id}/model.pt"
        pub_url = self.upload_storage_file("models", storage_path, checkpoint_bytes)
        user_id = self.get_first_user_id()

        self.postgrest_insert(
            "model_uploads",
            {
                "id": model_id,
                "user_id": user_id,
                "name": name,
                "architecture": arch,
                "checkpoint_path": pub_url or storage_path,
                "size_bytes": len(checkpoint_bytes),
                "sha256": sha256,
                "validation_status": "valid",
                "metadata": {"source": "upload", "framework": "pytorch"},
            },
        )

    def sync_dataset(self, dataset_id: str, name: str, format_str: str, file_bytes: bytes, num_samples: int, num_classes: int, sha256: str) -> None:
        """Upload dataset file to Supabase Storage and record in dataset_uploads table."""
        storage_path = f"{dataset_id}/data.{format_str}"
        pub_url = self.upload_storage_file("datasets", storage_path, file_bytes)
        user_id = self.get_first_user_id()

        self.postgrest_insert(
            "dataset_uploads",
            {
                "id": dataset_id,
                "user_id": user_id,
                "name": name,
                "file_path": pub_url or storage_path,
                "format": format_str,
                "size_bytes": len(file_bytes),
                "num_samples": num_samples,
                "num_classes": num_classes,
                "validation_status": "valid",
                "metadata": {"sample_count": num_samples, "class_count": num_classes},
            },
        )

    def sync_run_start(self, run_id: str, model_id: str | None, dataset_id: str | None, arch: str, seed: int) -> None:
        """Record newly initiated recovery run in recovery_runs table."""
        user_id = self.get_first_user_id()
        self.postgrest_insert(
            "recovery_runs",
            {
                "id": run_id,
                "user_id": user_id,
                "model_id": model_id,
                "dataset_id": dataset_id,
                "status": "running",
                "progress_stage": "diagnosing",
                "progress_pct": 10.0,
                "execution_params": {"arch": arch, "seed": seed},
            },
        )

    def sync_run_stage(self, run_id: str, stage: str, pct: float) -> None:
        """Update progress stage of recovery run."""
        self.postgrest_update(
            "recovery_runs",
            f"id=eq.{run_id}",
            {"progress_stage": stage, "progress_pct": pct},
        )

    def sync_run_outcome(
        self,
        run_id: str,
        verdict: str,
        diag_label: str,
        confidence: float,
        orig_acc: float,
        rec_acc: float,
        orig_ece: float,
        rec_ece: float,
        compute_units: float,
        duration_s: float,
        applied_strategy: str | None,
        candidate_details: list[dict[str, Any]],
    ) -> None:
        """Update recovery_runs completion and persist recovery_results record."""
        user_id = self.get_first_user_id()
        self.postgrest_update(
            "recovery_runs",
            f"id=eq.{run_id}",
            {
                "status": "succeeded",
                "progress_stage": "completed",
                "progress_pct": 100.0,
            },
        )

        delta_acc = round(rec_acc - orig_acc, 4)
        delta_ece = round(rec_ece - orig_ece, 4)

        self.postgrest_insert(
            "recovery_results",
            {
                "run_id": run_id,
                "user_id": user_id,
                "verdict": verdict,
                "primary_diagnosis": diag_label,
                "confidence": confidence,
                "original_accuracy": orig_acc,
                "recovered_accuracy": rec_acc,
                "delta_accuracy": delta_acc,
                "original_ece": orig_ece,
                "recovered_ece": rec_ece,
                "delta_ece": delta_ece,
                "compute_units": compute_units,
                "duration_s": duration_s,
                "applied_strategy": applied_strategy,
                "candidate_details": candidate_details,
            },
        )

    def sync_artifact(self, run_id: str, name: str, artifact_type: str, file_bytes: bytes) -> None:
        """Upload run artifact to Supabase Storage artifacts bucket and record in run_artifacts."""
        storage_path = f"{run_id}/{name}"
        pub_url = self.upload_storage_file("artifacts", storage_path, file_bytes)
        user_id = self.get_first_user_id()

        self.postgrest_insert(
            "run_artifacts",
            {
                "run_id": run_id,
                "user_id": user_id,
                "name": name,
                "artifact_type": artifact_type,
                "storage_path": pub_url or storage_path,
                "download_url": pub_url,
                "size_bytes": len(file_bytes),
            },
        )


supabase_sync = SupabaseSync()
