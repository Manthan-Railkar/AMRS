# AMRS GPU Runbook: Google Colab & Kaggle Execution (BE-6 / INF-1.2)

This runbook covers instructions for running AMRS on remote GPU hardware (Google Colab and Kaggle Notebooks).

---

## 1. Google Colab Setup

### Step-by-Step Execution
1. Open [`scripts/colab_bootstrap.ipynb`](../scripts/colab_bootstrap.ipynb) in Google Colab.
2. Select **Runtime → Change runtime type** and choose a GPU accelerator (e.g. **T4 GPU** or **A100**).
3. Run Step 1:
   ```python
   import torch
   assert torch.cuda.is_available(), "GPU not detected. Check Runtime settings."
   print("GPU:", torch.cuda.get_device_name(0))
   ```
4. Run Step 2 through 4 to install dependencies and generate scenarios:
   ```bash
   pip install -e .
   amrs scenarios build --all --profile tiny --device cuda
   ```
5. Launch FastAPI backend on internal private port `8000`:
   ```bash
   uvicorn amrs.api.main:app --host 127.0.0.1 --port 8000 &
   ```
6. Launch Next.js dashboard on port `3000`:
   ```bash
   cd apps/web && npm install && npm run build
   AMRS_API_INTERNAL_URL=http://127.0.0.1:8000 npm run start -- -p 3000 &
   ```
7. Attach Cloudflared tunnel **only** to port `3000`:
   ```bash
   cloudflared tunnel --url http://127.0.0.1:3000
   ```

> [!CAUTION]
> **Port Security**: Never expose port 8000 via a tunnel. Port 8000 is internal; only port 3000 (Next.js) handles incoming browser connections.

---

## 2. Kaggle Notebook Setup

1. Create a new Kaggle Notebook.
2. Under **Notebook Options** (right sidebar):
   - **Accelerator**: GPU T4 x 2 or P100.
   - **Internet**: **Turn ON** (Required for installing packages and cloning repos).
3. Kaggle limits weekly GPU usage to 30 hours per user. Use `--profile tiny` or `--profile cpu` for test validations to preserve GPU quota.
4. If downloading artifacts from Kaggle, zip the `artifacts/` folder:
   ```bash
   zip -r amrs_artifacts.zip artifacts/
   ```

---

## 3. Session Interruption & Crash Recovery

If the remote GPU instance times out or crashes:
1. Re-open the notebook and re-run Step 1 to verify GPU allocation.
2. Re-install package: `pip install -e .`.
3. If using Google Drive persistence, previous artifacts in `/content/drive/MyDrive/amrs_artifacts/` are preserved.
4. When `JobCoordinator` starts, it automatically recovers any unfinished runs in the database to status `failed`, ensuring no stale locks block new experiments.

