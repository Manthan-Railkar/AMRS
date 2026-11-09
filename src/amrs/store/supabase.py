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

import datetime
import logging
import os
import sys
import uuid
from pathlib import Path
from typing import Any

import requests

logger = logging.getLogger("amrs.supabase")


def _load_env_files() -> None:
    """Ensure environment variables from .env.local and .env are loaded."""
    for env_file in (".env.local", ".env"):
        env_path = Path(os.getcwd()) / env_file
        if env_path.exists():
            try:
                for line in env_path.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k, v = k.strip(), v.strip()
                        if k and k not in os.environ:
                            os.environ[k] = v
            except Exception:
                pass


_load_env_files()


def _to_uuid_str(val: Any) -> str | None:
    """Safely convert any ID or string to a valid RFC 4122 UUID string."""
    if not val:
        return None
    val_str = str(val).strip()
    try:
        return str(uuid.UUID(val_str))
    except (ValueError, TypeError, AttributeError):
        # Deterministically convert custom strings into standard UUIDs
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, val_str))


class SupabaseSync:
    """Synchronizes AMRS files and run metadata with Supabase Storage and database."""

    def __init__(self) -> None:
        _load_env_files()
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
        # Avoid blocking network timeouts during pytest runs unless explicitly desired
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

    def check_exists(self, table: str, record_id: str) -> bool:
        """Verify whether a record exists in a Supabase table."""
        if not self.enabled:
            return False
        clean_id = _to_uuid_str(record_id)
        if not clean_id:
            return False
        try:
            url = f"{self.url}/rest/v1/{table}?id=eq.{clean_id}&select=id"
            res = requests.get(url, headers=self.headers, timeout=4.0)
            if res.status_code == 200:
                data = res.json()
                return isinstance(data, list) and len(data) > 0
        except Exception as exc:
            logger.debug("Check exists error on %s/%s: %s", table, record_id, exc)
        return False

    def get_run_user_id(self, run_id: str) -> str | None:
        """Fetch the owner user_id of a recovery run from Supabase."""
        if not self.enabled:
            return None
        clean_id = _to_uuid_str(run_id)
        if not clean_id:
            return None
        try:
            url = f"{self.url}/rest/v1/recovery_runs?id=eq.{clean_id}&select=user_id"
            res = requests.get(url, headers=self.headers, timeout=4.0)
            if res.status_code == 200:
                data = res.json()
                if isinstance(data, list) and len(data) > 0:
                    return data[0].get("user_id")
        except Exception:
            pass
        return None

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

    def ensure_bucket(self, bucket: str, public: bool = True) -> bool:
        """Ensure a storage bucket exists in Supabase, creating it if needed."""
        if not self.enabled:
            return False
        try:
            url = f"{self.url}/storage/v1/bucket"
            res = requests.post(
                url,
                headers=self.headers,
                json={"id": bucket, "name": bucket, "public": public},
                timeout=5.0,
            )
            return res.status_code in (200, 201, 400, 409)
        except Exception as exc:
            logger.debug("Ensure bucket failed for %s: %s", bucket, exc)
            return False

    def upload_storage_file(
        self,
        bucket: str,
        path_in_bucket: str,
        file_bytes: bytes,
        content_type: str = "application/octet-stream",
    ) -> str | None:
        """Upload a file to Supabase Storage bucket and return its public URL."""
        if not self.enabled:
            return None
        try:
            upload_url = f"{self.url}/storage/v1/object/{bucket}/{path_in_bucket}"
            hdrs = {**self.headers, "Content-Type": content_type}
            res = requests.post(upload_url, headers=hdrs, data=file_bytes, timeout=30.0)
            if res.status_code in (200, 201):
                return f"{self.url}/storage/v1/object/public/{bucket}/{path_in_bucket}"
            elif res.status_code == 404:
                # Bucket may not exist yet, attempt auto-creation and retry
                self.ensure_bucket(bucket)
                retry_res = requests.post(upload_url, headers=hdrs, data=file_bytes, timeout=30.0)
                if retry_res.status_code in (200, 201):
                    return f"{self.url}/storage/v1/object/public/{bucket}/{path_in_bucket}"
            elif res.status_code == 400 and "already exists" in res.text:
                # Update/overwrite object
                put_res = requests.put(upload_url, headers=hdrs, data=file_bytes, timeout=30.0)
                if put_res.status_code in (200, 201):
                    return f"{self.url}/storage/v1/object/public/{bucket}/{path_in_bucket}"
        except Exception as exc:
            logger.warning(
                "Supabase storage upload failed for %s/%s: %s", bucket, path_in_bucket, exc
            )
        return None

    def download_storage_file(self, bucket: str, path_in_bucket: str) -> bytes | None:
        """Download raw file bytes from Supabase Storage bucket."""
        if not self.enabled:
            return None
        endpoints = [
            f"{self.url}/storage/v1/object/authenticated/{bucket}/{path_in_bucket}",
            f"{self.url}/storage/v1/object/{bucket}/{path_in_bucket}",
            f"{self.url}/storage/v1/object/public/{bucket}/{path_in_bucket}",
        ]
        for ep in endpoints:
            try:
                res = requests.get(ep, headers=self.headers, timeout=45.0)
                if res.status_code == 200 and res.content:
                    return res.content
            except Exception as exc:
                logger.debug("Download from %s failed: %s", ep, exc)
        return None

    def download_model(self, model_id: str, dest_path: Path) -> bool:
        """Retrieve model weights from Supabase Storage and cache locally."""
        clean_id = _to_uuid_str(model_id) or model_id
        for candidate_key in [f"{clean_id}/model.pt", f"{model_id}/model.pt"]:
            data = self.download_storage_file("models", candidate_key)
            if data:
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                dest_path.write_bytes(data)
                return True
        return False

    def download_dataset(self, dataset_id: str, dest_dir: Path) -> Path | None:
        """Retrieve dataset file from Supabase Storage and cache locally."""
        clean_id = _to_uuid_str(dataset_id) or dataset_id
        for ext in [".npz", ".pt", ".pth", ".csv"]:
            for candidate_key in [f"{clean_id}/dataset{ext}", f"{clean_id}/data{ext}", f"{dataset_id}/data{ext}"]:
                data = self.download_storage_file("datasets", candidate_key)
                if data:
                    dest_dir.mkdir(parents=True, exist_ok=True)
                    out_path = dest_dir / f"dataset{ext}"
                    out_path.write_bytes(data)
                    return out_path
        return None

    # ---------------------------------------------------------------------
    # PostgREST database operations
    # ---------------------------------------------------------------------

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
            if res.status_code in (200, 201, 204):
                return True
            logger.warning(
                "PostgREST insert to %s failed [%d]: %s",
                table,
                res.status_code,
                res.text,
            )
            return False
        except Exception as exc:
            logger.warning("PostgREST insert exception on %s: %s", table, exc)
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
            if res.status_code in (200, 204):
                return True
            logger.warning(
                "PostgREST update to %s with filter %s failed [%d]: %s",
                table,
                filter_param,
                res.status_code,
                res.text,
            )
            return False
        except Exception as exc:
            logger.warning("PostgREST update exception on %s: %s", table, exc)
            return False

    # ---------------------------------------------------------------------
    # Domain entities sync
    # ---------------------------------------------------------------------

    def sync_model(
        self,
        model_id: str,
        name: str,
        arch: str,
        checkpoint_bytes: bytes,
        sha256: str,
        user_id: str | None = None,
    ) -> None:
        """Upload model checkpoint to Supabase Storage and record in model_uploads table."""
        clean_model_id = _to_uuid_str(model_id) or model_id
        storage_path = f"{clean_model_id}/model.pt"
        pub_url = self.upload_storage_file("models", storage_path, checkpoint_bytes)
        effective_user_id = _to_uuid_str(user_id) or self.get_first_user_id()

        self.postgrest_insert(
            "model_uploads",
            {
                "id": clean_model_id,
                "user_id": effective_user_id,
                "name": name,
                "architecture": arch,
                "checkpoint_path": pub_url or storage_path,
                "size_bytes": len(checkpoint_bytes),
                "sha256": sha256,
                "validation_status": "valid",
                "metadata": {"source": "upload", "framework": "pytorch"},
            },
        )

    def sync_dataset(
        self,
        dataset_id: str,
        name: str,
        format_str: str,
        file_bytes: bytes,
        num_samples: int,
        num_classes: int,
        sha256: str,
        user_id: str | None = None,
    ) -> None:
        """Upload dataset file to Supabase Storage and record in dataset_uploads table."""
        clean_dataset_id = _to_uuid_str(dataset_id) or dataset_id
        storage_path = f"{clean_dataset_id}/data.{format_str}"
        pub_url = self.upload_storage_file("datasets", storage_path, file_bytes)
        effective_user_id = _to_uuid_str(user_id) or self.get_first_user_id()

        self.postgrest_insert(
            "dataset_uploads",
            {
                "id": clean_dataset_id,
                "user_id": effective_user_id,
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

    def sync_run_start(
        self,
        run_id: str,
        model_id: str | None,
        dataset_id: str | None,
        arch: str,
        seed: int,
        user_id: str | None = None,
    ) -> None:
        """Record newly initiated recovery run in recovery_runs table."""
        clean_run_id = _to_uuid_str(run_id) or str(uuid.uuid4())
        effective_user_id = _to_uuid_str(user_id) or self.get_first_user_id()

        # Validate foreign keys to avoid PostgreSQL constraint violation
        valid_model_id: str | None = None
        if model_id:
            m_uuid = _to_uuid_str(model_id)
            if m_uuid and self.check_exists("model_uploads", m_uuid):
                valid_model_id = m_uuid

        valid_dataset_id: str | None = None
        if dataset_id:
            d_uuid = _to_uuid_str(dataset_id)
            if d_uuid and self.check_exists("dataset_uploads", d_uuid):
                valid_dataset_id = d_uuid

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        self.postgrest_insert(
            "recovery_runs",
            {
                "id": clean_run_id,
                "user_id": effective_user_id,
                "model_id": valid_model_id,
                "dataset_id": valid_dataset_id,
                "status": "running",
                "progress_stage": "diagnosing",
                "progress_pct": 10.0,
                "execution_params": {"arch": arch, "seed": seed},
                "started_at": now_iso,
            },
        )

    def sync_run_stage(self, run_id: str, stage: str, pct: float) -> None:
        """Update progress stage of recovery run."""
        clean_run_id = _to_uuid_str(run_id)
        if not clean_run_id:
            return
        self.postgrest_update(
            "recovery_runs",
            f"id=eq.{clean_run_id}",
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
        user_id: str | None = None,
    ) -> None:
        """Update recovery_runs completion and persist recovery_results record."""
        clean_run_id = _to_uuid_str(run_id)
        if not clean_run_id:
            return

        effective_user_id = (
            _to_uuid_str(user_id) or self.get_run_user_id(clean_run_id) or self.get_first_user_id()
        )
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Update run status
        status_val = (
            "succeeded" if verdict in ("accepted", "healthy_no_action", "rolled_back") else "failed"
        )
        self.postgrest_update(
            "recovery_runs",
            f"id=eq.{clean_run_id}",
            {
                "status": status_val,
                "progress_stage": "completed",
                "progress_pct": 100.0,
                "completed_at": now_iso,
            },
        )

        delta_acc = round(rec_acc - orig_acc, 4)
        delta_ece = round(rec_ece - orig_ece, 4)

        # Map verdict to allowed CHECK constraint
        valid_verdict = (
            verdict
            if verdict in ("accepted", "rolled_back", "healthy_no_action", "error")
            else "rolled_back"
        )

        self.postgrest_insert(
            "recovery_results",
            {
                "run_id": clean_run_id,
                "user_id": effective_user_id,
                "verdict": valid_verdict,
                "primary_diagnosis": diag_label or "None",
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
                "candidate_details": candidate_details or [],
            },
        )

    def sync_artifact(
        self,
        run_id: str,
        name: str,
        artifact_type: str,
        file_bytes: bytes,
        user_id: str | None = None,
    ) -> None:
        """Upload run artifact to Supabase Storage artifacts bucket and record in run_artifacts."""
        clean_run_id = _to_uuid_str(run_id)
        if not clean_run_id:
            return
        storage_path = f"{clean_run_id}/{name}"
        pub_url = self.upload_storage_file("artifacts", storage_path, file_bytes)
        effective_user_id = (
            _to_uuid_str(user_id) or self.get_run_user_id(clean_run_id) or self.get_first_user_id()
        )

        # Map artifact_type to CHECK constraint: checkpoint, report, log, chart, metrics, other
        valid_type = (
            artifact_type
            if artifact_type in ("checkpoint", "report", "log", "chart", "metrics")
            else "other"
        )

        self.postgrest_insert(
            "run_artifacts",
            {
                "run_id": clean_run_id,
                "user_id": effective_user_id,
                "name": name,
                "artifact_type": valid_type,
                "storage_path": pub_url or storage_path,
                "download_url": pub_url,
                "size_bytes": len(file_bytes),
            },
        )

    def fetch_history_runs(self, user_id: str | None = None) -> list[dict[str, Any]]:
        """Fetch historical recovery runs from Supabase history view or recovery_runs table."""
        if not self.enabled:
            return []
        try:
            url = f"{self.url}/rest/v1/history"
            params = ["select=*"]
            if user_id:
                clean_user = _to_uuid_str(user_id)
                if clean_user:
                    params.append(f"user_id=eq.{clean_user}")
            params.append("order=created_at.desc")
            query_str = "&".join(params)
            res = requests.get(f"{url}?{query_str}", headers=self.headers, timeout=5.0)
            if res.status_code == 200:
                data = res.json()
                if isinstance(data, list):
                    return data
        except Exception as exc:
            logger.debug("Notice fetching history from Supabase: %s", exc)
        return []


supabase_sync = SupabaseSync()
