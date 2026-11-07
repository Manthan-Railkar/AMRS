# AMRS GPU Runbook: Google Colab & Kaggle Execution (INF-2.2 / BE-6)

This runbook provides complete operational guidelines for executing scenario builds, model diagnoses, recovery runs, and interactive demonstrations of AMRS (Adaptive Model Recovery System) on free remote GPU accelerators (Google Colab and Kaggle Notebooks).

---

## 1. Google Colab Environment Setup

### 1.1 Hardware Accelerator Configuration
1. Open [`scripts/colab_bootstrap.ipynb`](../scripts/colab_bootstrap.ipynb) in Google Colab.
2. Select **Runtime → Change runtime type**.
3. Select **Hardware accelerator**: **T4 GPU** (Standard tier) or **A100 / V100 GPU** (Colab Pro/Compute Units).
4. Verify CUDA driver availability:
   ```python
   import torch

   assert torch.cuda.is_available(), "GPU not detected. Check Runtime settings."
   print("Active GPU:", torch.cuda.get_device_name(0))
   ```

### 1.2 Automated Execution Steps
The Colab bootstrap notebook automates the deployment workflow:
1. **Drive Mount**: Mounts Google Drive at `/content/drive` to persist checkpoints and SQLite databases across runtime preemptions.
2. **Repository Checkout & Installation**:
   ```bash
   git clone https://github.com/manthanrailkar/AMRS.git
   cd AMRS
   pip install --upgrade pip
   pip install -e .
   amrs --version
   ```
3. **Scenario Generation**:
   ```bash
   amrs scenarios build --all --device cuda
   ```
4. **FastAPI Private Service**:
   ```bash
   uvicorn amrs.api.main:app --host 127.0.0.1 --port 8000 &
   ```
5. **Next.js Dashboard Production Build**:
   ```bash
   cd apps/web && npm ci && npm run build
   AMRS_API_INTERNAL_URL=http://127.0.0.1:8000 npm run start -- -p 3000 &
   ```
6. **Public Ingress Tunnel**:
   ```bash
   cloudflared tunnel --url http://127.0.0.1:3000
   ```

> [!CAUTION]
> **Strict Port Isolation**: Never expose port `8000` via a public tunnel. Port `8000` is internal only; all external traffic must flow through Next.js on port `3000` to ensure audit logging, rate limiting, and parameter verification.

---

## 2. Kaggle Notebook Environment Setup

### 2.1 Notebook Settings & Quota Management
1. Create a new notebook on [Kaggle](https://www.kaggle.com).
2. Expand the **Notebook Options** drawer on the right sidebar:
   - **Accelerator**: Select **GPU T4 x 2** or **GPU P100**.
   - **Internet**: Toggle to **ON** (Essential for cloning GitHub repositories, fetching PyTorch wheels, and downloading dependencies).
   - **Persistence**: Select **Files only** or **Variables and Files**.
3. **Quota Awareness**: Kaggle provides **30 hours per week** of GPU accelerator quota.
   - Use `--device cuda` when building compute-heavy scenarios or running full recovery suites.
   - For fast sanity checks or test suites, run with CPU fallback to conserve GPU quota:
     ```bash
     pytest -q -m "not gpu and not slow"
     ```

### 2.2 Kaggle Artifact Caching & Downloading
Kaggle ephemeral disk resides in `/kaggle/working`. To persist scenario weights or evaluation databases:
1. Create and output scenarios:
   ```bash
   amrs scenarios build --all --device cuda
   ```
2. Archive the artifact directory before session end:
   ```bash
   zip -r /kaggle/working/amrs_artifacts.zip artifacts/
   ```
3. Kaggle automatically surfaces zipped output files under the "Output" tab for direct download.

---

## 3. "If the Colab / Kaggle Session Dies" — Crash Recovery

Google Colab free sessions disconnect after 12 hours max or 30–90 minutes of inactivity. Kaggle sessions terminate upon inactivity or reaching time limits. Follow these exact steps to recover instantly without re-training:

### 3.1 Immediate Recovery Protocol

If your instance restarted, disconnected, or was preempted:

```bash
# Step 1: Verify new GPU allocation
python3 -c "import torch; assert torch.cuda.is_available(); print('CUDA GPU OK:', torch.cuda.get_device_name(0))"

# Step 2: Navigate to workspace and re-install editable package
cd /content/AMRS || cd /kaggle/working/AMRS
pip install -e .

# Step 3: Restore cached artifacts from Google Drive (Colab)
# If MOUNT_DRIVE was enabled, your artifacts were preserved in Google Drive:
python3 -c "
import shutil, os
drive_cache = '/content/drive/MyDrive/amrs_cache/scenarios'
if os.path.exists(drive_cache):
    shutil.copytree(drive_cache, 'artifacts/scenarios', dirs_exist_ok=True)
    print('Restored scenarios from Google Drive cache successfully.')
else:
    print('No drive cache found. Rebuilding scenarios...')
    os.system('amrs scenarios build --all --device cuda')
"

# Step 4: Resume FastAPI and Next.js services
nohup uvicorn amrs.api.main:app --host 127.0.0.1 --port 8000 > backend.log 2>&1 &
cd apps/web && nohup npm run start -- -p 3000 > frontend.log 2>&1 &
cd ../..

# Step 5: Verify health endpoint
curl -s -f http://127.0.0.1:8000/api/v1/health && echo "Backend operational!"
```

### 3.2 Database Self-Healing & Crash Recovery Invariant
When `JobCoordinator` initializes upon backend startup, it executes automated crash recovery:
- Any recovery run that was `running` or `diagnosing` when the kernel died is automatically marked as `failed` with error `RUN_INTERRUPTED_BY_CRASH`.
- Stale SQLite locks are released.
- The original model checkpoint is guaranteed intact because all recovery strategies operate exclusively on an isolated model copy (`copy.deepcopy(model)`).

---

## 4. Docker Deployment Topology

For local reproducibility or private server deployment, AMRS provides a dual-service Docker Compose topology:

### 4.1 Running with Docker Compose
```bash
# Build images (FastAPI backend + Next.js web dashboard)
docker compose build

# Start services in detached mode
docker compose up -d

# Verify API and Web container status
docker compose ps

# Check backend health
curl http://localhost:8000/api/v1/health

# Access Web Dashboard in browser
open http://localhost:3000
```

### 4.2 Security & Permissions
- Both container images run as **non-root users** (`amrs:10001` for backend, `nextjs:1001` for web).
- FastAPI on port `8000` is exposed **only** within the internal Docker bridge network (`amrs-network`) and is never mapped to the host unless explicitly configured.
- Persistent artifacts and database state reside in Docker named volumes (`amrs_artifacts_volume` and `amrs_uploads_volume`).
