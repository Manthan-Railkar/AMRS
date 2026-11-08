import io
import json
import os
import time
import numpy as np
import torch
from fastapi.testclient import TestClient
from amrs.api.main import app

client = TestClient(app)

print("=== 1. TEST HEALTH ENDPOINT ===")
health_res = client.get("/api/v1/health")
print("Health status:", health_res.status_code, health_res.json())
assert health_res.status_code == 200

print("\n=== 2. TEST EMPTY DATABASE STATE ===")
runs_res = client.get("/api/v1/runs")
print("Runs list:", runs_res.status_code, runs_res.json())
assert runs_res.status_code == 200

print("\n=== 3. TEST DATASET UPLOAD VALIDATION & REJECTION ===")
# Rejection of invalid extension
bad_file = io.BytesIO(b"malicious script")
res_bad = client.post(
    "/api/v1/datasets/upload",
    files={"file": ("bad.exe", bad_file, "application/octet-stream")},
)
print("Reject invalid dataset format:", res_bad.status_code, res_bad.json()["error"]["code"])
assert res_bad.status_code == 422

# Valid NPZ dataset upload
x = np.random.randn(200, 3, 32, 32).astype(np.float32)
y = np.random.randint(0, 10, size=(200,)).astype(np.int64)
npz_buf = io.BytesIO()
np.savez(npz_buf, x=x, y=y)
npz_buf.seek(0)

res_ds = client.post(
    "/api/v1/datasets/upload",
    files={"file": ("cifar_sample.npz", npz_buf, "application/octet-stream")},
    data={"dataset_name": "CIFAR-10 Sample Subset"},
)
print("Dataset upload status:", res_ds.status_code)
ds_data = res_ds.json()
print("Dataset uploaded:", ds_data)
assert res_ds.status_code == 201
assert ds_data["num_samples"] == 200
assert ds_data["num_classes"] > 0
dataset_upload_id = ds_data["dataset_upload_id"]

print("\n=== 4. TEST MODEL UPLOAD VALIDATION & REJECTION ===")
os.environ["AMRS_ALLOW_UPLOAD"] = "1"

# Rejection of invalid architecture
bad_model_buf = io.BytesIO(b"dummy")
res_bad_arch = client.post(
    "/api/v1/models/upload",
    files={"file": ("model.pt", bad_model_buf, "application/octet-stream")},
    data={"arch": "nonexistent_arch"},
)
print("Reject invalid arch:", res_bad_arch.status_code, res_bad_arch.json()["error"]["code"])
assert res_bad_arch.status_code == 422

# Rejection of invalid tensor shape / corrupted weights
corrupt_buf = io.BytesIO(b"corrupted weights")
res_corrupt = client.post(
    "/api/v1/models/upload",
    files={"file": ("model.pt", corrupt_buf, "application/octet-stream")},
    data={"arch": "resnet18_cifar"},
)
print("Reject corrupt checkpoint:", res_corrupt.status_code, res_corrupt.json()["error"]["code"])
assert res_corrupt.status_code == 415

# Valid ResNet-18 model checkpoint upload
from amrs.models.registry import build as build_model

model = build_model("resnet18_cifar")
model_buf = io.BytesIO()
torch.save(model.state_dict(), model_buf)
model_buf.seek(0)

res_model = client.post(
    "/api/v1/models/upload",
    files={"file": ("resnet18_weights.pt", model_buf, "application/octet-stream")},
    data={"arch": "resnet18_cifar"},
)
print("Model upload status:", res_model.status_code)
model_data = res_model.json()
print("Model uploaded:", model_data)
assert res_model.status_code == 201
model_upload_id = model_data["model_upload_id"]

print("\n=== 5. TEST AUTOMATED RECOVERY RUN (FIRST ATTEMPT) ===")
res_run1 = client.post(
    "/api/v1/runs",
    json={
        "model_upload_id": model_upload_id,
        "dataset_upload_id": dataset_upload_id,
        "arch": "resnet18_cifar",
        "seed": 42,
    },
)
print("Run 1 created status:", res_run1.status_code, res_run1.json())
assert res_run1.status_code == 202
run1_id = res_run1.json()["run_id"]

# Poll for execution completion
detail = None
for i in range(100):
    time.sleep(0.1)
    detail = client.get(f"/api/v1/runs/{run1_id}").json()
    if detail["status"] in ("succeeded", "failed"):
        print(
            f"Run 1 finished at step {i}: status={detail['status']}, verdict={detail['verdict']}, duration={detail['duration_s']}s"
        )
        break
    if i % 10 == 0:
        print(f"Step {i}: Run 1 status={detail.get('status')}, stage={detail.get('progress_stage')}")

assert detail is not None and detail["status"] == "succeeded"
assert detail["verdict"] in ("accepted", "rolled_back", "healthy_no_action")
print("Run 1 diagnoses:", detail["diagnoses"])
print("Run 1 candidates count:", len(detail["candidates"]))

print("\n=== 6. TEST MULTIPLE RECOVERY ATTEMPTS ON THE SAME MODEL (SECOND ATTEMPT) ===")
res_run2 = client.post(
    "/api/v1/runs",
    json={
        "model_upload_id": model_upload_id,
        "dataset_upload_id": dataset_upload_id,
        "arch": "resnet18_cifar",
        "seed": 1234,
    },
)
print("Run 2 created status:", res_run2.status_code, res_run2.json())
assert res_run2.status_code == 202
run2_id = res_run2.json()["run_id"]

detail2 = None
for i in range(100):
    time.sleep(0.1)
    detail2 = client.get(f"/api/v1/runs/{run2_id}").json()
    if detail2["status"] in ("succeeded", "failed"):
        print(f"Run 2 finished at step {i}: status={detail2['status']}, verdict={detail2['verdict']}")
        break
    if i % 10 == 0:
        print(f"Step {i}: Run 2 status={detail2.get('status')}, stage={detail2.get('progress_stage')}")

print("Run 2 final poll state:", detail2)
assert detail2 is not None and detail2["status"] == "succeeded"
assert run1_id != run2_id
print(f"Both runs on model {model_upload_id} successfully tracked: Run 1={run1_id}, Run 2={run2_id}")

print("\n=== 7. TEST ARTIFACTS GENERATION & DOWNLOAD ===")
for artifact_name in ["accepted_model.pt", "report.json", "report.md"]:
    art_res = client.get(f"/api/v1/runs/{run1_id}/artifacts/{artifact_name}")
    assert art_res.status_code == 200
    print(f"Artifact {artifact_name}: size={len(art_res.content)} bytes, OK")

print("\n=== ALL 7 E2E INTEGRATION TESTS PASSED CLEANLY! ===")
