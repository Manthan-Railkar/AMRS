# AMRS Operational Runbook & Deployment Guide (BE-6)

This document provides step-by-step instructions for running the Adaptive Model Recovery System across local development, Docker containers, and cloud GPU environments (Colab/Kaggle).

---

## 1. Architecture & Network Boundary

```
[Browser] 
   │
   ▼ (Public Port 3000)
[Next.js Web Dashboard] (apps/web)
   │
   │ (Internal Same-Origin Proxy / Network Call)
   ▼ (Private Port 8000)
[FastAPI Backend Engine] (src/amrs)
   │
   ├── SQLite Database (`artifacts/amrs.db`)
   ├── Artifact Sandbox (`artifacts/<run_id>/`)
   └── Upload Storage (`uploads/<upload_id>/`)
```

> [!IMPORTANT]
> **Network Boundary Rule**: The FastAPI service on port 8000 is strictly **private**. Only the Next.js service on port 3000 may be exposed publicly through internet tunnels or reverse proxies.

---

## 2. Local Startup (Development)

### Prerequisites
- Python >= 3.11 with `pip`
- Node.js >= 18 with `npm`

### Step 1: Backend Setup
```bash
# Clone and navigate to workspace
git clone https://github.com/manthanrailkar/AMRS.git
cd AMRS

# Install Python package in editable mode
pip install -e .

# Launch FastAPI service on internal localhost:8000
uvicorn amrs.api.main:app --host 127.0.0.1 --port 8000 --reload
```
Verify backend health:
```bash
curl http://127.0.0.1:8000/api/v1/health
# Response: {"status":"healthy","version":"0.1.0","active_run_id":null,"database":"ok"}
```

### Step 2: Frontend Setup
In a separate terminal:
```bash
cd apps/web
npm install

# Run Next.js development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. Docker Startup (Production-Style Stack)

A complete production-style setup with service isolation, volume persistence, and automatic health checking:

```bash
# Build and start all services in detached mode
docker compose up --build -d

# View service status and health checks
docker compose ps

# Follow logs
docker compose logs -f
```

To stop the services:
```bash
docker compose down
```

---

## 4. Google Colab & Kaggle Startup (GPU Acceleration)

For remote GPU acceleration on Google Colab:
1. Open [`scripts/colab_bootstrap.ipynb`](../scripts/colab_bootstrap.ipynb) in Google Colab.
2. Select runtime: **Runtime → Change runtime type → T4 GPU**.
3. Run all cells sequentially.
4. The notebook executes:
   - GPU verification (`torch.cuda.is_available()`)
   - `pip install -e .`
   - Scenario zoo build (`amrs scenarios build --all --profile tiny --device cuda`)
   - Private FastAPI startup on `127.0.0.1:8000`
   - Next.js build and start on `127.0.0.1:3000`
   - Cloudflared tunnel attached **only** to port 3000.
5. Access the printed Cloudflare URL in your browser.

> [!WARNING]
> Never attach Cloudflared or Localtunnel to port 8000. All browser requests must flow through Next.js.

---

## 5. Environment Variables Reference

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `AMRS_API_INTERNAL_URL` | `http://127.0.0.1:8000` | Server-side URL used by Next.js proxy to route `/api/v1/*` requests to FastAPI. |
| `AMRS_ALLOW_UPLOAD` | `0` | Set to `1` to enable multipart model checkpoint uploads (`POST /api/v1/models/upload`). |
| `AMRS_MAX_UPLOAD_BYTES` | `52428800` (50 MB) | Maximum permitted size for model uploads in bytes (max 200 MB). |
| `AMRS_DB_PATH` | `:memory:` (or `artifacts/amrs.db`) | SQLite database file location. |
| `AMRS_ARTIFACTS_ROOT` | `artifacts` | Root directory for isolated per-run artifacts and reports. |
| `AMRS_UPLOADS_ROOT` | `uploads` | Isolated storage directory for uploaded model state dicts. |

---

## 6. Health Checks & Monitoring

AMRS exposes two standardized health check endpoints:
- `GET /health`: Fast probe for orchestrators and container engines (returns 200 OK).
- `GET /api/v1/health`: Detailed status report including schema version, database connectivity, and active recovery worker status.

```bash
curl -s http://127.0.0.1:8000/api/v1/health | jq .
```
Expected output:
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "active_run_id": null,
  "database": "ok"
}
```

---

## 7. Data & Artifact Storage Directory Structure

```
artifacts/
├── amrs.db                               # Persistent SQLite state database
├── <run_id_uuid>/                        # Strictly isolated directory per recovery run
│   ├── original.pt                       # Immutable original model checkpoint
│   ├── accepted_model.pt                 # Accepted repaired model (or original on rollback)
│   ├── report.json                       # Machine-readable evaluation & audit report
│   └── report.md                         # Human-readable markdown decision summary
└── scenarios/                            # Generated scenario zoo assets
    └── <scenario_id>/seed<seed>/
        ├── final.pt                      # Trained checkpoint with symptom
        ├── meta.json                     # Ground truth label and metadata
        └── history.json                  # Training metric loss/accuracy curves

uploads/
└── <upload_id_uuid>/                     # Isolated uploaded model directory
    ├── model.pt                          # Validated state_dict (weights_only=True)
    └── meta.json                         # Upload metadata (sha256, arch, size)
```

---

## 8. Recovery from Interrupted Jobs & Process Crashes

When the AMRS service restarts after an unexpected crash, SIGKILL, or power loss:
1. `JobCoordinator` executes `recover_interrupted_runs()` during startup before accepting new requests.
2. Any runs left in active states (`queued`, `running`, `cancel_requested`) are automatically transitioned to `failed`.
3. An audit error message is recorded: `"Run interrupted by server restart or process crash"`.
4. In-memory locks (`_active_run_id`) are reset to `None`, allowing subsequent runs to be scheduled immediately without deadlock.
5. Original model weights in `artifacts/<run_id>/original.pt` remain completely untouched.

