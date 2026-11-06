# AMRS — Adaptive Model Recovery System
## PRD + MVP + Implementation Blueprint

**Revised version:** 1.3 — complete department work breakdown, Next.js integration and release gates

---

## 0. Document Control

| Field | Value |
|---|---|
| Document version | 1.3 |
| Date | 2026-11-05 |
| Project name | **AMRS** (Adaptive Model Recovery System). "AMR" in `Novex.txt` is an alias. |
| Team | Big Dawgs, NOVEX Hackathon 2026 |
| Source files used | `Novex.txt` (problem, solution, components, stack), `Big_Dawgs_-_Novex.pdf` (6 slides: title, idea, technical approach, feasibility, impact, references), and the master prompt |
| Status | Expanded implementation blueprint. Missing ML, BM, QA and DOC workstreams have been authored as implementation proposals; validate assumptions and contracts against the live repository before execution. |

### 0.1 Fields supplied vs inferred

| Field | Value | Source |
|---|---|---|
| Project name | AMRS | PDF slide 1 |
| One-line goal | Diagnose why a trained model underperforms, repair it cheaply, and accept the repair only if it is verified better. Otherwise keep the original. | `Novex.txt` |
| Target users | ML students, ML engineers at small and large teams, MLOps leads | `Novex.txt` ("students to large companies") |
| Deadline | **Inferred: 14 calendar days of build time** | **[ASSUMPTION]** No deadline is given. Section 6 proposes a 14-day schedule; confirm or revise it with the team. |
| Preferred stack | Python 3.11, PyTorch, Torchvision, HF PEFT, scikit-learn, NumPy, Pandas, FastAPI, Pydantic v2, YAML, SQLite, **Next.js App Router + React + TypeScript + Tailwind CSS**, Plotly.js, Matplotlib, pytest, Git/GitHub, Colab/Kaggle | Backend/ML choices from source files; frontend replacement approved by user for this revision |
| Team size and skill | **3 contributors: Manas (frontend), Aayush (backend), Manthan (frontend + backend technical lead)** | Supplied by team for v1.2. Individual skill levels are not assumed. |

### 0.2 Conflicts between files, and how each is resolved

| ID | Conflict | Resolution |
|---|---|---|
| C1 | `Novex.txt` says "AMR" and the PDF says "AMRS". | Use **AMRS** everywhere. "AMR" is kept as an alias in docs. |
| C2 | `Novex.txt` says AMR "guarantees genuine improvement" and the model "never ends up worse". The PDF says "potentially lower recovery compute" and "verify before accepting". An absolute guarantee is impossible with finite holdout data. | Reworded as the **verification guarantee**: no candidate is accepted unless it beats the original on a held-out set under a paired-bootstrap confidence test with no-regression constraints. The claim is statistical and applies to the holdout distribution. Marketing copy uses this wording. |
| C3 | `Novex.txt` lists *checkpoint averaging* and *weight interpolation*. The PDF table lists *checkpoint reversion* or *weight interpolation*. `Novex.txt` also lists LoRA for transformers, while the PDF scopes the MVP to "supported PyTorch classifiers". | MVP builds checkpoint reversion, checkpoint averaging and weight interpolation. **LoRA/PEFT is Post-MVP** (ML-10). |
| C4 | `Novex.txt` has a "rule-based selector that tries methods cheapest first". The PDF has a diagnosis→strategy table. | Combined. The diagnosis selects the **eligible set** (PDF table). The selector orders eligible strategies **by ascending compute cost** and tries them until one passes the gate or the budget is exhausted. |
| C5 | The PDF dashboard lets users "Upload model". Loading arbitrary pickled PyTorch files is a remote-code-execution risk. | Uploads accept only `state_dict` files, loaded with `torch.load(weights_only=True)`, and only for architectures in the **model registry**. Custom architectures are supported only in local CLI mode via an explicit `--model-module` flag. See QA-2. |
| C6 | The PDF says "Prepare train/val/test". `Novex.txt` says "separate held-out dataset" for verification. | Four-way data contract: `train`, `val` (diagnosis and candidate selection), `holdout` (gate only), and optional unlabeled `target` (BatchNorm recalibration). Defined in DM-2. |
| C7 | PDF Key Problem #2 is "Performance drift". No drift detector appears in the solution. | MVP covers **covariate-shift recovery** (BN drift diagnosis and recalibration, temperature scaling). Continuous production drift monitoring is a non-goal (Section 1.6). |
| C8 | PDF references 7–10 (CheckFreq, Hyperband, machine unlearning, checkpointed HPO) map to no listed method. | Treated as background only. Nothing is built from them. References 1–6 are said to support built or planned features in the source material, but the bibliography/reference section was not present in the uploaded file and must be restored and verified. |
| C9 | `Novex.txt` names the "Domain" as AI-Intelligent Systems and the PDF names the "PS Category" as AI and ML. | Cosmetic. Use the PDF wording in submissions. |

### 0.3 Approved technology decision

**The frontend is Next.js + React + TypeScript + Tailwind CSS. Streamlit is not part of the application.** Streamlit references in the original proposal are retained only as source-history context and are superseded by this decision. The browser UI is a separate Next.js application; FastAPI remains the backend and the only service allowed to execute model recovery. The browser communicates with FastAPI through a same-origin `/api` proxy configured by Next.js.

### 0.4 Source-plan completeness note

The source `plan.md` available for this revision ended during DM-4.1. The v1.1 revision added FE and the frontend/backend connection contract. The source still does not provide detailed implementation parts for ML, BM, BE, QA or DOC, and its referenced Sections 6–12 were absent. Version 1.3 adds detailed ML, BM, QA and DOC work breakdowns, agent prompts, acceptance criteria, ownership and integration dependencies. These are implementation proposals authored to close the gaps in the uploaded source, not a reconstruction of missing approved source content. Validate algorithm details, thresholds and API contracts against the actual repository before execution.



### 0.5 Team ownership principles

The project has three contributors. Each work item must have one directly responsible individual (DRI); reviewers do not silently become co-owners. **Manthan is the technical lead and owns the high-risk cross-stack boundary**, including the security-sensitive parts of both frontend and backend. Manas owns the visible frontend product work. Aayush owns the backend recovery/domain implementation that is not explicitly reserved as a security or release-critical Manthan responsibility.

- **Manas — Frontend implementation:** page layouts, design system, reusable UI components, forms, charts, responsive behavior, accessibility and frontend component tests. He must use the API client and schemas agreed with Manthan; he must not create mock business logic or bypass the API boundary.
- **Aayush — Backend and recovery implementation:** diagnosis and recovery algorithms, strategy implementations, benchmark execution, database persistence, ordinary API resource handlers, CLI and backend unit/integration tests. He owns correctness of backend domain behavior and reports contract changes before implementing them.
- **Manthan — Technical lead, security owner and cross-stack integrator:** API contract, Next.js proxy/API client, upload and artifact security, job execution/cancellation boundary, verification gate and holdout integrity, configuration/policy validation, deployment topology, integration/E2E and release sign-off. Manthan also implements the security-sensitive backend/frontend code rather than delegating it.

**Decision rule:** when a task touches untrusted model files, filesystem paths, subprocess/job execution, public network exposure, secrets, holdout data, acceptance decisions or browser-to-API trust boundaries, Manthan is the DRI. Aayush and Manas may contribute tests or adjacent code, but Manthan approves and owns the final implementation. Avoid shared ownership labels such as “Manas/Manthan”; split the task into independently reviewable items instead.

### 0.6 How to use this document

1. Read Sections 1–4 once so the North Star, scope and architecture are shared.
2. Build in the order of **Section 6**. Every Part in Section 5 lists its prerequisites.
3. For each Part, paste its **AGENT PROMPT** into a fresh AI coding-agent session. Each prompt is self-contained.
4. A Part is done only when every acceptance criterion passes, its tests pass in CI, and the agent's report is reviewed by a human.
5. Items tagged **[ASSUMPTION]** are decisions made on the team's behalf. Confirm them before implementation. The uploaded source did not contain its referenced Sections 6–12; this v1.3 adds the missing department work breakdowns and a team execution schedule, while keeping source-derived claims distinct from newly authored implementation proposals.

---

## 1. Project Overview

### 1.1 North Star

> **AMRS turns model recovery from manual trial and error into an automated pipeline that diagnoses why a trained classifier underperforms, repairs the existing weights cheapest-first, and keeps a repair only if it is verified better on held-out data. Otherwise it keeps the original model untouched.**

Every Part in this document traces to this sentence through three verbs: **diagnose**, **repair cheaply**, **verify or roll back**.

### 1.2 Problem
Trained models overfit, generalize poorly, or degrade. Fixes are manual (tweak, rerun, retrain), waste compute, can erase learned knowledge, and offer no evidence that the result is better. Existing tools detect problems or apply one fixed remedy. No widely available tool diagnoses, chooses among remedies, and gates acceptance on verification (`Novex.txt`, "Problem Statement").

### 1.3 Vision
A model-recovery layer that any PyTorch classification workflow can run after training, or during training through a callback. It preserves the original model and accepts a candidate only when the configured held-out verification policy passes; otherwise it rolls back, with an auditable evidence trail.

### 1.4 Personas

| ID | Persona | Context | Primary need | AMRS feature that serves it |
|---|---|---|---|---|
| P1 | **Aarav**, student, 2nd-year CS | Trains CIFAR models on Colab. Overfits, doesn't know why. | A plain-language diagnosis and one-click fix | Diagnosis report with evidence, Run page |
| P2 | **Meera**, ML engineer, 10-person startup | Fine-tuned model degrades on new camera data. Limited GPU budget. | Cheap recovery without a full retrain | BN recalibration, last-layer fine-tune, compute report |
| P3 | **Rohan**, MLOps lead | Must prove a model change is safe before shipping. | Auditable accept/reject decisions | Verification gate, rollback, run history |
| P4 | **Judge / reviewer** | Sees a 5–10 minute demo. | A clear before/after story with honest numbers | Scenario zoo, benchmark page, rollback demo |

### 1.5 Value proposition
- **Replaces manual trial and error** with a rule-based diagnosis and strategy selector.
- **Cheaper than retraining**: strategies are ordered by compute cost.
- **Preserves knowledge**: edits are targeted, L2-SP-anchored, and checked with a retained-knowledge metric.
- **Safe**: the original is never mutated, and every candidate must pass the gate.
- **Transparent**: the dashboard shows before/after metrics, compute and each intervention's effect.

### 1.6 Success metrics (measurable)
Measured on the six-scenario zoo (DM-4) with 3 seeds each (18 runs), using the default acceptance policy.

| ID | Metric | Target |
|---|---|---|
| M1 | **Recovery effectiveness**: failure scenarios (S1–S5) where AMRS accepts a candidate whose primary metric beats the original on holdout (seed-mean) | ≥ 4 of 5 scenarios |
| M2 | **Safety**: harmful acceptances. A harmful acceptance is an accepted candidate whose primary metric is worse than the original by more than the tolerance on a **fresh** evaluation split. | **0 of 18 runs** |
| M3 | **Healthy-control behavior**: S6 runs ending in "no change accepted" or "healthy, no action" | 3 of 3 seeds |
| M4 | **Cost efficiency**: scenarios where AMRS gain-per-compute-unit exceeds full retraining's | ≥ 4 of 5 |
| M5 | **Diagnosis accuracy**: top-1 diagnosis label matches the scenario's ground-truth label | ≥ 15 of 18 runs (≥ 83%) |
| M6 | **Knowledge retention**: mean retained-correct rate of accepted candidates | ≥ 0.95 |
| M7 | **Monitor false triggers**: false recovery triggers on healthy training runs | ≤ 1 across 3 seeds |
| M8 | **Responsiveness**: end-to-end S1 run on a Colab T4, or on CPU with the small-CNN variant | ≤ 10 min on T4, ≤ 15 min on CPU variant |
| M9 | **Engineering quality**: core-package line coverage and CI status | ≥ 80%, CI green on main |
| M10 | **Reproducibility**: same config + seed gives identical accept/reject decisions and primary-metric deltas within ±0.002 | 3 repeated runs |

### 1.7 Non-goals (explicitly out of scope)
- Regression, detection, segmentation, generative and reinforcement-learning models.
- Production drift monitoring, data pipelines and alerting.
- Distributed or multi-GPU training.
- Automated hyperparameter optimization (PDF refs 8 and 10 are background only).
- Machine unlearning (PDF ref 9) and data-influence analysis (PDF ref 5).
- Multi-tenant SaaS, user accounts and billing.
- Guarantees on data outside the holdout distribution.
- Fixing label noise, data leakage or bad data. AMRS reports suspicion only.

---

## 2. Complete Project Detail

### 2.1 Feature list

| ID | Feature | Description |
|---|---|---|
| F1 | Model intake | Accept a PyTorch classifier as a `state_dict` plus an architecture name from the **model registry** (`mlp_small`, `small_cnn`, `resnet18_cifar`). Optional list of earlier checkpoints (history) and an optional training-history JSON. Local CLI mode also accepts `--model-module path.py:factory`. |
| F2 | Data intake and splitting | Accept `train`, `val`, `holdout`, optional `target` (unlabeled). Deterministic stratified splitting when only some are given (rules in DM-2). |
| F3 | Diagnosis engine | Computes train/val accuracy and loss, generalization gap, validation-loss trend (when history exists), ECE, BN statistics divergence, a linear-probe head test and a loss-instability score. Outputs a ranked multi-label `DiagnosisReport` with evidence. |
| F4 | Strategy selector | Maps diagnosis labels to eligible strategies (PDF slide 3 table), filters by prerequisites (checkpoints, unlabeled data, architecture support), orders by cost ascending, enforces a candidate budget. |
| F5 | Recovery strategies | `temperature_scaling`, `bn_recalibration`, `checkpoint_reversion`, `checkpoint_averaging`, `last_layer_finetune`, `selective_finetune_l2sp`, `weight_interpolation`. All operate on a **copy** of the model. |
| F6 | Evaluation engine | Compares original vs candidate on holdout: accuracy, NLL, ECE, retained-knowledge, top-1 agreement, compute cost. Paired bootstrap CIs. |
| F7 | Verification gate | Applies the acceptance policy (YAML). Returns `ACCEPT` or `REJECT` with machine-readable reasons per criterion. |
| F8 | Rollback and artifacts | The original checkpoint is hashed, copied read-only, and never mutated. If no candidate passes, the output model is byte-identical to the input. |
| F9 | Live training monitor | A PyTorch callback tracking smoothed train/val metrics. Detects overfitting and instability with patience and cooldown. Actions: `log`, `early_stop`, `recover` (revert to best snapshot, then run the pipeline). |
| F10 | Benchmark runner | Runs AMRS against early stopping, regularized fine-tuning, full retraining and fixed-strategy baselines across scenarios and seeds. Records accuracy, ECE, retention, compute and wall time. |
| F11 | Run store | SQLite database of runs, diagnoses, candidates, gate decisions, monitor events and benchmark results. |
| F12 | REST API | FastAPI with Pydantic schemas. Job-based runs, polling for progress. |
| F13 | CLI | `amrs diagnose`, `amrs recover`, `amrs monitor-replay`, `amrs benchmark`, `amrs scenarios build`. |
| F14 | Dashboard | Next.js pages: Run Recovery, Results, Benchmarks, Live Monitor, History. Plotly charts. |
| F15 | Scenario zoo | Reproducible generator for six scenarios, S1–S6, with ground-truth labels. |
| F16 | YAML configuration | All thresholds, budgets, seeds and policies live in YAML validated by Pydantic. A run stores its resolved config. |
| F17 | Report export (Should) | Per-run `report.json` and `report.md` with the decision trail. |
| F18 | LoRA/PEFT recovery (Post-MVP) | Adapter-based recovery for HF transformers. |

### 2.2 Scenario zoo (ground truth for tests, demo and metrics)

| ID | Name | How it is created (reproducibly) | Ground-truth label | Expected AMRS behavior |
|---|---|---|---|---|
| S1 | Overfit | `resnet18_cifar` (or `small_cnn` on CPU) trained on a 5,000-image CIFAR-10 subset, no augmentation, 60 epochs, per-epoch checkpoints | `overfitting` | Checkpoint reversion/averaging and/or selective fine-tune + L2-SP accepted |
| S2 | Miscalibrated | Healthy model with its final-layer weights and bias scaled ×2.5 (accuracy unchanged, confidence inflated) | `miscalibration` | Temperature scaling accepted (primary metric ECE) |
| S3 | BN drift | Healthy model evaluated on a shifted target distribution (brightness/contrast shift + Gaussian noise, severity configurable). `val`, `holdout` and unlabeled `target` come from the shifted distribution. | `bn_drift` | BN recalibration accepted |
| S4 | Unstable training | Same architecture trained with an excessive learning rate (SGD lr 0.5, no warmup), checkpoints saved, final weights landing on a loss spike | `instability` | Checkpoint reversion or averaging accepted |
| S5 | Degraded head | Healthy backbone, head fine-tuned for a few epochs on 40%-label-noise data | `head_degradation` | Last-layer fine-tune accepted |
| S6 | Healthy control | Well-regularized model, augmentation and weight decay | `healthy` | Diagnosis = healthy, or every candidate rejected. Output is byte-identical to input. |

**[ASSUMPTION]** Synthetic constructions for S2, S3 and S5 are used because they isolate one failure mode and run in minutes. The CIFAR-10-C dataset is not used, to avoid a large download. The limitation is documented (R-09).

### 2.3 User flows

**Flow A. One-shot recovery (dashboard, primary demo flow)**
1. User opens **Run Recovery** and selects a scenario from the zoo or uploads a `state_dict` and chooses an architecture and dataset.
2. UI shows the resolved config (splits, acceptance policy) and a **Start** button.
3. API creates a run (`202`, `run_id`). UI polls progress: *Loading → Diagnosing → Trying strategy k/N → Verifying → Done*.
4. **Results** page shows the diagnosis (labels, confidence, evidence), a candidates table (strategy, cost, primary-metric delta, retention, gate verdict and reasons), a before/after chart, the final verdict (`ACCEPTED: <strategy>` or `ROLLED BACK: original kept`), and downloads (`accepted_model.pt`, `report.json`).

**Flow B. Live monitoring**
1. User attaches `AMRSCallback` in their training loop (documented snippet), or opens **Live Monitor** and replays a recorded training run (S1 or S4).
2. Monitor tracks smoothed metrics. On trigger it logs an event, optionally stops training or runs recovery on the best snapshot.
3. Next.js dashboard shows the metric curves with trigger markers and the follow-up recovery result.

**Flow C. Benchmark**
1. User selects scenarios, seeds and baselines, then clicks **Run benchmark** (or loads stored results).
2. Page shows a comparison table and charts of accuracy, ECE, compute units and wall time per method, with mean ± std over seeds.

**Flow D. Review history**
User opens **History**, filters by scenario or verdict, opens any past run's Results and downloads its report.

**Flow E. CLI**
`amrs recover --model-module ... --weights w.pt --data ... --config configs/default.yaml` produces the same artifacts as Flow A.

### 2.4 Data model (SQLite)

| Table | Columns |
|---|---|
| `runs` | `id` (UUID PK), `created_at`, `status` (`queued`/`running`/`succeeded`/`failed`/`cancelled`), `scenario_id`, `arch`, `original_sha256`, `config_json`, `seed`, `verdict` (`accepted`/`rolled_back`/`healthy_no_action`/`error`), `accepted_strategy`, `error_message`, `duration_s`, `compute_units_total` |
| `diagnoses` | `run_id` FK, `label`, `confidence`, `evidence_json`, `rank` |
| `candidates` | `id`, `run_id` FK, `order_idx`, `strategy`, `params_json`, `cost_units`, `wall_s`, `val_metrics_json`, `holdout_metrics_json`, `primary_metric`, `delta_primary`, `ci_low`, `ci_high`, `retention`, `agreement`, `gate_decision`, `gate_reasons_json`, `artifact_path` |
| `monitor_events` | `id`, `run_id`, `epoch`, `kind` (`overfit_warning`/`instability_warning`/`trigger`/`action`/`cooldown`), `details_json` |
| `benchmark_runs` | `id`, `created_at`, `config_json`, `status` |
| `benchmark_results` | `id`, `benchmark_id` FK, `scenario_id`, `seed`, `method`, `accuracy`, `ece`, `nll`, `retention`, `compute_units`, `wall_s`, `accepted` (nullable), `notes` |
| `schema_version` | `version`, `applied_at` |

### 2.5 REST API (FastAPI, prefix `/api/v1`)

| Method and path | Purpose | Success | Errors |
|---|---|---|---|
| `GET /health` | Liveness and version | 200 | none |
| `GET /config/defaults` | Default resolved YAML config as JSON | 200 | none |
| `GET /scenarios` | List scenarios and whether artifacts are built | 200 | none |
| `POST /runs` | Body `{scenario_id? , model_upload_id?, arch?, config_overrides?, seed?}`. Creates a run. | 202 `{run_id}` | 422 validation, 409 if a run is already active |
| `GET /runs` | Paginated list with filters `verdict`, `scenario_id` | 200 | 422 |
| `GET /runs/{id}` | Run detail, diagnoses, candidates, progress | 200 | 404 |
| `POST /runs/{id}/cancel` | Cooperative cancel | 202 | 404, 409 if already finished |
| `GET /runs/{id}/artifacts/{name}` | Download `accepted_model.pt` or `report.json` | 200 file | 404, 400 on bad name |
| `POST /models/upload` | Multipart `state_dict`. Disabled unless `AMRS_ALLOW_UPLOAD=1`. | 201 `{model_upload_id}` | 413, 415, 422, 403 |
| `POST /monitor/replay` | Replay a recorded training history through the monitor | 202 `{replay_id}` | 404, 422 |
| `GET /monitor/replay/{id}` | Metric series and events | 200 | 404 |
| `POST /benchmarks` | Start a benchmark `{scenarios, seeds, methods}` | 202 `{benchmark_id}` | 422, 409 |
| `GET /benchmarks/{id}` | Status and results | 200 | 404 |
| `GET /benchmarks/latest` | Latest completed results | 200 | 404 |

Error body (all errors): `{"error": {"code": "STRING_CODE", "message": "human text", "details": {...}}}`.

### 2.6 Business rules

- **BR1 (immutability).** The original model is never modified. Candidates are made on `copy.deepcopy`. The original file's SHA-256 is recorded at intake and re-checked before the final verdict.
- **BR2 (split discipline).** `holdout` is touched only by the gate. Diagnosis, strategy fitting and candidate selection use `train`/`val`/`target`. The holdout evaluation count per run is capped (`gate.max_holdout_evaluations`, default 3).
- **BR3 (multiple-comparison control).** If k candidates reach the gate, each is tested at confidence `1 − 0.05/k` (Bonferroni).
- **BR4 (primary metric).** Chosen by the diagnosis that triggered the strategy: `accuracy` for `overfitting`, `bn_drift`, `instability` and `head_degradation`; `ece` for `miscalibration`.
- **BR5 (acceptance).** ACCEPT iff **all** hold: (a) CI lower bound of the paired Δprimary ≥ 0 **and** point Δprimary ≥ `min_gain`; (b) no secondary metric (accuracy, NLL, ECE) regresses beyond `max_regression`; (c) retained-correct rate ≥ `min_retention`; (d) compute ≤ budget.
- **BR6 (cheapest first).** Eligible strategies run in ascending estimated `cost_units`. The run stops at the first ACCEPT unless `selector.mode = best_of_all`.
- **BR7 (budget).** `selector.max_candidates` (default 4) and `selector.max_compute_ratio_vs_retrain` (default 0.5) bound total effort.
- **BR8 (rollback).** If no candidate is accepted, the artifact `accepted_model.pt` is a byte-identical copy of the input and `verdict = rolled_back`.
- **BR9 (healthy).** If no diagnosis rule fires, the verdict is `healthy_no_action`. No candidates are tried unless `--force`.
- **BR10 (holdout size).** Holdout < `holdout_min_size` (500) emits a warning. Holdout < 200 refuses to run unless `allow_small_holdout: true`.
- **BR11 (reproducibility).** The seed, resolved config, library versions and device are stored per run.
- **BR12 (compute accounting).** `compute_units = fwd_samples + 3 × bwd_samples` (an approximation of the forward:backward cost ratio, reported as a proxy). Wall time and gradient steps are also recorded. Full retraining is measured in the same units.
- **BR13 (monitor).** A trigger requires the condition on **smoothed** (EMA) metrics for `patience` consecutive epochs, outside the `cooldown` window.

### 2.7 Default configuration (`configs/default.yaml`)

```yaml
seed: 1234
device: auto            # auto|cpu|cuda
splits: {val_frac: 0.5, holdout_from_val: true, stratify: true}
diagnosis:
  overfitting:   {gap_min: 0.10, train_acc_min: 0.90, val_loss_rise_epochs: 3}
  miscalibration: {ece_min: 0.05, ece_bins: 15}
  bn_drift:      {divergence_min: 0.5, acc_drop_min: 0.03}
  instability:   {spike_ratio: 2.0, cv_min: 0.35}
  head_degradation: {probe_gain_min: 0.02}
  healthy_if_none: true
selector:
  mode: first_accept          # first_accept|best_of_all
  max_candidates: 4
  max_compute_ratio_vs_retrain: 0.5
  retrain_reference_units: auto
strategies:
  temperature_scaling: {max_iter: 50}
  bn_recalibration: {max_batches: 100, momentum: null}
  checkpoint_reversion: {top_k: 3}
  checkpoint_averaging: {last_k: 5}
  last_layer_finetune: {epochs: 5, lr: 0.01, weight_decay: 5.0e-4}
  selective_finetune_l2sp: {unfreeze_top_n: 2, epochs: 8, lr: 0.003, l2sp_alpha: 0.1, weight_decay: 5.0e-4, augment: true}
  weight_interpolation: {alphas: [0.25, 0.5, 0.75]}
gate:
  holdout_min_size: 500
  allow_small_holdout: false
  max_holdout_evaluations: 3
  family_alpha: 0.05
  bootstrap_samples: 1000
  min_gain: {accuracy: 0.005, ece: 0.01}
  max_regression: {accuracy: 0.005, nll: 0.02, ece: 0.01}
  min_retention: 0.95
monitor:
  ema_beta: 0.6
  patience: 3
  cooldown_epochs: 5
  overfit: {gap_rise_min: 0.03, val_loss_rise: true}
  instability: {spike_ratio: 2.0}
  action: log                 # log|early_stop|recover
```

### 2.8 Diagnosis rules (exact)

| Label | Rule (on `val`, history optional) | Confidence |
|---|---|---|
| `overfitting` | `train_acc ≥ train_acc_min` **and** `train_acc − val_acc ≥ gap_min`. If history exists, `val_loss` has risen for ≥ `val_loss_rise_epochs` of the last epochs while train loss fell. | gap / (gap_min × 2), capped at 1. +0.2 if the history condition holds. |
| `miscalibration` | `ECE(val) ≥ ece_min`, and a fitted temperature T satisfies \|T − 1\| ≥ 0.15 | min(1, ECE / (2 × ece_min)) |
| `bn_drift` | Mean over BN layers of `mean(\|μ_run − μ_new\| / sqrt(σ²_run + ε))` ≥ `divergence_min` (μ_new, σ²_new from `target` or `val` inputs), **and** accuracy on `val` is ≥ `acc_drop_min` below accuracy on `train` | min(1, divergence / (2 × divergence_min)) |
| `instability` | Requires history. `max(loss_t / median(loss_{t−5..t−1})) ≥ spike_ratio` in the last 10 epochs, or CV of detrended loss ≥ `cv_min`. | scaled by ratio |
| `head_degradation` | Frozen penultimate features. Logistic regression fitted on `train` features. `val_acc(probe) − val_acc(model) ≥ probe_gain_min`. | min(1, gain / (2 × probe_gain_min)) |
| `healthy` | No rule above fires. | 1 − max confidence |

Multi-label is allowed. The **primary label** is the highest-confidence label, with ties broken by the order `bn_drift > head_degradation > instability > overfitting > miscalibration`.

### 2.9 Strategy table (diagnosis → eligible strategies, cost order)

| Diagnosis | Eligible strategies (ascending est. cost) | Prerequisites |
|---|---|---|
| `miscalibration` | `temperature_scaling` | none |
| `bn_drift` | `bn_recalibration` → `last_layer_finetune` | target/val inputs; model has BN layers |
| `instability` | `checkpoint_reversion` → `checkpoint_averaging` → `selective_finetune_l2sp` | checkpoints for the first two |
| `overfitting` | `checkpoint_reversion` → `checkpoint_averaging` → `selective_finetune_l2sp` → `weight_interpolation` (original ↔ fine-tuned candidate) | checkpoints for the first two |
| `head_degradation` | `last_layer_finetune` → `selective_finetune_l2sp` | identifiable head |

If a diagnosis lists strategies whose prerequisites are missing, they are skipped and the skip reason is logged and shown in the UI.

### 2.10 UI/UX requirements
- Five Next.js App Router pages (Run Recovery, Results, Benchmarks, Live Monitor, History) with a persistent application shell showing API status and the current run.
- Verdict banner: **green** "ACCEPTED: <strategy>", **amber** "ROLLED BACK: original kept (reasons)", **grey** "Healthy: no action needed", **red** "Error".
- Every number shows its unit. Compute is shown as "compute units" with a tooltip explaining the proxy.
- Every gate decision shows the failed criterion in plain language, for example: "Rejected: retention 0.91 < required 0.95."
- Empty, loading and error states on every page.
- Accessibility: colorblind-safe palette (Plotly "Safe" qualitative colors), verdicts always carry text and icon, charts have text summaries, keyboard-reachable controls, contrast ≥ 4.5:1.

### 2.11 Permissions and access
Single-user local tool. No authentication in the MVP. The API binds to `127.0.0.1` by default. Uploads are disabled by default (`AMRS_ALLOW_UPLOAD`). If exposed beyond localhost, an `AMRS_API_KEY` header check is required (Should, QA-2).

### 2.12 Error states and edge cases

| Situation | Behavior |
|---|---|
| Weights don't match the architecture | `422 MODEL_ARCH_MISMATCH` with the missing and unexpected keys listed (first 20) |
| `state_dict` file is not loadable with `weights_only=True` | `415 UNSAFE_OR_INVALID_CHECKPOINT` |
| Model has no BN layers | `bn_recalibration` is skipped with reason `NO_BN_LAYERS` |
| No checkpoints supplied | Checkpoint strategies skipped with reason `NO_HISTORY` |
| Holdout < 200 samples | Refuse (`HOLDOUT_TOO_SMALL`) unless overridden. 200–499 gives a warning. |
| Class missing from holdout | Warn. Per-class metrics exclude absent classes. |
| NaN/Inf in a candidate's weights or outputs | Candidate auto-rejected (`NON_FINITE`) |
| Candidate evaluation raises | Candidate rejected (`CANDIDATE_ERROR`) with a stack trace in logs. The run continues. |
| Run cancelled | Cooperative cancel at the next strategy boundary. The original is kept. `status = cancelled`. |
| Process crash mid-run | On restart, runs stuck in `running` are marked `failed`. Artifacts are never half-written (write to temp, then atomic rename). |
| GPU OOM | Retry once on halved batch size, otherwise reject the candidate with `OOM`. |
| Two simultaneous runs | One active run at a time (`409`). **[ASSUMPTION]** Single-worker, GPU-bound. |
| Original already healthy, but `--force` | Strategies are tried and the gate will normally reject. This is the negative-control behavior. |
| Uploaded file too large | `413` (limit 200 MB by default) |
| Corrupt or stale SQLite schema | Migrate by `schema_version` or fail with clear instructions |

### 2.13 Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | S1 end-to-end ≤ 10 min on a Colab T4 (≤ 15 min on the CPU small-CNN variant). Diagnosis alone ≤ 60 s on S1. Dashboard pages respond in ≤ 2 s for stored data. |
| Reliability | Atomic artifact writes. Idempotent DB migrations. A failed run never corrupts the original. |
| Security | `weights_only=True` loading. No arbitrary code execution from uploads. Path-traversal-safe artifact serving. Upload size and type limits. Pinned dependencies and a `pip-audit` CI step. |
| Observability | Structured JSON logs with `run_id`. `/health` shows version and DB status. Per-stage timings stored. |
| Accessibility | WCAG 2.1 AA-aligned practices for the Next.js UI (Section 2.10). |
| Compliance and licensing | All dependencies are open source (BSD/MIT/Apache-2.0). CIFAR-10 is used for research and demo with attribution. No personal data is processed. |
| Portability | Python 3.11. Runs on CPU, a single CUDA GPU, Colab and Kaggle. Optional Docker image. |
| Maintainability | Ruff, mypy on core, 80% coverage gate, every strategy behind a common interface. |
| Reproducibility | Seeds, config and versions stored. `torch.use_deterministic_algorithms` where feasible (documented exceptions). |

---

## 3. Scope Split: Full PRD vs MVP

### 3.1 Full product scope (MoSCoW)

| Priority | Items |
|---|---|
| **Must** | F1–F16: model intake (registry + state_dict), data contract and splits, diagnosis engine, selector, six recovery strategies, evaluation engine, verification gate, rollback, live monitor callback, benchmark runner, SQLite store, FastAPI, CLI, Next.js + Tailwind dashboard, scenario zoo, YAML config |
| **Should** | F17 report export, API key option, Docker/docker-compose, hosted demo, Matplotlib static plots for README, Hypothesis property tests |
| **Could** | SAM-based fine-tune strategy (PDF ref 3), per-class fairness checks in the gate, support for torchvision pretrained backbones beyond ResNet-18, a notebook tutorial |
| **Won't (this release)** | LoRA/PEFT for transformers (ML-10 is specified but deferred), non-classification tasks, production drift monitoring, multi-user accounts, distributed training |

### 3.2 MVP scope

The **MVP is a complete, polished slice**: image-classification recovery from diagnosis through verified acceptance or rollback, a live monitor, a benchmark against baselines, and a dashboard.

| Included in MVP | Justification (North Star link) |
|---|---|
| Registry models (`mlp_small`, `small_cnn`, `resnet18_cifar`) + `state_dict` intake | Fixes the supported surface so recovery is reliable. Matches the PDF ("MVP for supported PyTorch classifiers"). |
| Four-way data contract + splitter | Required for verification honesty (BR2). |
| Diagnosis engine (5 labels + healthy) | The "diagnose" verb. |
| 7 strategies | The "repair cheaply" verb. Each maps to a PDF table row. |
| Selector (cheapest-first) | `Novex.txt` core differentiator. |
| Evaluation engine and gate | The "verify" verb, the key innovation. |
| Rollback guarantees (BR1, BR8) | "Never worse" promise. |
| Orchestrator | Glue that makes the pipeline a product. |
| Live monitor callback (log, early-stop, recover) | The "works at every stage" claim. |
| Scenario zoo (S1–S6) | Without ground truth, none of the metrics M1–M10 are measurable. |
| Baselines and benchmark runner (early stopping, regularized FT, full retrain, fixed-strategy) | Proves the cost and quality claims. |
| SQLite store, FastAPI, CLI | Reproducibility, integration, and the stack named in `Novex.txt`. |
| Next.js + Tailwind dashboard (5 pages) | Preserves the proposal's dashboard outcome while implementing the user-approved web stack. |
| Tests, CI, security hardening, docs, demo pack | Production-grade requirement. |

| Excluded from MVP | Justification |
|---|---|
| LoRA/PEFT (ML-10) | Needs a transformer scenario and a different diagnosis surface. Doubles the scope without strengthening the core story (C3). |
| Hosted public deployment | A Docker image plus Colab runbook is enough for a demo. Hosting adds operational risk. |
| Authentication | Single-user local tool. Mitigated by localhost binding and an optional API key. |
| SAM strategy | Doubles backward cost and adds nothing a judge needs. |
| Production drift monitoring | Different product (C7). |
| Report export beyond JSON/Markdown | Dashboard already shows everything. |

### 3.3 Post-MVP roadmap

| Release | Content |
|---|---|
| v1.1 | LoRA/PEFT recovery for HF transformers (ML-10), per-class gate checks, Docker hosted demo |
| v1.2 | Additional torchvision architectures, SAM-based strategy, richer calibration methods (vector/matrix scaling) |
| v1.3 | Production-drift trigger integration, Slack/webhook notifications |
| v2.0 | Non-classification tasks, multi-user server with auth, experiment-tracking integrations (MLflow/W&B) |


---

## 4. System Architecture & Tech Stack

### 4.1 Component diagram

```mermaid
flowchart LR
  subgraph UI[Interface]
    WEB[Next.js + Tailwind Web App]
    CLI[CLI: amrs]
  end
  subgraph API[Backend]
    FA[FastAPI + Pydantic]
    JOBS[Job runner - single worker thread]
    DB[(SQLite)]
  end
  subgraph CORE[AMRS core package]
    LOAD[Model Loader + Registry + Adapter]
    SPLIT[Data Splitter]
    DIAG[Diagnosis Engine]
    SEL[Strategy Selector]
    REC[Recovery Engine - 7 strategies]
    EVAL[Evaluation Engine]
    GATE[Verification Gate]
    ORCH[Orchestrator + Artifact Store]
    MON[Live Monitor Callback]
  end
  subgraph BENCH[Benchmarking]
    ZOO[Scenario Zoo]
    BASE[Baselines]
    RUN[Scenario Runner]
  end
  WEB -->|same-origin /api/v1 via Next.js rewrite proxy| FA
  CLI --> ORCH
  FA --> JOBS --> ORCH
  ORCH --> LOAD --> SPLIT
  ORCH --> DIAG --> SEL --> REC --> EVAL --> GATE
  GATE -->|accept| OUT[Accepted model]
  GATE -->|reject| ORIG[Original checkpoint kept]
  MON -->|trigger| ORCH
  ORCH --> DB
  RUN --> ORCH
  RUN --> BASE
  ZOO --> RUN
  RUN --> DB
  FA --> DB
```

### 4.2 Data flow (one recovery run)

1. **Intake.** The API or CLI receives a model reference and data. The loader builds the registry architecture and loads weights with `weights_only=True`. The SHA-256 is recorded and the original is copied read-only to `artifacts/<run_id>/original.pt`.
2. **Splits.** The splitter produces `train`, `val`, `holdout`, `target`.
3. **Diagnosis.** It evaluates the original on `train` and `val`, runs BN-divergence, probe, calibration and history analyses, and emits a `DiagnosisReport`.
4. **Selection.** The selector builds an ordered list of eligible strategies with skip reasons.
5. **Repair loop.** For each strategy in order: deep-copy the original, apply the strategy using `train`/`val`/`target` only, meter compute, and produce a candidate. The candidate is shortlisted by its `val` metric (not holdout).
6. **Verification.** The evaluation engine scores the original and the candidate on `holdout` (with paired bootstrap). The gate applies BR5 and emits `ACCEPT` or `REJECT` with reasons.
7. **Decision.** On the first ACCEPT (or best-of-all), write `accepted_model.pt`. Otherwise copy the original byte-for-byte to `accepted_model.pt`. Re-verify that the original hash is unchanged.
8. **Persist.** Write DB rows, `report.json` and `report.md`.

### 4.3 Stack choices

| Layer | Choice | Justification | Alternatives rejected |
|---|---|---|---|
| Language | Python 3.11 | Ecosystem, team skill, required by PyTorch tooling | Julia (ecosystem), R |
| Core ML | PyTorch + Torchvision | Named in both input files. Direct weight access for surgery, checkpointing and BN control. | TensorFlow/Keras (weaker per-parameter control), JAX (team skill) |
| Transformer recovery | HF PEFT (LoRA), Post-MVP | `Novex.txt`. Standard for parameter-efficient edits. | Full fine-tune (cost) |
| Metrics and analysis | scikit-learn, NumPy, Pandas | Probe (logistic regression), metrics, tables | Hand-rolled (more bugs) |
| API | FastAPI + Pydantic v2 | Typed schemas, auto OpenAPI, named in `Novex.txt` | Flask (no built-in validation), Django (heavy) |
| Jobs | In-process single worker thread + SQLite status | One active run at a time, no extra infra | Celery/Redis (operational overhead for a single-user tool) |
| Storage | SQLite (stdlib `sqlite3`) | Named in both files. Zero-config, file-based. | Postgres (overkill), JSON files (no querying) |
| Config | YAML + Pydantic validation | Reproducible experiments (`Novex.txt`) | Hydra (learning curve), env vars |
| Frontend | Next.js App Router + React + TypeScript + Tailwind CSS | User-approved frontend decision; typed multi-page application, responsive UI and maintainable component system. | Streamlit is superseded; Gradio is not selected because it offers less control over the product UI. |
| Frontend data fetching | Typed `fetch` client + TanStack Query | Centralized caching, retries, mutation lifecycle and polling for long-running jobs. | Ad-hoc fetch calls in every component (duplicated error and cache logic). |
| Frontend validation | Zod | Runtime validation of API payloads and form inputs at the UI boundary. Backend Pydantic remains authoritative. | TypeScript types alone (compile-time only). |
| Styling | Tailwind CSS | Consistent responsive design tokens and fast implementation. | CSS framework mixing / inline style sprawl. |
| Charts | Plotly.js via `react-plotly.js` (or a compatible React wrapper) | Interactive metrics and benchmark charts, reusing Plotly visual semantics from proposal. | Chart data generated in frontend (not permitted); static-only charts for interactive run review. |
| Quality | pytest, pytest-cov, ruff, mypy, pre-commit | Standard | unittest (verbose) |
| CI/CD | GitHub Actions | Free for public repos | Jenkins (self-hosting) |
| Compute | Colab/Kaggle GPU, local CPU for small variants | Free and named in both files | Paid cloud (cost) |
| Packaging | `pyproject.toml`, `pip`, optional Docker | Simple | Poetry (extra tool) |

### 4.4 Repository structure

```
amrs/
├── pyproject.toml            README.md          Makefile           LICENSE
├── .pre-commit-config.yaml   .gitignore         Dockerfile         docker-compose.yml
├── .github/workflows/ci.yml
├── configs/
│   ├── default.yaml
│   ├── scenarios/s1_overfit.yaml ... s6_healthy.yaml
│   └── acceptance/{strict,default,lenient}.yaml
├── src/amrs/
│   ├── __init__.py   errors.py   config.py   schemas.py   cli.py
│   ├── utils/        seed.py  hashing.py  logging.py  timing.py  fs.py
│   ├── data/         splits.py  loaders.py  shifts.py  synthetic.py
│   ├── models/       adapter.py  registry.py  loader.py  zoo.py
│   ├── metrics/      classification.py  retention.py  compute.py  bootstrap.py
│   ├── diagnosis/    engine.py  rules.py  probes.py
│   ├── recovery/     base.py  temperature.py  bn_recal.py  checkpoints.py
│   │                 last_layer.py  selective_ft.py  l2sp.py  interpolation.py
│   ├── selector/     selector.py
│   ├── evaluation/   evaluator.py  gate.py
│   ├── pipeline/     orchestrator.py  artifacts.py
│   ├── monitor/      callback.py  detectors.py  replay.py
│   ├── store/        db.py  migrations.py  repository.py
│   ├── benchmark/    baselines.py  scenarios.py  runner.py  report.py
│   └── api/          main.py  deps.py  jobs.py  routes/{runs,scenarios,monitor,benchmarks,models}.py
├── apps/web/
│   ├── app/             layout.tsx page.tsx runs/ results/ benchmarks/ monitor/ history/
│   ├── components/      layout/ forms/ charts/ status/ runs/ shared/
│   ├── lib/             api/ query/ schemas/ formatters/
│   ├── hooks/           use-run-status.ts use-api-health.ts
│   ├── styles/          globals.css
│   ├── next.config.ts   package.json   tsconfig.json
│   └── tailwind.config.ts (or Tailwind v4 CSS-first config)
├── scripts/          build_scenarios.py  run_benchmark.py  colab_bootstrap.ipynb
├── tests/            unit/  integration/  e2e/  fixtures/
├── docs/             architecture.md  user_guide.md  model_contract.md  api.md  adr/  demo/
└── artifacts/        (gitignored: runs, scenarios, benchmark outputs)
```

### 4.5 Environments, deployment, CI/CD, cost

| Item | Decision |
|---|---|
| Environments | `dev` (laptop CPU, small-CNN scenarios, synthetic data; Next.js on 3000 and FastAPI on 8000), `gpu` (Colab/Kaggle T4, full CIFAR scenarios), `demo` (Next.js exposed on 3000 through a tunnel; FastAPI remains private behind the Next.js rewrite proxy) |
| Deployment | MVP: install Python package, run FastAPI on 8000 and Next.js on 3000; `docker compose up` runs `api` and `web` services. The browser calls `/api/v1` on the Next.js origin; Next.js proxies to FastAPI. Hosted deployment is Post-MVP. |
| CI (GitHub Actions) | On every push and PR: ruff → mypy (core) → pytest on tiny synthetic fixtures (CPU, ≤ 5 min) → coverage gate 80% → `pip-audit`. Nightly or manual: the "GPU smoke" is run by hand in Colab (documented). |
| CD | Tag `v*` builds the Docker image artifact and attaches built scenario metadata (not weights) to the release |
| Cost | $0 expected: GitHub free tier, Colab/Kaggle free GPU, open-source stack. Budget risk: Colab session limits (R-05). Mitigation: pre-built scenario artifacts cached in Drive and a CPU variant. |


### 4.6 Frontend-to-backend connection contract (authoritative)

This section is mandatory implementation guidance. A frontend that only resembles the dashboard but does not execute the real API workflow is not an accepted deliverable.

#### 4.6.1 Runtime topology and network flow

- Next.js web server: `http://localhost:3000`.
- FastAPI backend: `http://127.0.0.1:8000` in local development; `http://api:8000` from the `web` container in Docker Compose.
- Browser-visible API base: **relative same-origin path `/api/v1`**. Browser code must not hardcode `localhost:8000`.
- `apps/web/next.config.ts` defines a rewrite from `/api/:path*` to `${AMRS_API_INTERNAL_URL}/api/:path*`. `AMRS_API_INTERNAL_URL` is server-only and must not use the `NEXT_PUBLIC_` prefix.
- In local development, set `AMRS_API_INTERNAL_URL=http://127.0.0.1:8000`. In Docker Compose, set it to `http://api:8000`. In Colab, Next.js and FastAPI run on the same VM, so the internal target is `http://127.0.0.1:8000`.
- The tunnel exposes **only port 3000**. FastAPI port 8000 remains private; API traffic reaches it through Next.js. Do not expose a second public API tunnel for the MVP.
- This same-origin proxy removes browser CORS dependency in the normal deployment. FastAPI CORS remains configured narrowly for direct local API testing and approved origins only; never use wildcard origins with credentials.

```mermaid
flowchart LR
  B[Browser] -->|HTTPS / same origin| N[Next.js :3000]
  N -->|rewrite /api/*| A[FastAPI :8000]
  A --> J[Single-worker job runner]
  J --> C[AMRS core pipeline]
  A --> D[(SQLite)]
  A --> S[(Private artifact storage)]
  B -->|poll GET /api/v1/runs/:id| N
```

#### 4.6.2 Environment contract

`apps/web/.env.example` (or root `.env.example` loaded by the web service):

```dotenv
# Server-only. Never expose this value to browser JavaScript.
AMRS_API_INTERNAL_URL=http://127.0.0.1:8000
# Optional UI metadata only; no secrets.
NEXT_PUBLIC_AMRS_APP_NAME=AMRS
```

The frontend's API client uses `/api/v1` as a relative base URL. Do not configure `NEXT_PUBLIC_API_URL=http://localhost:8000`, because that breaks remote browsers and tunnels. Backend `.env` continues to own `AMRS_*` settings such as upload enablement, artifact directory, database path, API key and worker limits. The frontend must never receive the API key, SQLite path, artifact filesystem path or internal backend hostname.

#### 4.6.3 Canonical endpoint mapping

All endpoints are prefixed by `/api/v1`. The route table in Section 2.5 uses route suffixes; the complete paths are:

| Frontend operation | HTTP request | Expected behavior |
|---|---|---|
| Health indicator | `GET /api/v1/health` | Returns API version and DB health; UI shows online/degraded/offline. |
| Defaults | `GET /api/v1/config/defaults` | Loads validated configuration and capability limits. |
| Scenario picker | `GET /api/v1/scenarios` | Lists scenario metadata and artifact availability. |
| Upload model | `POST /api/v1/models/upload` multipart `file` | Returns `model_upload_id`; upload disabled unless explicitly enabled. |
| Create run | `POST /api/v1/runs` JSON | Returns `202 {run_id}`; does not execute the job in the request thread. |
| Run detail/status | `GET /api/v1/runs/{run_id}` | Returns status, stage, progress, diagnosis, candidate summaries and verdict when available. |
| Cancel run | `POST /api/v1/runs/{run_id}/cancel` | Returns `202`; cancellation is cooperative and retains original weights. |
| Artifact download | `GET /api/v1/runs/{run_id}/artifacts/{name}` | Allowlisted `accepted_model.pt`, `report.json` or `report.md`; never arbitrary path. |
| Monitor replay | `POST /api/v1/monitor/replay`; `GET /api/v1/monitor/replay/{id}` | Starts replay and returns metric series/events. |
| Benchmark | `POST /api/v1/benchmarks`; `GET /api/v1/benchmarks/{id}` | Starts and reads benchmark status/results. |
| Latest benchmark | `GET /api/v1/benchmarks/latest` | Loads latest completed benchmark. |

`GET /api/v1/health` must be the only health path used in deployment checks. If the current FastAPI router implementation exposes `/health` without the `/api/v1` prefix, mount it under the prefix rather than maintaining two competing routes.

#### 4.6.4 Typed API client and data ownership

- Create `apps/web/lib/api/client.ts` with a single `apiFetch<T>()` wrapper using `fetch`, relative `/api/v1` paths, `credentials: 'same-origin'`, JSON serialization, request IDs where available, timeout/abort support and normalized errors.
- Create `apps/web/lib/api/errors.ts` to parse the backend envelope `{"error":{"code":"...","message":"...","details":{}}}`. Expose `ApiError` with `status`, `code`, `message`, `details` and `requestId`. Do not show raw tracebacks.
- Create `apps/web/lib/api/runs.ts`, `models.ts`, `scenarios.ts`, `monitor.ts`, `benchmarks.ts` with one function per API operation. UI components must not construct URLs or duplicate fetch/error logic.
- Define TypeScript response/request types in `apps/web/lib/api/types.ts` and Zod runtime schemas in `apps/web/lib/schemas/`. Keep them aligned with FastAPI Pydantic schemas. Add contract tests for representative payloads.
- FastAPI/Pydantic is authoritative for validation, permissions, state transitions and metrics. Client-side validation is for usability only.
- The frontend never computes diagnosis, recovery selection, metric values, gate verdicts or artifact paths. It only renders backend-produced evidence.

#### 4.6.5 Query cache, mutations and long-running jobs

Use TanStack Query. Query keys are stable and scoped: `['health']`, `['defaults']`, `['scenarios']`, `['runs', filters]`, `['run', runId]`, `['monitor-replay', replayId]`, `['benchmark', benchmarkId]`.

- Health query: every 15 seconds; stale after 10 seconds.
- Run detail query: poll every 1.5 seconds while status is `queued` or `running`; stop polling for `succeeded`, `failed` or `cancelled`. Back off to 3 seconds after 2 minutes and stop after a terminal state.
- Benchmark and monitor replay: same status-based polling policy.
- Start run mutation: invalidate run lists and detail after receiving `run_id`; never auto-submit a second run on retry or rerender. Disable Start while submission is pending.
- Cancel mutation: invalidate run detail and keep polling until terminal state. Display “cancellation requested” until backend confirms `cancelled`.
- Upload mutation: show file name, size and server response; allow retry after recoverable failure. Abort upload when user explicitly cancels.
- Do not use WebSockets in MVP. Polling is explicitly chosen because the backend contract already specifies job-based polling and a single worker. WebSockets/SSE are Post-MVP unless measured polling load becomes a real problem.

#### 4.6.6 Upload and run-creation sequence

1. User selects a model `state_dict`, architecture and class/input metadata.
2. Browser submits multipart `POST /api/v1/models/upload`; API validates size/type, `weights_only=True`, registry architecture and tensor compatibility, stores artifact privately and returns `model_upload_id`.
3. User selects scenario or dataset and configuration. The UI fetches `/config/defaults` and `/scenarios`; it displays the resolved config before confirmation.
4. Browser submits `POST /api/v1/runs` with `scenario_id` or `model_upload_id`, `arch`, `config_overrides` and `seed`.
5. API validates the request, persists a queued run and returns HTTP 202 with `run_id`. The API request must not wait for training/recovery.
6. UI navigates to `/runs/{run_id}` and begins status polling.
7. API returns progress stage, diagnosis, attempted strategy, candidate results and terminal verdict as they become available.
8. UI shows results and downloads via allowlisted artifact endpoints.

For dataset upload mode, add a dedicated upload endpoint and `dataset_upload_id` to the request contract before enabling that UI. The current API plan primarily specifies scenario selection and model upload; do not render a dataset upload form unless the backend endpoint and validation contract are implemented.

#### 4.6.7 Error, timeout and retry contract

- `400/422`: show field-level validation messages; preserve user input; do not retry automatically.
- `401/403`: show access/feature-disabled state; never ask the browser to reveal or embed server secrets.
- `404`: show resource-not-found and return to history/list.
- `409`: show active-run conflict and link to the active run if the API provides its ID. Do not blindly resubmit.
- `413/415`: show upload size/type guidance.
- `429`: respect `Retry-After` if present.
- `5xx`/network failure: show recoverable service error and request ID; allow explicit retry for idempotent reads.
- Aborted requests are not shown as server failures. A browser abort does not imply a recovery job was cancelled; cancellation requires the cancel endpoint.
- Start-run retries must use an idempotency key or the backend's active-run conflict guard so a lost response cannot create duplicate work.

#### 4.6.8 Connection acceptance tests

- With API running and web running, the browser can call `/api/v1/health` through Next.js and receive the FastAPI response.
- Browser network panel shows same-origin requests to port 3000; no browser request targets `localhost:8000`.
- With API stopped, UI displays offline/degraded status and actionable retry; no unhandled promise rejection.
- Valid model upload returns an ID and then a run can be created.
- A run returns 202 promptly, UI polls the correct ID, and polling stops on terminal status.
- A 409 active-run response does not create a second run.
- A cancelled browser fetch does not falsely mark the backend job cancelled.
- A 422 field error is rendered beside the relevant control.
- Download endpoints deliver the exact artifact bytes and reject unapproved names.
- Docker Compose works with `AMRS_API_INTERNAL_URL=http://api:8000`.
- Colab tunnel exposes only port 3000 while the Next.js server reaches FastAPI on 127.0.0.1:8000.


---

## 5. Departments

### Department summary and justification

| Code | Department | Why this department exists for AMRS | Parts |
|---|---|---|---|
| PX | Product & UX | Freezes metrics, policy and UX before code, which prevents rework | 2 |
| INF | Infrastructure & DevOps | Repo, config, CI, Colab and Docker. The three-person team needs a shared foundation. | 4 |
| DM | Data & Model Foundation | Metrics, splits, model adapter, scenario zoo. Everything downstream depends on these. | 4 |
| ML | Core Recovery Engine | Diagnose → select → repair → verify → rollback → monitor. This is the North Star. | 10 (ML-10 Post-MVP) |
| BM | Benchmarking | Produces the evidence for M1–M10 | 3 |
| BE | Backend / API & Storage | SQLite, FastAPI, CLI | 6 |
| FE | Frontend / Dashboard | Next.js pages | 6 |
| QA | QA & Security | Test strategy, security hardening, E2E, release gate | 4 |
| DOC | Documentation & Demo | Installation/user/developer docs, runbooks and demo pack | 2 |

**Standard blocks used in every AGENT PROMPT** (they are written out in full in each prompt so each one stands alone):
- *Context block*: describes AMRS in 3–5 lines.
- *Rules block*: additive changes, self-review, ruff and pytest, no breaking existing work.
- *Report block*: the required output format.

---

### 5.1 Department PX — Product & UX

**Purpose and ownership.** Owns the specification freeze: metric definitions, acceptance policy, wireframes and UX copy. It serves the North Star by making "verified better" precisely defined before engineering begins.
**Dependencies.** Needs nothing. Provides the policy and wireframes consumed by DM, ML, BE and FE.

#### Section PX-1: Specification freeze

##### PX-1.1 · Spec freeze, ADRs and acceptance policy files
- **Description.** Converts Sections 1–2 of this document into repo docs and the three acceptance-policy YAMLs (`strict`, `default`, `lenient`). Records decisions C1–C9 as ADRs. Defines the glossary (primary metric, retained-correct rate, compute unit).
- **Prerequisites.** None.
- **Implementation steps.**
  1. Create `docs/adr/0001-naming.md` … `0009-reference-scope.md`, one per conflict C1–C9.
  2. Create `docs/glossary.md` with exact formulas: accuracy, NLL, ECE (15 equal-width bins, top-label confidence), retained-correct rate = |{i: orig correct ∧ cand correct}| / |{i: orig correct}|, top-1 agreement, compute_units = fwd + 3·bwd.
  3. Create `configs/default.yaml` from Section 2.7 and the `acceptance/*.yaml` variants (strict: min_gain 0.01, min_retention 0.98. lenient: min_gain 0.0025, min_retention 0.93).
  4. Write `docs/model_contract.md`: what a supported model must expose (see DM-3).
  5. Create `docs/metrics_targets.md` containing M1–M10 with the measurement procedure.
- **Deliverables.** `docs/adr/*.md`, `docs/glossary.md`, `docs/model_contract.md`, `docs/metrics_targets.md`, `configs/default.yaml`, `configs/acceptance/{strict,default,lenient}.yaml`.
- **Acceptance criteria.** (1) Nine ADRs exist, each with Context, Decision and Consequences. (2) Every metric in the glossary has a formula and a worked numeric example. (3) All three YAML files parse with `yaml.safe_load` and contain every key listed in Section 2.7. (4) `default.yaml` matches Section 2.7 exactly.
- **Tests required.** A pytest (`tests/unit/test_policy_files.py`) that loads each YAML, checks required keys and ensures strict ≥ default ≥ lenient on `min_gain` and `min_retention`.
- **Gaps/risks addressed.** G-01 (naming), G-02 (guarantee wording), G-09 (metric definitions ambiguity).
- **Tag.** MVP
- **AGENT PROMPT.**
```
CONTEXT: You are working on AMRS (Adaptive Model Recovery System), a Python 3.11 + PyTorch framework in the repo `amrs/` (package `src/amrs/`). It diagnoses why a trained image classifier underperforms (overfitting, miscalibration, BatchNorm drift, unstable training, degraded head), applies cheapest-first recovery strategies to a COPY of the model, verifies each candidate on a separate holdout set through a verification gate, and accepts it or rolls back to the untouched original. Conventions: type hints, Pydantic v2, ruff, pytest, YAML configs.

TASK: Create the specification files for the repo. (1) docs/adr/0001-naming.md to 0009-reference-scope.md recording these decisions, each with Context/Decision/Consequences: 0001 use name AMRS (alias AMR); 0002 guarantee is statistical "verification guarantee", not absolute; 0003 MVP strategies include checkpoint reversion+averaging+weight interpolation, LoRA deferred; 0004 selector = diagnosis-eligible set ordered by ascending cost; 0005 uploads accept only state_dict via weights_only=True and registry architectures; 0006 four-way data contract train/val/holdout/target; 0007 covariate-shift only, no production drift monitoring; 0008 references 7-10 are background only; 0009 PS category wording. (2) docs/glossary.md with exact formulas and numeric examples for: accuracy, NLL, ECE (15 equal-width bins, top-label confidence), retained-correct rate = |orig correct AND cand correct| / |orig correct|, top-1 agreement, compute_units = fwd_samples + 3*bwd_samples, generalization gap = train_acc - val_acc. (3) configs/default.yaml exactly as given below, plus configs/acceptance/strict.yaml (min_gain accuracy 0.01, ece 0.02, min_retention 0.98) and lenient.yaml (min_gain accuracy 0.0025, ece 0.005, min_retention 0.93), which only contain the `gate:` block. (4) docs/model_contract.md and docs/metrics_targets.md (metrics M1-M10 with measurement procedure).
[PASTE the YAML from Section 2.7 of the blueprint here as configs/default.yaml]

TESTS: write tests/unit/test_policy_files.py that loads each YAML, asserts required keys exist, and asserts strict>=default>=lenient for gate.min_gain.accuracy and gate.min_retention.

RULES: make additive changes only; do not break existing files or tests; run `ruff check` and `pytest -q`, fix every failure before declaring done; self-review your output against the acceptance criteria (nine ADRs exist; every metric has formula + worked example; YAMLs parse and contain all keys).
REPORT BACK: (1) files created, (2) pytest result summary, (3) acceptance checklist pass/fail, (4) deviations/assumptions, (5) open issues.
```

#### Section PX-2: UX design

##### PX-2.1 · Dashboard wireframes and UX copy
- **Description.** Text wireframes and exact copy for the five pages, verdict banners, gate-reason sentences and error messages. This makes FE work mechanical and consistent.
- **Prerequisites.** PX-1.1.
- **Implementation steps.**
  1. Write `docs/ux/wireframes.md` with an ASCII layout for each page (Run, Results, Benchmarks, Monitor, History), listing every widget, its default value and its data source (API endpoint).
  2. Write `docs/ux/copy.md`: verdict banner text, plain-language gate-reason templates (one per gate criterion and per skip reason: `NO_HISTORY`, `NO_BN_LAYERS`, `NON_FINITE`, `HOLDOUT_TOO_SMALL`, `OOM`, `CANDIDATE_ERROR`), diagnosis label explanations aimed at persona P1, and tooltip texts (compute unit, ECE, retention).
  3. Define the colorblind-safe palette (hex values) and the icon-plus-text rule for verdicts.
  4. Write `docs/ux/states.md` covering empty, loading, error, cancelled and long-running states per page.
- **Deliverables.** `docs/ux/wireframes.md`, `docs/ux/copy.md`, `docs/ux/states.md`.
- **Acceptance criteria.** (1) All five pages have wireframes naming every widget and endpoint. (2) Every error code in Section 2.12 has user-facing copy. (3) Every gate criterion in BR5 has a reason template with placeholders. (4) Palette contrast ratios are listed and each is ≥ 4.5:1 against the page background.
- **Tests required.** `tests/unit/test_copy_complete.py` loads `copy.md` and asserts each error and reason code in `amrs.errors` (once it exists) has an entry. Until `errors.py` exists, the test checks against a hardcoded list and is updated in INF-2.
- **Gaps/risks addressed.** G-14 (UX of rejection), G-15 (accessibility).
- **Tag.** MVP
- **AGENT PROMPT.**
```
CONTEXT: You are working on AMRS (Adaptive Model Recovery System), a Python 3.11 + PyTorch framework in repo `amrs/`. It diagnoses why a trained image classifier underperforms, tries cheapest-first recovery strategies on a COPY of the model, verifies each candidate on a holdout set via a verification gate, and accepts it or rolls back to the untouched original. A Next.js App Router + React + TypeScript + Tailwind CSS web app (5 pages: Run Recovery, Results, Benchmarks, Live Monitor, History) talks to FastAPI at /api/v1 through a same-origin Next.js rewrite proxy.

TASK: Write docs/ux/wireframes.md, docs/ux/copy.md, docs/ux/states.md. Wireframes: ASCII layout per page listing every widget, default, and source endpoint (endpoints: GET /scenarios, POST /runs, GET /runs, GET /runs/{id}, POST /runs/{id}/cancel, GET /runs/{id}/artifacts/{name}, POST /monitor/replay, GET /monitor/replay/{id}, POST /benchmarks, GET /benchmarks/{id}, GET /benchmarks/latest). Verdict banners: green ACCEPTED:<strategy>, amber ROLLED BACK: original kept, grey Healthy: no action needed, red Error; always icon + text. Copy: one plain-language template per gate criterion (primary-metric CI lower bound, min gain, secondary regression, retention below min, compute over budget) and per code: NO_HISTORY, NO_BN_LAYERS, NON_FINITE, HOLDOUT_TOO_SMALL, OOM, CANDIDATE_ERROR, MODEL_ARCH_MISMATCH, UNSAFE_OR_INVALID_CHECKPOINT; explanations for the labels overfitting, miscalibration, bn_drift, instability, head_degradation, healthy for a student audience; tooltips for compute unit, ECE, retention. Define a colorblind-safe palette with hex values and contrast ratios >= 4.5:1.
TESTS: tests/unit/test_copy_complete.py asserting every listed code and criterion appears as a heading in copy.md.

RULES: additive changes only; do not break existing files; run `ruff check` and `pytest -q`, fix failures before declaring done; self-review against acceptance criteria (all 5 pages wireframed with endpoints; every code has copy; every criterion has a template; contrast ratios listed).
REPORT BACK: (1) files created, (2) pytest summary, (3) acceptance checklist, (4) deviations, (5) open issues.
```

---

### 5.2 Department INF — Infrastructure & DevOps

**Purpose and ownership.** Provides the repo, configuration system, CI and execution environments so four people can build in parallel without breaking each other. Serves the North Star by guaranteeing reproducibility (M10) and quality (M9).
**Dependencies.** Needs PX-1.1 for config files. Provides the scaffold, config loader, error types, logging and CI to everyone.

#### Section INF-1: Foundation

##### INF-1.1 · Repository scaffold and tooling
- **Description.** Creates the package skeleton from Section 4.4, packaging, lint/type/test tooling and pre-commit.
- **Prerequisites.** None (can start in parallel with PX-1.1).
- **Implementation steps.**
  1. `git init`, `.gitignore` (artifacts/, *.pt, __pycache__, .venv, *.db).
  2. `pyproject.toml` (build backend setuptools, `src` layout, Python ≥ 3.11). Dependencies, pinned with compatible ranges: torch, torchvision, numpy, pandas, scikit-learn, pydantic>=2, pyyaml, fastapi, uvicorn, plotly, matplotlib, httpx, requests. Frontend dependencies are managed separately in `apps/web/package.json`: next, react, react-dom, typescript, tailwindcss, @tanstack/react-query, zod, react-hook-form, @hookform/resolvers, plotly.js and a React Plotly wrapper. Dev: pytest, pytest-cov, ruff, mypy, pre-commit, pip-audit, hypothesis. Extra `peft` under `[project.optional-dependencies].transformers`.
  3. Create every package directory with `__init__.py` and the module stubs from Section 4.4, each with a docstring and `raise NotImplementedError` only where a function is declared.
  4. `Makefile` targets: `install`, `lint`, `type`, `test`, `cov`, `api`, `web`, `dev`, `scenarios`, `benchmark`.
  5. `.pre-commit-config.yaml` (ruff, ruff-format, trailing whitespace, check-yaml).
  6. `LICENSE` (MIT), skeleton `README.md`.
  7. Entry point `amrs = amrs.cli:main` printing the version.
- **Deliverables.** All files above. `pip install -e .[dev]` works. `amrs --version` prints the version.
- **Acceptance criteria.** (1) `pip install -e .[dev]` succeeds on a clean Python 3.11 venv. (2) `make lint type test` exit 0. (3) `amrs --version` prints `0.1.0`. (4) Directory tree equals Section 4.4 (no missing package).
- **Tests required.** `tests/unit/test_import_all.py` imports every module under `amrs`. `tests/unit/test_cli_version.py` runs the CLI entry point.
- **Gaps/risks addressed.** G-16 (dependency drift), R-11.
- **Tag.** MVP
- **AGENT PROMPT.**
```
CONTEXT: You are working on AMRS (Adaptive Model Recovery System), a Python 3.11 + PyTorch framework. It diagnoses why a trained image classifier underperforms, applies cheapest-first recovery strategies to a COPY of the model, verifies candidates on a holdout set through a gate, and accepts or rolls back. Stack: PyTorch/Torchvision, scikit-learn, NumPy, Pandas, FastAPI+Pydantic v2, YAML, SQLite, Next.js+React+TypeScript+Tailwind+TanStack Query+Zod, Plotly.js, pytest.

TASK: Create the repository scaffold. Use a src layout `src/amrs/` with these subpackages, each with __init__.py and module stubs (docstring + minimal declarations, NotImplementedError bodies): utils(seed,hashing,logging,timing,fs), data(splits,loaders,shifts,synthetic), models(adapter,registry,loader,zoo), metrics(classification,retention,compute,bootstrap), diagnosis(engine,rules,probes), recovery(base,temperature,bn_recal,checkpoints,last_layer,selective_ft,l2sp,interpolation), selector(selector), evaluation(evaluator,gate), pipeline(orchestrator,artifacts), monitor(callback,detectors,replay), store(db,migrations,repository), benchmark(baselines,scenarios,runner,report), api(main,deps,jobs,routes/{runs,scenarios,monitor,benchmarks,models}); top-level errors.py, config.py, schemas.py, cli.py; plus `apps/web/`, `scripts/`, `tests/{unit,integration,e2e,fixtures}`, `docs/`, `configs/`. Create pyproject.toml (setuptools, Python>=3.11, deps: torch, torchvision, numpy, pandas, scikit-learn, pydantic>=2, pyyaml, fastapi, uvicorn, plotly, matplotlib, httpx, requests; dev extras: pytest, pytest-cov, ruff, mypy, pre-commit, pip-audit, hypothesis; optional extra `transformers` with peft), Makefile (install, lint, type, test, cov, api, web, dev, scenarios, benchmark), .pre-commit-config.yaml, .gitignore (artifacts/, *.pt, *.db, .venv), LICENSE (MIT), README skeleton, and a console script `amrs = amrs.cli:main` printing version 0.1.0.
TESTS: tests/unit/test_import_all.py (imports every module), tests/unit/test_cli_version.py.

RULES: additive changes only; do not break existing files; run `make lint type test` and fix all failures before declaring done; self-review against: clean-venv install succeeds, `amrs --version` prints 0.1.0, tree matches spec.
REPORT BACK: (1) files created, (2) command outputs summary, (3) acceptance checklist, (4) deviations, (5) open issues.
```

##### INF-1.2 · Configuration, errors, logging, seeding
- **Description.** The shared substrate: Pydantic config models mirroring `default.yaml`, the exception hierarchy with stable error codes, structured logging with `run_id`, and deterministic seeding.
- **Prerequisites.** INF-1.1, PX-1.1.
- **Implementation steps.**
  1. `config.py`: `AmrsConfig` and nested models for every block of Section 2.7 with validation (`0 ≤ thresholds ≤ 1`, `mode ∈ {first_accept, best_of_all}`, `max_candidates ≥ 1`, `bootstrap_samples ≥ 200`). `load_config(path, overrides: dict)` deep-merges overrides and returns a frozen model. `resolved_config_json()` serializes it.
  2. `errors.py`: `AmrsError(code, message, details)` and subclasses with these codes: `MODEL_ARCH_MISMATCH`, `UNSAFE_OR_INVALID_CHECKPOINT`, `HOLDOUT_TOO_SMALL`, `NO_HISTORY`, `NO_BN_LAYERS`, `NON_FINITE`, `OOM`, `CANDIDATE_ERROR`, `CONFIG_INVALID`, `RUN_CANCELLED`, `NOT_FOUND`, `CONFLICT`. Each has a `to_dict()` matching the API error body.
  3. `utils/logging.py`: JSON formatter, `get_logger(name)`, `bind_run_id(run_id)` via `contextvars`.
  4. `utils/seed.py`: `seed_everything(seed, deterministic=True)` (python, numpy, torch, cuda, cudnn flags, `torch.use_deterministic_algorithms(True, warn_only=True)`), returns a dict of settings applied.
  5. `utils/hashing.py`: `sha256_file(path)` streaming; `utils/fs.py`: `atomic_write(path, bytes|callable)` (temp + `os.replace`), `safe_join(base, name)` raising on traversal.
  6. `utils/timing.py`: `Stopwatch` context manager.
- **Deliverables.** The six modules above, fully implemented.
- **Acceptance criteria.** (1) Invalid config values raise `AmrsError(CONFIG_INVALID)` naming the field. (2) `load_config` with overrides `{"gate": {"min_retention": 0.9}}` changes only that key. (3) Two calls to `seed_everything(7)` followed by `torch.rand(3)` produce equal tensors. (4) `atomic_write` leaves no partial file when the writer raises. (5) `safe_join(base, "../x")` raises. (6) Log lines are valid JSON containing `run_id` when bound.
- **Tests required.** Unit tests for every criterion, plus a Hypothesis test that `load_config(overrides)` round-trips through `resolved_config_json`.
- **Gaps/risks addressed.** G-08 (reproducibility), G-11 (atomic writes), G-17 (path traversal groundwork).
- **Tag.** MVP
- **AGENT PROMPT.**
```
CONTEXT: You are working on AMRS (Adaptive Model Recovery System), a Python 3.11 + PyTorch framework in repo `amrs/` (src/amrs/). It diagnoses why a trained image classifier underperforms, applies cheapest-first recovery strategies to a COPY of the model, verifies candidates on a holdout set through a gate, and accepts or rolls back. All thresholds live in YAML (configs/default.yaml) validated by Pydantic v2.

TASK: Implement src/amrs/config.py, errors.py, utils/logging.py, utils/seed.py, utils/hashing.py, utils/fs.py, utils/timing.py. (1) config.py: Pydantic v2 models mirroring every block of configs/default.yaml (seed, device, splits, diagnosis.*, selector, strategies.*, gate, monitor); validators: thresholds in [0,1] where fractional, selector.mode in {first_accept,best_of_all}, max_candidates>=1, gate.bootstrap_samples>=200; `load_config(path, overrides=None)` deep-merges overrides, returns an immutable model; `resolved_config_json()`. (2) errors.py: AmrsError(code,message,details) with to_dict() -> {"error":{"code","message","details"}} and subclasses/codes MODEL_ARCH_MISMATCH, UNSAFE_OR_INVALID_CHECKPOINT, HOLDOUT_TOO_SMALL, NO_HISTORY, NO_BN_LAYERS, NON_FINITE, OOM, CANDIDATE_ERROR, CONFIG_INVALID, RUN_CANCELLED, NOT_FOUND, CONFLICT. (3) logging: JSON formatter, get_logger, bind_run_id via contextvars. (4) seed_everything(seed, deterministic=True) covering random/numpy/torch/cuda/cudnn and use_deterministic_algorithms(warn_only=True). (5) sha256_file streaming; atomic_write (temp file + os.replace, no partial file on failure); safe_join(base,name) raising on traversal. (6) Stopwatch context manager.
ACCEPTANCE: invalid config -> CONFIG_INVALID naming the field; override {"gate":{"min_retention":0.9}} changes only that key; seed_everything(7) twice gives equal torch.rand(3); atomic_write leaves no partial file when writer raises; safe_join(base,"../x") raises; log lines are valid JSON with run_id when bound.
TESTS: unit tests for each criterion + a Hypothesis round-trip test for load_config/resolved_config_json. Update tests/unit/test_copy_complete.py to import codes from amrs.errors if it exists.

RULES: additive changes only; do not break existing modules/tests; run `ruff check`, `mypy src`, `pytest -q`, fix failures before declaring done; self-review against ACCEPTANCE.
REPORT BACK: (1) files created/modified, (2) test summary, (3) acceptance checklist, (4) deviations, (5) open issues.
```

#### Section INF-2: Automation and environments

##### INF-2.1 · CI pipeline
- **Description.** GitHub Actions workflow enforcing lint, types, tests, coverage and dependency audit.
- **Prerequisites.** INF-1.1.
- **Implementation steps.** (1) `.github/workflows/ci.yml` with a matrix of Python 3.11 on `ubuntu-latest`. (2) Steps: checkout, setup-python with pip cache, install CPU-only torch via the PyTorch CPU index, `pip install -e .[dev]`, `ruff check`, `ruff format --check`, `mypy src/amrs` (core packages), `pytest -q --cov=amrs --cov-fail-under=80 -m "not gpu and not slow"`, `pip-audit` (fail on high severity). (3) Register pytest markers `gpu`, `slow`, `e2e`. (4) Add a PR template with the definition-of-done checklist from Section 8. (5) Add a status badge to the README.
- **Deliverables.** `.github/workflows/ci.yml`, `.github/pull_request_template.md`, pytest markers in `pyproject.toml`.
- **Acceptance criteria.** (1) The workflow runs green on a PR containing the scaffold. (2) A deliberately failing test turns the check red (verified once, then reverted). (3) Median CI duration ≤ 8 minutes. (4) The coverage gate is active (80%) from the first Part that adds core logic, and is configured with `--cov-fail-under` set via `COVERAGE_MIN` (set to 0 until DM-1.1 merges, then 80).
- **Tests required.** The workflow itself is validated by a throwaway failing-test PR. Add `tests/unit/test_markers.py` asserting the markers are registered.
- **Gaps/risks addressed.** G-16, R-11.
- **Tag.** MVP
- **AGENT PROMPT.**
```
CONTEXT: You are working on AMRS (Adaptive Model Recovery System), a Python 3.11 + PyTorch framework in repo `amrs/`. It diagnoses why a trained image classifier underperforms, tries cheapest-first recovery strategies on a COPY of the model, verifies candidates on a holdout set via a gate, and accepts or rolls back. Tests must run on CPU with tiny synthetic fixtures.

TASK: Create .github/workflows/ci.yml (ubuntu-latest, Python 3.11, pip cache; install CPU-only torch from the PyTorch CPU wheel index; `pip install -e .[dev]`; `ruff check`; `ruff format --check`; `mypy src/amrs`; `pytest -q --cov=amrs --cov-fail-under=$COVERAGE_MIN -m "not gpu and not slow"`; `pip-audit` failing on high severity). COVERAGE_MIN is an env var defaulting to 0 with a comment saying to set 80 once DM-1.1 merges. Register pytest markers gpu, slow, e2e in pyproject.toml. Add .github/pull_request_template.md with a definition-of-done checklist (tests added, acceptance criteria verified, docs updated, no breaking changes, security considered). Add a CI badge to README.md.
TESTS: tests/unit/test_markers.py asserting the three markers are registered.

RULES: additive changes only; do not break existing files; run `ruff check` and `pytest -q` locally, fix failures; self-review against: workflow YAML valid, markers registered, coverage gate configurable.
REPORT BACK: (1) files created/modified, (2) local command results, (3) acceptance checklist, (4) deviations, (5) open issues.
```

##### INF-2.2 · Colab/Kaggle bootstrap and Docker
- **Description.** The GPU runbook (notebook) and an optional Docker image, so scenario building and benchmarks run on free GPUs and the demo is portable.
- **Prerequisites.** INF-1.1.
- **Implementation steps.** (1) `scripts/colab_bootstrap.ipynb`: mount Drive (optional), clone the repo, `pip install -e .`, verify CUDA, run `amrs scenarios build --all --device cuda`, cache artifacts to Drive, start FastAPI on 8000 and Next.js on 3000, expose only Next.js through a tunnel (`cloudflared` or `localtunnel`), and print the web URL. Next.js proxies `/api/*` to the private FastAPI service. (2) A Kaggle equivalent section in `docs/runbook_gpu.md` (internet toggle, dataset caching, 30-hour weekly quota note). (3) `Dockerfile` (python:3.11-slim, installs CPU torch by default with a `--build-arg TORCH_INDEX` option, non-root user, exposes 3000 and 8000). (4) `docker-compose.yml` with services `api` and `web`; `api` mounts the persistent `artifacts` volume and exposes port 8000 only to the Compose network, while `web` publishes port 3000 and sets `AMRS_API_INTERNAL_URL=http://api:8000`, and a healthcheck on `/api/v1/health`. (5) Document session-limit fallbacks.
- **Deliverables.** `scripts/colab_bootstrap.ipynb`, `docs/runbook_gpu.md`, `Dockerfile`, `docker-compose.yml`, `.dockerignore`.
- **Acceptance criteria.** (1) `docker compose build` succeeds. (2) `docker compose up` serves `/api/v1/health` returning 200 and the Next.js web app on port 3000 and FastAPI health endpoint on port 8000 (once BE-2 and FE-1 exist. Before then, the healthcheck points to a stub). (3) The runbook contains a "if the Colab session dies" recovery section. (4) The container runs as a non-root user.
- **Tests required.** CI jobs build both API and web images; a Compose smoke test verifies proxy health where Docker is available and `tests/e2e/test_docker_health.py` (marker `e2e`, skipped unless Docker is available).
- **Gaps/risks addressed.** R-05 (Colab limits), G-18 (portability).
- **Tag.** MVP (Docker is Should within MVP. The notebook and runbook are Must).
- **AGENT PROMPT.**
```
CONTEXT: You are working on AMRS (Adaptive Model Recovery System), a Python 3.11 + PyTorch framework in repo `amrs/`. It diagnoses why a trained image classifier underperforms, tries cheapest-first recovery on a COPY of the model, verifies candidates on a holdout set via a gate, and accepts or rolls back. It ships a FastAPI backend (port 8000, GET /api/v1/health) and a Next.js + Tailwind web app (port 3000). GPU work happens on Colab/Kaggle.

TASK: Create (1) scripts/colab_bootstrap.ipynb: optional Drive mount, clone repo, pip install -e ., verify torch.cuda, run `amrs scenarios build --all --device cuda`, cache artifacts to Drive, launch FastAPI on 8000 and Next.js on 3000; expose only the Next.js port with cloudflared/localtunnel, print URL; (2) docs/runbook_gpu.md: Colab + Kaggle steps, quotas, caching, and a section "If the Colab session dies" with exact recovery commands; (3) Dockerfile (python:3.11-slim, CPU torch by default with build-arg TORCH_INDEX, non-root user, EXPOSE 8000 3000); (4) docker-compose.yml with services api and web, shared artifacts volume mounted by API, API healthcheck on /api/v1/health; (5) .dockerignore. If the API does not exist yet, add a minimal stub entrypoint clearly marked TODO-BE-2 that serves /api/v1/health so the container is verifiable.
TESTS: tests/e2e/test_docker_health.py marked `e2e`, skipped if docker is unavailable; a CI step that only builds the image.

RULES: additive changes only; do not break existing files; run `ruff check` and `pytest -q`; self-review against: compose builds, non-root user, runbook has the recovery section.
REPORT BACK: (1) files created, (2) command results, (3) acceptance checklist, (4) deviations, (5) open issues.
```

---

### 5.3 Department DM — Data & Model Foundation

**Purpose and ownership.** Builds what every strategy and every metric stands on: metric functions, honest data splits, a safe model adapter, and the scenario zoo with ground truth. Serves the North Star's "verified" requirement because a gate is only as honest as its metrics and splits.
**Dependencies.** Needs INF-1.1, INF-1.2. Provides metrics, splits, adapters and scenarios to ML, BM and BE.

#### Section DM-1: Metrics

##### DM-1.1 · Metrics, bootstrap and compute meter
- **Description.** Accuracy, NLL, ECE, retained-correct rate, top-1 agreement, paired bootstrap CI and the compute meter (fwd/bwd sample counters, wall time).
- **Prerequisites.** INF-1.2.
- **Implementation steps.**
  1. `metrics/classification.py`: `predict_logits(model, loader, device) -> (logits, labels)` in `eval()` mode under `torch.inference_mode()`. `accuracy(logits, y)`, `nll(logits, y)` (stable log-softmax), `ece(logits, y, n_bins=15)` (top-label confidence, equal-width bins), `per_sample_correct(logits, y)`, `metric_bundle(...) -> dict`.
  2. `metrics/retention.py`: `retained_correct_rate(orig_correct, cand_correct)` (returns 1.0 if the original had zero correct samples, with a warning flag), `top1_agreement(logits_a, logits_b)`.
  3. `metrics/bootstrap.py`: `paired_bootstrap_delta(per_sample_orig, per_sample_cand, n_boot, confidence, seed, higher_is_better) -> {delta, ci_low, ci_high}` using resampled indices shared by both models. For ECE and NLL, a `metric_fn` variant that recomputes the metric on resampled indices from stored logits. Vectorized with NumPy.
  4. `metrics/compute.py`: `ComputeMeter` (context manager and counters `add_fwd(n)`, `add_bwd(n)`, `units = fwd + 3·bwd`, `wall_s`, `grad_steps`), `meter_scope(name)` for nested accounting, and a `NullMeter`.
- **Deliverables.** The four modules, fully implemented and typed.
- **Acceptance criteria.** (1) ECE of a perfectly calibrated hand-built example equals 0 within 1e-9, and of an always-100%-confident, 50%-accurate example equals 0.5 within 1e-9. (2) NLL equals `torch.nn.functional.cross_entropy` on random logits within 1e-6. (3) `retained_correct_rate` matches the glossary's worked example. (4) Bootstrap with identical models returns delta 0 and a CI containing 0. With a candidate strictly better on every sample, `ci_low > 0`. (5) Same seed gives identical CI. (6) `ComputeMeter` units = fwd + 3·bwd exactly.
- **Tests required.** Unit tests for all six criteria, edge cases (empty batch raises, single class, all-wrong original), and Hypothesis tests that accuracy ∈ [0,1], ECE ∈ [0,1], and bootstrap CI low ≤ delta ≤ high.
- **Gaps/risks addressed.** G-09 (metric ambiguity), G-03 (statistical honesty).
- **Tag.** MVP
- **AGENT PROMPT.**
```
CONTEXT: You are working on AMRS (Adaptive Model Recovery System), a Python 3.11 + PyTorch framework in repo `amrs/` (src/amrs/). It diagnoses why a trained image classifier underperforms, tries cheapest-first recovery on a COPY of the model, verifies candidates on a holdout set via a gate, and accepts or rolls back. The gate relies on paired bootstrap confidence intervals and a compute meter. Glossary is in docs/glossary.md.

TASK: Implement src/amrs/metrics/{classification,retention,bootstrap,compute}.py. classification: predict_logits(model, loader, device)->(logits,labels) in eval mode under torch.inference_mode; accuracy; nll (stable); ece(logits,y,n_bins=15) with top-label confidence and equal-width bins; per_sample_correct; metric_bundle -> dict(accuracy,nll,ece,n). retention: retained_correct_rate(orig_correct, cand_correct) = |both correct|/|orig correct| (return 1.0 and flag if orig has zero correct), top1_agreement. bootstrap: paired_bootstrap_delta(orig, cand, n_boot, confidence, seed, higher_is_better, metric_fn=None) -> {delta, ci_low, ci_high}; shared resample indices; metric_fn variant recomputes ECE/NLL from stored logits on resamples; vectorized NumPy; a `delta` for lower-is-better metrics is defined as orig - cand so that positive always means improvement. compute: ComputeMeter with add_fwd(n), add_bwd(n), grad_steps, wall_s, units = fwd + 3*bwd; nested meter_scope(name); NullMeter.
ACCEPTANCE: ECE of a perfectly calibrated hand example is 0 (1e-9); a 100%-confident 50%-accurate example gives 0.5; NLL matches F.cross_entropy within 1e-6; retained rate matches the glossary example; identical models give delta 0 and CI containing 0; strictly-better candidate gives ci_low>0; same seed -> identical CI; meter units exact.
TESTS: unit tests for all of the above, edge cases (empty input raises, single class, all-wrong original) and Hypothesis tests (accuracy and ECE in [0,1], ci_low<=delta<=ci_high).

RULES: additive changes only; do not break existing modules/tests; run `ruff check`, `mypy src`, `pytest -q`; fix failures before declaring done; self-review against ACCEPTANCE. After merging, set COVERAGE_MIN=80 in CI.
REPORT BACK: (1) files created/modified, (2) test summary with coverage, (3) acceptance checklist, (4) deviations, (5) open issues.
```

#### Section DM-2: Data

##### DM-2.1 · Data contract, splitter, loaders, shifts, synthetic data
- **Description.** Implements the four-way data contract (`train`, `val`, `holdout`, `target`), deterministic stratified splitting, torchvision dataset loaders, covariate-shift transforms and a tiny synthetic dataset for CI.
- **Prerequisites.** INF-1.2, DM-1.1.
- **Implementation steps.**
  1. `schemas.py`: `DataBundle` dataclass with `train`, `val`, `holdout` (labeled `Dataset`s), `target` (unlabeled `Dataset` or None), `num_classes`, `input_shape`, `provenance` (dict).
  2. `data/splits.py`: `make_bundle(train_ds, val_ds=None, holdout_ds=None, target_ds=None, cfg, seed)`: (a) if `holdout` is given, use it. (b) else if `val` is given and `holdout_from_val`, split `val` 50/50 stratified into `val` and `holdout`. (c) else carve `train` 70/15/15 (stratified) and emit a `LEAKAGE_RISK` warning. Assert zero index overlap among the three sets (by stable sample IDs). Raise `HOLDOUT_TOO_SMALL` below 200 unless `allow_small_holdout`. Warn below 500. Warn when a class is missing from the holdout.
  2. Give every dataset a stable `ids` attribute so overlap can be verified.
  3. `data/loaders.py`: `load_cifar10(root, train_subset=None, seed)` with standard normalization, `load_fashion_mnist(...)`, `make_loader(ds, batch_size, shuffle, seed, num_workers=0)`. Deterministic generator and `worker_init_fn`.
  4. `data/shifts.py`: `apply_shift(ds, brightness, contrast, noise_std, seed)` returning a lazily transformed dataset with severity presets `mild`, `medium`, `severe`.
  5. `data/synthetic.py`: `make_synthetic_images(n, num_classes=4, shape=(1,8,8), seed)` with class-dependent patterns, so tiny models reach > 90% accuracy within seconds. It is used by all CI tests.
- **Deliverables.** Modules above. `DataBundle` in `schemas.py`.
- **Acceptance criteria.** (1) For any input combination, the resulting `train`/`val`/`holdout` have pairwise-disjoint IDs. (2) The split is deterministic for a fixed seed and differs for a different seed. (3) Stratification keeps each class proportion within ±2 percentage points when class counts permit. (4) `HOLDOUT_TOO_SMALL` is raised for 150 samples, and a warning is emitted for 300. (5) `apply_shift("severe")` measurably reduces accuracy of a trained synthetic model by ≥ 10 points. (6) Synthetic data with seed s is byte-identical across runs.
- **Tests required.** Unit tests per criterion, a Hypothesis test for disjointness over random sizes/ratios, and a failure-path test for a missing class.
- **Gaps/risks addressed.** G-04 (holdout leakage), G-05 (small holdout), G-06 (no-val input).
- **Tag.** MVP
- **AGENT PROMPT.**
```
CONTEXT: You are working on AMRS (Adaptive Model Recovery System), a Python 3.11 + PyTorch framework in repo `amrs/` (src/amrs/). It diagnoses why a trained image classifier underperforms, tries cheapest-first recovery strategies on a COPY of the model, verifies candidates on a HOLDOUT set through a gate, and accepts or rolls back. Verification is only honest if holdout is disjoint from everything used for diagnosis and repair. Four-way data contract: train, val (diagnosis + candidate selection), holdout (gate only), target (optional unlabeled, for BatchNorm recalibration).

TASK: Implement DataBundle in src/amrs/schemas.py and src/amrs/data/{splits,loaders,shifts,synthetic}.py. make_bundle(train_ds, val_ds=None, holdout_ds=None, target_ds=None, cfg, seed): if holdout given use it; elif val given and cfg.splits.holdout_from_val split val 50/50 stratified into val/holdout; else carve train 70/15/15 stratified and emit warning code LEAKAGE_RISK. Every dataset exposes stable `ids`; assert pairwise-disjoint train/val/holdout ids. Raise AmrsError HOLDOUT_TOO_SMALL if holdout<200 unless cfg.gate.allow_small_holdout; warn if <500; warn if a class is absent from holdout. loaders: load_cifar10(root, train_subset=None, seed), load_fashion_mnist, make_loader(ds,batch_size,shuffle,seed,num_workers=0) deterministic. shifts: apply_shift(ds, brightness, contrast, noise_std, seed) lazy, presets mild/medium/severe. synthetic: make_synthetic_images(n, num_classes=4, shape=(1,8,8), seed) with class-dependent patterns learnable by a tiny MLP to >90% accuracy in seconds, byte-identical per seed.
ACCEPTANCE: disjoint ids for every input combination; deterministic per seed and different across seeds; class proportions within 2 points when feasible; HOLDOUT_TOO_SMALL at 150, warning at 300; severe shift lowers accuracy of a trained synthetic model by >=10 points.
TESTS: unit tests per criterion + Hypothesis test on disjointness + missing-class failure path. Tests must use synthetic data only (no downloads).

RULES: additive changes only; do not break existing modules/tests; run `ruff check`, `mypy src`, `pytest -q`; fix failures before declaring done; self-review against ACCEPTANCE.
REPORT BACK: (1) files created/modified, (2) test summary, (3) acceptance checklist, (4) deviations, (5) open issues.
```

#### Section DM-3: Models

##### DM-3.1 · Model adapter, registry and safe loader
- **Description.** Defines the minimal model contract AMRS needs, three registry architectures, and safe `state_dict` loading. The adapter abstracts "backbone", "head" and "BN layers" so strategies work on any registered model.
- **Prerequisites.** INF-1.2.
- **Implementation steps.**
  1. `models/registry.py`: `register(name)` decorator and `build(name, num_classes, in_shape) -> nn.Module` for `mlp_small`, `small_cnn` (3 conv blocks with BN, global pooling, linear head), and `resnet18_cifar` (torchvision ResNet-18 with a 3×3 stem and no max-pool, head `fc`).
  2. `models/adapter.py`: `ModelAdapter(model)` with `head_module()` (named `fc`/`classifier`/`head` or the last `nn.Linear`), `backbone_params()`, `head_params()`, `bn_layers()`, `features(x)` (forward until the head's input, via forward hook), `layer_groups()` (ordered list of parameter groups from input to output, used for "unfreeze top-N"), `supports_bn()`, `num_params()`.
  3. `models/loader.py`: `load_state_dict_safe(path) -> OrderedDict` using `torch.load(path, map_location="cpu", weights_only=True)`. It accepts a raw `state_dict` or `{"state_dict": ...}`, rejects non-tensor values, and maps any exception to `UNSAFE_OR_INVALID_CHECKPOINT`. `build_and_load(arch, path, num_classes, in_shape)` maps key mismatches to `MODEL_ARCH_MISMATCH` listing up to 20 missing and unexpected keys. `load_from_module(spec "path.py:factory")` is allowed only when `allow_custom_code=True`, which only the CLI sets.
  4. `models/zoo.py`: `save_checkpoint(model, path, meta)` using `atomic_write`, and `list_history(dir)` returning ordered epoch checkpoints from `ckpt_epochNNN.pt`.
- **Deliverables.** The four modules.
- **Acceptance criteria.** (1) All three registry models forward-pass on synthetic input of the right shape. (2) `ModelAdapter.head_module()` returns `fc` for `resnet18_cifar` and the final Linear for `mlp_small`. (3) `bn_layers()` is empty for `mlp_small` and non-empty for `small_cnn`. (4) A pickled arbitrary object (for example a file containing a pickled `os.system` call) is **rejected** with `UNSAFE_OR_INVALID_CHECKPOINT`. (5) Wrong-architecture weights raise `MODEL_ARCH_MISMATCH` with key lists. (6) `features(x)` followed by the head reproduces the model output within 1e-6. (7) `layer_groups()` is ordered input→output and covers every parameter exactly once.
- **Tests required.** Unit tests per criterion, including the malicious-pickle test (the pickle must **not** execute: assert a sentinel file is not created).
- **Gaps/risks addressed.** G-07 (RCE via pickle), G-10 (architecture compatibility), R-04.
- **Tag.** MVP
- **AGENT PROMPT.**
```
CONTEXT: You are working on AMRS (Adaptive Model Recovery System), a Python 3.11 + PyTorch framework in repo `amrs/` (src/amrs/). It diagnoses why a trained image classifier underperforms, tries cheapest-first recovery strategies on a COPY of the model, verifies on a holdout set via a gate, and accepts or rolls back. Strategies need to find the model's head, backbone, BatchNorm layers and ordered layer groups. Uploaded checkpoints are untrusted.

TASK: Implement src/amrs/models/{registry,adapter,loader,zoo}.py. registry: register(name) decorator; build(name,num_classes,in_shape) for mlp_small, small_cnn (3 conv blocks with BN, global pool, linear head), resnet18_cifar (torchvision resnet18 with 3x3 stem, no maxpool, head `fc`). adapter: ModelAdapter(model) with head_module() (fc/classifier/head else last nn.Linear), backbone_params(), head_params(), bn_layers(), features(x) via forward hook on the head input, layer_groups() ordered input->output covering every parameter exactly once, supports_bn(), num_params(). loader: load_state_dict_safe(path) using torch.load(map_location="cpu", weights_only=True), accepting a raw state_dict or {"state_dict":...}, rejecting non-tensor values, mapping any failure to AmrsError UNSAFE_OR_INVALID_CHECKPOINT; build_and_load(arch,path,num_classes,in_shape) mapping key mismatch to MODEL_ARCH_MISMATCH listing up to 20 missing/unexpected keys; load_from_module("path.py:factory") only when allow_custom_code=True. zoo: save_checkpoint(model,path,meta) via atomic_write; list_history(dir) returning ordered ckpt_epochNNN.pt paths.
ACCEPTANCE: all registry models forward-pass; head_module correct for resnet18_cifar (fc) and mlp_small (last Linear); bn_layers empty for mlp_small, non-empty for small_cnn; a malicious pickle is rejected AND does not execute (assert a sentinel file is not created); wrong-arch weights raise MODEL_ARCH_MISMATCH; head(features(x)) equals model(x) within 1e-6; layer_groups covers every param once.
TESTS: unit tests for each criterion including the malicious-pickle test.

RULES: additive changes only; do not break existing modules/tests; run `ruff check`, `mypy src`, `pytest -q`; fix failures; self-review against ACCEPTANCE.
REPORT BACK: (1) files created/modified, (2) test summary, (3) acceptance checklist, (4) deviations, (5) open issues.
```

#### Section DM-4: Scenario zoo

##### DM-4.1 · Scenario zoo generator
- **Description.** Builds the six scenarios S1–S6 (Section 2.2) reproducibly: trained weights, per-epoch checkpoints, training-history JSON, data bundle spec, a separate `benchmark_eval` partition and ground-truth label. This is the dataset behind every success metric.
- **Prerequisites.** DM-1.1, DM-2.1, DM-3.1.
- **Implementation steps.**
  1. `benchmark/scenarios.py`: `ScenarioSpec` (id, arch, dataset, subset sizes, train recipe, ground-truth label, shift config) loaded from `configs/scenarios/*.yaml`. Two profiles: `full` (CIFAR-10, `resnet18_cifar`, GPU) and `cpu` (FashionMNIST 28×28 or CIFAR subset with `small_cnn`; ≤ 5 min per scenario on a laptop CPU), plus `tiny` (synthetic, for CI, ≤ 10 s).
  2. A trainer `train_model(spec, seed, out_dir)` writing `ckpt_epochNNN.pt`, `history.json` (`train_loss`, `train_acc`, `val_loss`, `val_acc` per epoch), `final.pt` and `meta.json` (ground-truth label, seed, config hash, SHA-256).
  3. Scenario builders: S1 (overfit recipe: tiny train subset, no augmentation, many epochs), S2 (train healthy, then scale head weight ×2.5 and bias ×2.5), S3 (train healthy, spec carries a shift config for val/holdout/target), S4 (SGD lr 0.5 no warmup, ensure the final epoch is a spike. If not, select the seed or epoch count by checking `loss_last / median(prev 5) ≥ 2`, and log the retry), S5 (healthy backbone, fine-tune head only on 40% label noise for 3 epochs), S6 (augmentation + weight decay, early-stopped).
  4. `amrs scenarios build --all|--id S1 --profile tiny|cpu|full --seeds 0 1 2 --device auto`. Output to `artifacts/scenarios/<id>/seed<k>/`. Skip already built scenarios unless `--force`.
  5. `verify_scenario(id, seed)` checks that the scenario exhibits its intended symptom (for example S1 gap ≥ 0.15, S2 ECE ≥ 0.08 with accuracy equal to the pre-scaling accuracy, S3 accuracy drop ≥ 0.10 on shifted vs clean, S4 spike present, S5 probe gain ≥ 0.03, S6 gap < 0.10 and ECE < 0.05) and writes `verified.json`.
- **Deliverables.** `benchmark/scenarios.py`, `configs/scenarios/s1…s6.yaml`, CLI subcommand, built `tiny` artifacts in CI, documented build commands for `cpu` and `full`.
- **Acceptance criteria.** (1) `amrs scenarios build --all --profile tiny` completes in ≤ 2 minutes on CPU and every scenario passes `verify_scenario`. (2) Rebuilding with the same seed yields identical `final.pt` SHA-256 on CPU. (3) S2's accuracy before and after scaling is identical. (4) `meta.json` contains the ground-truth label for each scenario. (5) On `cpu` profile, each scenario builds in ≤ 5 minutes. (6) `full` profile instructions are validated once on Colab and the build time is recorded in `docs/runbook_gpu.md`.
- **Tests required.** Integration tests building each tiny scenario and asserting `verify_scenario` passes for seeds 0–2. Determinism test. Failure-path test (a scenario whose symptom is not reproduced raises `SCENARIO_NOT_REPRODUCED`).
- **Gaps/risks addressed.** G-12 (no ground truth), R-09 (synthetic realism), R-03.
- **Tag.** MVP
- **AGENT PROMPT.**
```
CONTEXT: You are working on AMRS (Adaptive Model Recovery System), a Python 3.11 + PyTorch framework in repo `amrs/` (src/amrs/). It diagnoses why a trained image classifier underperforms (overfitting, miscalibration, BN drift, instability, degraded head), tries cheapest-first recovery on a COPY, verifies on a holdout via a gate, and accepts or rolls back. Success metrics need a reproducible "scenario zoo" with known failure labels. Existing modules: metrics, data (splits, shifts, synthetic), models (registry, adapter, loader, zoo), config.

TASK: Implement src/amrs/benchmark/scenarios.py, configs/scenarios/s1_overfit.yaml ... s6_healthy.yaml, and CLI `amrs scenarios build --all|--id S1 --profile tiny|cpu|full --seeds 0 1 2 --device auto --force`. ScenarioSpec(id, arch, dataset, subset sizes, train recipe, ground_truth_label, shift config). Profiles: full (CIFAR-10 + resnet18_cifar), cpu (small_cnn on FashionMNIST/CIFAR subset, <=5 min/scenario), tiny (synthetic + small mlp/cnn, <=10 s, used by CI). train_model(spec,seed,out_dir) writes ckpt_epochNNN.pt, history.json (train_loss,train_acc,val_loss,val_acc per epoch), final.pt, meta.json (ground_truth_label, seed, config hash, sha256). S1 overfit: tiny train subset, no augmentation, many epochs. S2: train healthy then multiply head weight and bias by 2.5. S3: healthy model, spec carries shift config applied to val/holdout/target. S4: SGD lr 0.5, no warmup; ensure last epoch loss >= 2x median of previous 5 (retry by adjusting seed/epochs and log it). S5: healthy backbone, fine-tune head only for 3 epochs on 40% label noise. S6: augmentation + weight decay, early stopped. verify_scenario(id,seed) asserts the symptom (S1 gap>=0.15; S2 ECE>=0.08 and accuracy unchanged; S3 accuracy drop >=0.10 on shifted vs clean; S4 spike present; S5 head-probe gain>=0.03; S6 gap<0.10 and ECE<0.05) and writes verified.json; raise SCENARIO_NOT_REPRODUCED otherwise. Output under artifacts/scenarios/<id>/seed<k>/.
ACCEPTANCE: tiny profile builds all six in <=2 min on CPU and all verify; same seed gives identical final.pt sha256 on CPU; S2 accuracy identical before/after scaling; meta.json has ground-truth label.
TESTS: integration tests building each tiny scenario for seeds 0-2 and asserting verify; determinism test; failure-path test for SCENARIO_NOT_REPRODUCED. No network in tests.

RULES: additive changes only; do not break existing modules/tests; run `ruff check`, `mypy src`, `pytest -q`; fix failures; self-review against ACCEPTANCE.
REPORT BACK: (1) files created/modified, (2) test summary and build times, (3) acceptance checklist, (4) deviations, (5) open issues.
```


### 5.4 Department FE — Frontend Application & API Integration

**Purpose and ownership.** Builds the production-style browser application in Next.js, React, TypeScript and Tailwind CSS. Owns the UI routes, shared components, typed API client, query cache, form handling, loading/error states and end-to-end browser connection to FastAPI. It does not own ML computation or duplicate backend business rules. Team allocation: Manas owns page/component implementation (FE-1.1 and FE-2.1–FE-2.3); Manthan owns FE-1.2 and FE-2.4 because the proxy, API client, environment boundary and end-to-end connection are security/integration-critical.

**Dependencies.** PX-2.1 provides wireframes and UX copy. INF-1.1 provides repository tooling. BE must provide the endpoint/schema contract in Section 2.5 and connection rules in Section 4.6. ML/benchmark services provide real response data. FE provides tested browser flows and integration feedback to BE and QA.

#### Section FE-1: Web application foundation

##### FE-1.1 · Next.js App Router, TypeScript and Tailwind foundation
- **Description.** Create the independent Next.js frontend application and shared visual system. This explicitly replaces Streamlit.
- **Prerequisites.** PX-2.1; INF-1.1.
- **Implementation steps.**
  1. Create `apps/web` using the current stable Next.js App Router, React and TypeScript versions compatible with the selected Node LTS. Pin versions in `package.json` and commit the lockfile.
  2. Configure Tailwind CSS using the version-appropriate setup. Define design tokens for background/surface/text/border/status colors, spacing, radii, typography and responsive breakpoints.
  3. Add `app/layout.tsx`, `app/globals.css`, metadata, fonts and a responsive `AppShell` with persistent sidebar/topbar.
  4. Add route groups/pages: `/` (overview), `/runs/new` (Run Recovery), `/runs/[runId]` (Results/run detail), `/benchmarks`, `/monitor`, `/history`.
  5. Add shared components: `Button`, `Input`, `Select`, `FileDropzone`, `Card`, `DataTable`, `MetricCard`, `StatusBadge`, `Alert`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `ConfirmDialog`.
  6. Add `@tanstack/react-query`, `zod`, `react-hook-form` and `@hookform/resolvers`; configure providers in the root layout. Add Plotly.js React integration only for charts that have a defined backend data contract.
  7. Add lint, typecheck, unit test and production build scripts. Use server components by default; mark only interactive forms/charts/query components as client components.
- **Deliverables.** `apps/web/app/*`, `apps/web/components/*`, `apps/web/lib/providers.tsx`, `apps/web/package.json`, lockfile, Tailwind config/CSS, `apps/web/tsconfig.json`, `apps/web/next.config.ts`.
- **Acceptance criteria.** (1) `npm ci` and `npm run build` succeed from `apps/web`. (2) All required routes render. (3) TypeScript strict mode passes. (4) Layout works at 1440px, 1024px and 768px widths. (5) No Streamlit dependency or Streamlit app remains in the runtime.
- **Tests required.** Build/lint/typecheck; component tests for AppShell, navigation and status primitives; responsive smoke test.
- **Gaps/risks addressed.** G-UI-01 (old Streamlit stack), G-UI-02 (no frontend project structure), G-UI-03 (no responsive/accessibility baseline).
- **Tag.** MVP.
- **AGENT PROMPT.**
```
CONTEXT: You are building the AMRS frontend. AMRS is a model-recovery product whose browser workflow starts a FastAPI job, shows diagnosis and recovery progress, then displays verified accept/reject results. The approved frontend stack is Next.js App Router, React, TypeScript and Tailwind CSS. Streamlit is explicitly superseded and must not be used.

TASK: Inspect the existing repository before editing. Create or extend `apps/web` with Next.js App Router, strict TypeScript, Tailwind CSS, TanStack Query, Zod, React Hook Form and a Plotly React integration for real backend chart data. Implement the shared responsive AppShell and routes `/`, `/runs/new`, `/runs/[runId]`, `/benchmarks`, `/monitor`, `/history`. Create reusable accessible controls, metric/status cards, tables, empty/error/loading states and providers. Follow the approved UX spec. Use server components by default and client components only where interaction is needed. Do not fabricate metrics or implement ML logic in the browser.

FILES: `apps/web/**`, root workspace scripts only if necessary. Keep Python package code unchanged unless a cross-package integration change is essential. Additive changes only; do not delete or break existing work.

ACCEPTANCE: `npm ci`, lint, typecheck and production build pass; all routes render; responsive widths 1440/1024/768 work; no Streamlit runtime remains; all interactive controls have labels and keyboard focus. Add component tests, self-review all routes and fix errors before declaring done.

REPORT: (1) files created/modified, (2) commands and results, (3) route/component checklist, (4) deviations, (5) open issues.
```

##### FE-1.2 · Same-origin API client, schemas and Next.js proxy
- **Description.** Implement the single supported connection path from browser to FastAPI, with typed contracts and normalized errors.
- **Prerequisites.** FE-1.1; BE API schemas and endpoint definitions; Section 4.6.
- **Implementation steps.**
  1. Add `apps/web/next.config.ts` rewrite `/api/:path*` → `${AMRS_API_INTERNAL_URL}/api/:path*`. Fail clearly at server startup/build if the internal URL is absent in deployed environments.
  2. Add `lib/api/client.ts` with `apiFetch`, JSON and multipart helpers, abort/timeout support, request ID propagation and normalized `ApiError`. Browser-facing base path is always `/api/v1`, relative to the current origin.
  3. Add typed functions in `lib/api/{health,config,scenarios,models,runs,monitor,benchmarks}.ts`. Keep endpoint strings in these modules only.
  4. Add request/response TypeScript interfaces and Zod schemas. Match Pydantic models and error envelope.
  5. Add TanStack Query keys and hooks; configure health polling and run/benchmark/replay polling as specified in Section 4.6.5.
  6. Add API client unit tests and contract fixtures based on real FastAPI OpenAPI schemas.
  7. Configure FastAPI CORS for direct dev testing only; normal browser traffic is same-origin through Next.js. Never put API secrets in `NEXT_PUBLIC_*`.
- **Deliverables.** `apps/web/next.config.ts`, `apps/web/lib/api/client.ts`, `errors.ts`, `types.ts`, operation modules, `lib/schemas/*`, `hooks/*`, query provider and `.env.example`.
- **Acceptance criteria.** (1) Browser calls `/api/v1/health` on port 3000 and receives FastAPI response. (2) Browser bundle contains no backend internal URL or API secret. (3) All errors normalize into `ApiError`. (4) Zod rejects malformed response payloads. (5) Query polling stops at terminal state.
- **Tests required.** API client tests for JSON, multipart, 4xx, 5xx, malformed JSON, timeout and abort; schema contract tests; Next.js rewrite integration test with a test FastAPI server.
- **Gaps/risks addressed.** G-API-01 (no connection design), G-API-02 (schema drift), G-API-03 (CORS/tunnel exposure), G-API-04 (unbounded polling).
- **Tag.** MVP.
- **AGENT PROMPT.**
```
CONTEXT: AMRS uses a Next.js + TypeScript + Tailwind browser app and a FastAPI/Pydantic backend at `/api/v1`. The backend owns all model, diagnosis, recovery, metric and gate logic. The browser must communicate through a same-origin proxy; do not expose FastAPI directly to public browsers.

TASK: Implement the Section 4.6 connection contract. Configure Next.js rewrite `/api/:path*` to the server-only `AMRS_API_INTERNAL_URL`; use relative `/api/v1` in browser code. Build a typed `apiFetch` client, multipart helper, normalized ApiError, Zod schemas, typed endpoint modules and TanStack Query hooks for health, scenarios, runs, monitor replay and benchmarks. Implement 15-second health refresh and 1.5-second active-job polling with terminal-state stop and bounded backoff. Add abort/timeout handling.

FILES: `apps/web/next.config.ts`, `apps/web/lib/api/**`, `apps/web/lib/schemas/**`, `apps/web/hooks/**`, providers and env examples; make minimal FastAPI CORS/config changes only if needed to support the documented proxy.

CONSTRAINTS: Never hardcode `localhost:8000` in browser code. Never expose `AMRS_API_INTERNAL_URL`, API keys, database paths or artifact paths to client bundles. No WebSockets in MVP. Do not duplicate backend business logic. Additive changes only.

ACCEPTANCE/TESTS: Browser request to `/api/v1/health` is same-origin and reaches FastAPI; JSON/multipart/error/abort/timeout tests pass; malformed payload is rejected; active-run polling stops on terminal status; no duplicate run mutation. Run lint, typecheck, tests and build; self-review and fix failures.

REPORT: files changed, endpoint coverage, test results, environment variables, deviations and open issues.
```

#### Section FE-2: Product workflows

##### FE-2.1 · Run Recovery and model/scenario intake
- **Description.** Implement the primary run creation experience using the API contract; no fake local run state.
- **Prerequisites.** FE-1.1, FE-1.2, `/config/defaults`, `/scenarios`, `/models/upload`, `/runs` backend routes.
- **Implementation steps.** (1) Fetch defaults and scenarios. (2) Provide scenario selection as the guaranteed MVP path. (3) Provide model upload only when `AMRS_ALLOW_UPLOAD` is enabled and show supported registry architectures. (4) Validate file size/type client-side and server-side. (5) Render resolved configuration and acceptance policy before Start. (6) Submit `POST /api/v1/runs`; handle 202, 409 and validation errors. (7) Navigate to `/runs/{run_id}`. (8) Prevent duplicate submissions and preserve form state on recoverable errors.
- **Deliverables.** `app/runs/new/page.tsx`, `components/run/*`, hooks and E2E tests.
- **Acceptance criteria.** User can start a scenario run and, when enabled, upload a compatible model; returned run ID is used for navigation; no duplicate job is created; all backend errors are actionable.
- **Tests required.** Scenario flow, upload success/failure/disabled, 409 conflict, 422 validation and Playwright run creation.
- **Gaps/risks addressed.** G-API-05 (UI/backend intake mismatch), G-UI-04 (duplicate submit).
- **Tag.** MVP.
- **AGENT PROMPT.**
```
CONTEXT: AMRS is a Next.js App Router frontend for a FastAPI model-recovery backend. The core flow is choose a reproducible scenario or upload an approved state_dict, review resolved config, create a job and navigate to its run detail page. The backend is authoritative.

TASK: Implement `/runs/new` with scenario picker, config preview, acceptance-policy summary and guarded model upload. Fetch scenarios/defaults via the typed API modules. Upload using multipart only when upload capability is enabled. Create run with the documented POST request, handle 202/409/422/413/415, prevent double submission and route to `/runs/{run_id}`. Preserve form data after validation failures. Do not add a dataset upload flow unless its backend endpoint is implemented.

FILES: `apps/web/app/runs/new/**`, `components/run/**`, related hooks/types/tests.

RULES: No fabricated scenario data or local fake job. Do not bypass API validation. Additive changes only.

ACCEPTANCE: scenario run completes creation; optional model upload works only when enabled; duplicate clicks cannot create duplicate jobs; errors are field-specific; keyboard and responsive checks pass. Run tests/build, self-review and fix issues.

REPORT: files, API calls, acceptance checklist, tests and open issues.
```

##### FE-2.2 · Run progress, results and artifact downloads
- **Description.** Render job lifecycle and actual diagnosis/candidate/gate data.
- **Prerequisites.** FE-1.2, FE-2.1 and backend run detail/cancel/artifact endpoints.
- **Implementation steps.** (1) Implement `/runs/[runId]`. (2) Poll run detail while queued/running; stop at succeeded/failed/cancelled. (3) Render progress stage and event history. (4) Show diagnosis evidence, eligible/skip strategy reasons, per-candidate validation and holdout metrics, paired-bootstrap CI, compute and final verdict. (5) Clearly distinguish validation/selection metrics from holdout gate metrics. (6) Add cancel action and confirmation. (7) Download accepted model/report only through allowlisted artifact route. (8) Handle missing run, stale run, API offline and process-restart failure.
- **Deliverables.** `app/runs/[runId]/page.tsx`, result/diagnosis/candidate components, cancel/download hooks and E2E tests.
- **Acceptance criteria.** UI mirrors backend state; no client-side verdict inference; poll ends at terminal state; rejected run shows original retained; artifact download matches server bytes.
- **Tests required.** Accepted, rolled-back, healthy-no-action, failed and cancelled render tests; polling stop; cancel; 404; download; Playwright full flow.
- **Gaps/risks addressed.** G-API-06 (job state mismatch), G-UI-05 (misleading verdict), G-UI-06 (artifact path exposure).
- **Tag.** MVP.
- **AGENT PROMPT.**
```
CONTEXT: AMRS runs recovery jobs in FastAPI and exposes persisted run status, diagnosis, candidate evaluations and artifacts. Next.js is a presentation client only; it must never compute metrics or decide whether a candidate is accepted.

TASK: Implement `/runs/[runId]` with status polling, stage/progress timeline, diagnosis evidence, strategy eligibility and skip reasons, candidate comparison, bootstrap confidence intervals, compute usage, final accept/rollback/healthy/error verdict, cooperative cancel and allowlisted artifact downloads. Distinguish validation data used for candidate selection from holdout data used by the gate. Stop polling on terminal status.

FILES: `apps/web/app/runs/[runId]/**`, `components/results/**`, `components/diagnosis/**`, hooks and tests.

RULES: Render only API-returned values. Never infer verdict from metric values. Never build filesystem paths. Do not claim a cancel completed until API reports it. Additive changes only.

ACCEPTANCE/TESTS: all five terminal outcomes render correctly; poll stops; cancel is cooperative; downloads use allowlisted routes; 404/offline/error states are actionable; Playwright covers a full accepted and rolled-back run. Run lint/type/tests/build, self-review and fix failures.

REPORT: files, states covered, tests and remaining integration issues.
```

##### FE-2.3 · Benchmarks, live monitor and history
- **Description.** Complete remaining web pages against real API resources.
- **Prerequisites.** FE-1.2; benchmark and monitor endpoints; run list endpoint.
- **Implementation steps.** (1) Benchmarks page starts and reads benchmark jobs, compares methods/scenarios/seeds and charts accuracy/ECE/retention/compute/time. (2) Monitor page starts replay and renders metric series/events/trigger markers. (3) History page filters and paginates runs, opens detail pages. (4) Every chart includes text summary, units, legend and empty/error states. (5) Do not show a live-monitor control if only replay is implemented.
- **Deliverables.** `app/benchmarks/page.tsx`, `app/monitor/page.tsx`, `app/history/page.tsx`, chart/table components and tests.
- **Acceptance criteria.** All values come from API; benchmark/replay polling stops at terminal state; filters and navigation work; chart labels identify metric, units, scenario and seed.
- **Tests required.** API hook tests, chart data mapping tests, empty/error states and Playwright page navigation.
- **Gaps/risks addressed.** G-UI-07 (dashboard breadth), G-API-07 (monitor replay vs live ambiguity).
- **Tag.** MVP.
- **AGENT PROMPT.**
```
CONTEXT: AMRS includes FastAPI resources for benchmark jobs, monitor replay and run history. The approved UI is Next.js + TypeScript + Tailwind; Plotly charts must display backend-computed results only.

TASK: Implement `/benchmarks`, `/monitor` and `/history`. Benchmarks: select scenarios/seeds/methods, start benchmark, poll status and display accuracy/ECE/NLL/retention/compute/wall time. Monitor: start a recorded replay, poll and display metric series plus trigger events; label it as replay, not live production monitoring. History: filter/paginate runs and link to detail. Include loading/empty/error states and accessible chart text summaries.

FILES: corresponding `apps/web/app` routes, components, hooks and tests.

RULES: No mock values, no client-side metrics, no unsupported live controls. Additive changes only.

ACCEPTANCE: pages use real API resources, status polling stops correctly, chart units/labels are complete, filters/navigation work, responsive and keyboard checks pass. Run lint/type/tests/build, self-review and fix issues.

REPORT: files, endpoint mapping, tests, deviations and open issues.
```

##### FE-2.4 · Browser integration and release verification
- **Description.** Prove the real browser-to-FastAPI connection and main product journey.
- **Prerequisites.** FE-1.1–FE-2.3, BE endpoints and QA E2E environment.
- **Implementation steps.** (1) Start API and web using documented commands. (2) Verify rewrite proxy and browser network requests. (3) Run Playwright from scenario selection through result and artifact download. (4) Cover API offline, 422, 409, cancellation and terminal states. (5) Verify Docker service DNS and Colab tunnel topology. (6) Record test results and known limitations.
- **Deliverables.** `apps/web/tests/e2e/*`, root Playwright config, `docs/frontend-integration.md`, updated runbook.
- **Acceptance criteria.** Browser makes same-origin requests only; full run succeeds; API offline state is handled; Docker and Colab topology pass; no frontend route depends on Streamlit.
- **Tests required.** Playwright full workflow, API proxy integration, Docker health/proxy test, offline/error path tests.
- **Gaps/risks addressed.** All G-API and G-UI items.
- **Tag.** MVP.
- **AGENT PROMPT.**
```
CONTEXT: AMRS consists of a Next.js + Tailwind web app and FastAPI backend. The browser uses same-origin `/api/v1` requests; Next.js rewrites them to the private FastAPI service. Jobs are asynchronous and status is polled.

TASK: Add and run browser integration tests proving the real connection from UI to FastAPI. Cover health, scenarios, run creation (202), active-run conflict (409), run polling, terminal state, cancellation, artifact download, validation errors, backend offline and Docker internal URL. Assert browser requests do not target localhost:8000. Document the exact local, Docker and Colab environment variables and startup sequence in `docs/frontend-integration.md`.

FILES: Playwright configuration/tests, integration docs and only necessary frontend proxy fixes.

RULES: Test real API behavior; do not mock the entire backend for the primary E2E path. Do not expose FastAPI publicly in Colab. Additive changes only.

ACCEPTANCE: end-to-end flow passes; same-origin rule passes; Docker proxy and Colab topology are documented/tested; offline and failure states pass. Run test suite, self-review and fix errors.

REPORT: exact commands, test outcomes, files changed, known limits and release recommendation.
```



### 5.5 Department BE — Backend API, orchestration and persistence

**Purpose.** Expose the AMRS domain engine through a stable FastAPI contract, persist run state, and provide safe job/artifact lifecycle operations. Aayush owns the domain handlers and persistence implementation. Manthan owns the security-sensitive API boundary and execution lifecycle listed below. This section is a v1.2 implementation specification added because the source plan named BE but did not include its detailed build parts.

#### BE-1 · API schemas and ordinary resource handlers
- **DRI:** Aayush. **Contract/security reviewer:** Manthan.
- Implement Pydantic v2 request/response models for health, config defaults, scenarios, run listing/detail, monitor replay and benchmark resources. Match Section 2.5 and the canonical mapping in Section 4.6.
- Keep route handlers thin: validate request, call a domain/service function, persist state and return the documented response. Do not place ML algorithms in FastAPI route functions.
- Publish and test the OpenAPI schema. Changes to endpoint names, status codes, payload fields or error envelopes require a coordinated update to the frontend types/Zod schemas before merge.
- **Acceptance:** OpenAPI contains all implemented routes; schema tests pass; 4xx/5xx responses use the documented error envelope; no endpoint returns placeholder/demo values as real results.

#### BE-2 · Run store, history and benchmark persistence
- **DRI:** Aayush.
- Implement SQLite repositories and migrations/schema initialization for runs, diagnosis reports, candidate evaluations, gate decisions, monitor events and benchmark results as specified in Section 2.4.
- Add repository/service separation, transaction boundaries, pagination/filtering for history, and deterministic serialization of config and result records.
- **Acceptance:** repository tests cover create/read/update/list, pagination, restart persistence, transaction rollback and malformed stored records; database access is not embedded in UI or ML algorithm modules.

#### BE-3 · Job lifecycle, worker isolation and cancellation
- **DRI:** Manthan (security-sensitive execution boundary); Aayush implements service adapters and persistence integration under that contract.
- Define explicit states (`queued`, `running`, `succeeded`, `failed`, `cancel_requested`, `cancelled`) and legal transitions. Persist progress events and terminal errors.
- Execute long-running recovery/benchmark work outside the request-response thread. Bound concurrency, runtime, memory and upload size. Cancellation is cooperative and must never report `cancelled` until the worker confirms it has stopped or reached a safe checkpoint.
- Do not accept arbitrary shell commands, Python module paths or user-controlled executable arguments from the web API. Local CLI custom-module support is separate from hosted dashboard upload.
- **Acceptance:** state-transition tests, duplicate-submit/conflict tests, timeout tests, worker-crash recovery tests and cancellation tests pass; one run cannot mutate another run's files or state.

#### BE-4 · Model upload, artifact access and API hardening
- **DRI:** Manthan. **Implementation support:** Aayush for storage adapters; Manas for UI validation states.
- Accept only documented model-registry identifiers and `state_dict` uploads. Enforce size limits, extension/content checks, generated server-side filenames, isolated per-run storage and `torch.load(weights_only=True)`. Never load arbitrary pickled model objects from dashboard uploads.
- Resolve model architecture only through the allowlisted registry. Reject path traversal, symlinks and unsupported file types. Store original weights immutably and compute a cryptographic hash before execution.
- Serve artifacts only by opaque run/artifact identifiers through an allowlist. Never accept a filesystem path from the browser or return internal storage paths. Prevent cross-run artifact access.
- Keep `AMRS_API_INTERNAL_URL`, secrets and storage paths server-side. Expose only the Next.js service through a public tunnel; FastAPI remains private. Apply request-size limits, timeouts, safe error messages and structured audit logs without secrets.
- **Acceptance:** tests cover traversal, absolute paths, symlink attempts, oversized uploads, invalid formats, unknown architectures, malicious filenames, cross-run artifact IDs and secret leakage. A security review by Manthan is required before merge.

#### BE-5 · Verification gate and holdout-data integrity
- **DRI:** Manthan. **Algorithm implementation support:** Aayush.
- Enforce the acceptance policy on the backend only. The frontend must never calculate or override an `ACCEPT`/`REJECT` verdict.
- Keep `holdout` inaccessible to diagnosis, strategy selection and hyperparameter/threshold tuning. Candidate selection uses validation data; the gate evaluates the frozen candidate against holdout exactly as defined in the approved policy. Record the policy version, data/split identifiers, seed, metrics, confidence interval and reason codes.
- Preserve the original model as immutable input; candidate weights are separate copies. On rejection or failure, return the original model artifact and a machine-readable rollback reason.
- **Acceptance:** tests prove the holdout is not passed into candidate selection; original checkpoint hash is unchanged; a rejected candidate cannot become the output; gate results are reproducible for a fixed seed/config; policy changes are versioned and auditable.

#### BE-6 · CLI, service wiring and operational runbook
- **DRI:** Aayush for CLI/domain wiring; Manthan for deployment/environment and release-critical wiring.
- Wire `amrs diagnose`, `amrs recover`, `amrs monitor-replay`, `amrs benchmark` and `amrs scenarios build` to the same service/domain layer used by FastAPI. Avoid separate, divergent implementations.
- Document local startup, Docker startup, Colab startup, environment variables, health checks, data/artifact directories and recovery from interrupted jobs.
- **Acceptance:** CLI smoke tests and API integration tests execute the same core service; a clean clone can start the stack by following the runbook; no private backend port is exposed by the Colab tunnel.


### 5.6 Department ML — Core Recovery Engine

**Purpose.** Implement the domain logic that diagnoses a supported classifier, selects eligible recovery methods, creates isolated candidate models, and hands candidates to the backend-owned verification gate. Aayush is the DRI for algorithm implementation. Manthan is the required reviewer for any code that touches holdout data, model immutability, candidate acceptance or artifact boundaries.

**Shared implementation contract.** Every strategy implements the common `RecoveryStrategy` interface in `recovery/base.py`: `name`, `is_applicable(model, context) -> Applicability`, `estimate_cost(context) -> CostEstimate`, and `apply(model_copy, context) -> StrategyResult`. The context contains only the data and metadata permitted for that strategy. Strategies must not receive the holdout loader. Every result records parameters, seed, elapsed time, compute-meter deltas, warnings and artifact metadata. Strategy implementations must be deterministic for a fixed seed/config where the underlying operations permit it.

**Dependencies.** DM-1 through DM-4, INF-1.2 and PX-1.1. ML-1 through ML-8 can be implemented in parallel after their shared interfaces are frozen; ML-9 integrates them.

#### Section ML-1: Diagnosis engine

##### ML-1.1 · Evidence-based multi-label diagnosis
- **DRI:** Aayush. **Reviewer:** Manthan.
- **Description.** Convert the exact rules in Section 2.8 into a deterministic diagnosis service. The diagnosis stage must not inspect holdout data.
- **Implementation steps.**
  1. Define typed `DiagnosisLabel`, `DiagnosisEvidence`, `DiagnosisItem` and `DiagnosisReport` schemas in `schemas.py`. Each item includes label, confidence in `[0,1]`, evidence values, threshold values, source split and human-readable explanation.
  2. Implement one pure rule function per label: overfitting, miscalibration, BN drift, instability and head degradation. Keep thresholds in validated config; do not duplicate numeric defaults in code.
  3. Implement required supporting analyses: train/validation metric gap, optional history trend, ECE and temperature-fit diagnostic, BN running-stat divergence, loss spike/CV, and frozen-feature logistic-regression probe.
  4. Treat unavailable evidence as `not_evaluable` with a reason, not as a zero score. For example, instability cannot be evaluated without training history; BN drift cannot be evaluated without BN layers and target/validation inputs.
  5. Rank multi-label diagnoses by confidence and apply the tie-break order in Section 2.8. If no rule fires, return `healthy`.
  6. Serialize the full evidence trail; do not return only a label.
- **Deliverables.** `diagnosis/engine.py`, `diagnosis/rules.py`, `diagnosis/probes.py`, schemas and unit tests.
- **Acceptance criteria.** Each of S1–S5 fires its expected primary label on the tiny scenario profile; S6 is healthy or has no actionable diagnosis. Every fired rule includes measured value, configured threshold and evidence source. Missing history/BN support produces explicit non-evaluable evidence. Repeated runs with the same inputs/config produce identical labels and confidence values.
- **Tests required.** One positive and one negative test per rule; boundary tests at threshold equality; missing-evidence tests; multi-label ordering/tie-break test; no-holdout-access test.
- **Tag.** MVP
- **AGENT PROMPT.**
```text
CONTEXT: AMRS is a PyTorch image-classifier recovery system. It diagnoses failure modes using train/validation evidence, then selects cheap recovery methods. Holdout is reserved exclusively for the verification gate and must never enter diagnosis.

TASK: Implement the diagnosis schemas and modules described in Section ML-1. Follow the exact rules and thresholds in Sections 2.7 and 2.8. Implement each diagnosis as a separately testable rule. Include evidence, threshold, split provenance, confidence, and explicit not_evaluable reasons. Use the existing ModelAdapter and metrics modules. Do not change the approved formulas without raising an ADR.

ACCEPTANCE: S1-S5 tiny scenarios produce their expected primary labels; S6 is healthy/no-action; threshold boundaries, missing history, missing BN layers, multi-label ranking and deterministic output are tested; diagnosis has no reference to holdout.

RULES: Do not implement recovery strategies in this task. Keep route/API code out of the diagnosis package. Run ruff, mypy and pytest. Do not weaken holdout isolation.
REPORT: files changed, formulas implemented, test results, scenario diagnosis table, deviations and unresolved issues.
```

#### Section ML-2: Strategy eligibility and cost-first selection

##### ML-2.1 · Rule-to-strategy mapping and budget enforcement
- **DRI:** Aayush. **Reviewer:** Manthan.
- **Description.** Implement the mapping in Section 2.9, checking prerequisites and ordering eligible methods by estimated compute cost.
- **Implementation steps.**
  1. Define `StrategyRegistry`, `StrategyCandidate`, `Applicability` and `SelectionReport`.
  2. Map every diagnosis label to the exact eligible methods in Section 2.9. For multi-label reports, merge eligible methods and deduplicate them while retaining the diagnosis reasons that made each method eligible.
  3. Check prerequisites before scheduling: checkpoint history, identifiable head, BN layers, target/validation inputs and architecture capabilities.
  4. Estimate cost from parameter count, expected batches, gradient steps and strategy-specific constants. Mark estimates as estimates; record actual cost after execution.
  5. Sort by ascending estimated cost with a stable deterministic tie-break (strategy name), then enforce `max_candidates` and `max_compute_ratio_vs_retrain`.
  6. Record skipped methods and reasons such as `NO_HISTORY`, `NO_BN_LAYERS`, `NO_IDENTIFIABLE_HEAD`, `MISSING_TARGET` and `BUDGET_EXCEEDED`.
- **Deliverables.** `selector/selector.py`, cost estimator and selector tests.
- **Acceptance criteria.** All mappings match Section 2.9 exactly; prerequisites prevent invalid execution; order is stable; candidate and compute budgets are enforced; every skipped strategy has a machine-readable reason.
- **Tests required.** Table-driven tests for every diagnosis, multi-label deduplication, missing prerequisites, equal-cost ordering and budget exhaustion.
- **Tag.** MVP
- **AGENT PROMPT.**
```text
TASK: Implement AMRS strategy registry and selector. Use Section 2.9 as the only diagnosis-to-strategy mapping. Merge multi-label eligibility, check strategy prerequisites, estimate cost, sort cheapest-first with deterministic tie-breaks, and enforce candidate/compute budgets. Return a complete SelectionReport including skipped strategies and reason codes.

ACCEPTANCE: mapping tests cover every diagnosis; no strategy runs without prerequisites; deterministic ordering is proven; max_candidates and compute-ratio budgets are enforced; skip reasons are exposed.

RULES: Do not execute strategies here and do not access holdout. Reuse validated config and the common strategy interface. Run ruff, mypy and pytest.
REPORT: implementation summary, mapping table, test results, cost-estimation assumptions and open issues.
```

#### Section ML-3: Temperature scaling

##### ML-3.1 · Calibration-only recovery
- **DRI:** Aayush. **Reviewer:** Manthan.
- **Description.** Fit one scalar temperature on validation logits and apply it to a copied model's output logits. This changes calibration without changing predicted class ordering.
- **Implementation steps.**
  1. Implement `TemperatureScalingStrategy` using a positive scalar parameterized as `softplus(raw_T)` or an equivalent positive constraint.
  2. Fit T by minimizing validation NLL only, with `max_iter` from config. Do not use holdout logits to fit T.
  3. Wrap the model with a calibration module or persist a small calibration artifact; do not silently alter the classifier's learned weights.
  4. Report before/after validation ECE and NLL, fitted T, optimizer convergence and whether top-1 predictions changed (they should not, apart from numerical ties).
  5. Let the verification gate decide whether ECE improvement is statistically supported and secondary metrics remain within tolerance.
- **Deliverables.** `recovery/temperature.py`, calibration serialization and tests.
- **Acceptance criteria.** T is finite and positive; validation NLL does not increase beyond numerical tolerance after successful fitting; top-1 predictions are unchanged on non-tied logits; no holdout data is consumed.
- **Tests required.** Synthetic overconfidence example, already-calibrated example, degenerate logits, convergence failure and serialization round-trip.
- **Tag.** MVP
- **AGENT PROMPT.**
```text
TASK: Implement TemperatureScalingStrategy. Fit a single positive temperature on validation logits by minimizing NLL; never fit on holdout. Preserve the original model and represent calibration as a serializable wrapper/artifact. Record T, optimizer status and validation metrics.

ACCEPTANCE: T is finite/positive; an intentionally overconfident model improves validation calibration; non-tied top-1 predictions remain unchanged; degenerate inputs fail safely; serialization round-trips.

RULES: Use config.max_iter. Do not evaluate or fit against holdout. Strategy must conform to RecoveryStrategy and report compute/time. Run ruff, mypy and pytest.
REPORT: files changed, calibration results on fixtures, test outcomes and limitations.
```

#### Section ML-4: BatchNorm recalibration

##### ML-4.1 · Running-statistics recalibration
- **DRI:** Aayush. **Reviewer:** Manthan.
- **Description.** Recompute BatchNorm running means/variances using permitted unlabeled target inputs (or validation inputs when target is absent), without gradient updates.
- **Implementation steps.**
  1. Detect BatchNorm modules through `ModelAdapter`; return `NO_BN_LAYERS` if none exist.
  2. Deep-copy the original model. Reset or selectively update running statistics according to the configured policy; preserve affine weights and biases.
  3. Put the model in training mode only for BatchNorm-stat updates while disabling gradient computation and preventing dropout/other training-only layers from changing behavior. Restore module modes afterward.
  4. Iterate at most `max_batches`; record the data source, sample count and updated layer count. Never use labels or holdout.
  5. Validate the candidate on `val`; leave acceptance to the gate.
- **Deliverables.** `recovery/bn_recal.py` and tests.
- **Acceptance criteria.** BN running statistics change when target distribution differs; affine parameters remain unchanged; non-BN parameters remain unchanged; model modes are restored; no-gradient behavior is verified.
- **Tests required.** BN model with shifted synthetic inputs, model without BN, empty target, batch limit, dropout mode restoration and parameter immutability.
- **Tag.** MVP
- **AGENT PROMPT.**
```text
TASK: Implement BNRecalibrationStrategy. Operate on a deep copy. Recompute only BatchNorm running statistics from target data, falling back to validation data only when the configured policy allows it. Do not use labels, gradients or holdout. Preserve affine parameters and all non-BN parameters; restore module training/eval states.

ACCEPTANCE: running stats update on shifted data; all learned parameters remain unchanged; no-BN and empty-data cases return explicit skip/failure reasons; max_batches is honored; mode restoration is tested.

RULES: No optimizer step. No holdout access. Use ModelAdapter and ComputeMeter. Run ruff, mypy and pytest.
REPORT: changed files, tests, parameter-diff evidence and limitations.
```

#### Section ML-5: Checkpoint reversion and averaging

##### ML-5.1 · Historical checkpoint candidates
- **DRI:** Aayush. **Reviewer:** Manthan.
- **Description.** Produce candidates from supplied training checkpoints, using validation-only ranking and compatible tensor averaging.
- **Implementation steps.**
  1. Validate that checkpoint architecture, tensor keys and shapes match the registry model.
  2. For reversion, evaluate eligible historical checkpoints on `val`, rank by the configured primary validation metric and return the best eligible checkpoint (top-K search).
  3. For averaging, select the configured last-K compatible checkpoints and average floating-point tensors. Copy non-floating buffers using a documented deterministic rule; BatchNorm statistics must be handled consistently (prefer recalibration after averaging when supported).
  4. Reject checkpoints with non-finite tensors or incompatible metadata. Never overwrite the original or source checkpoints.
  5. Record selected checkpoint IDs, epoch range, validation scores and averaging policy.
- **Deliverables.** `recovery/checkpoints.py` and tests.
- **Acceptance criteria.** Reversion selects the best validation checkpoint; averaging is deterministic and shape-safe; source checkpoint hashes remain unchanged; incompatible or non-finite checkpoints are skipped with reasons.
- **Tests required.** Known best checkpoint, tensor averaging arithmetic, integer/buffer handling, architecture mismatch, NaN/Inf and source immutability.
- **Tag.** MVP
- **AGENT PROMPT.**
```text
TASK: Implement checkpoint_reversion and checkpoint_averaging strategies. Rank historical checkpoints using validation only. Average compatible floating tensors over the configured last-K set; define deterministic handling for non-floating buffers and BatchNorm statistics. Do not mutate source checkpoints or original model.

ACCEPTANCE: known-best reversion fixture is selected; averaging matches expected tensor arithmetic; incompatible/non-finite checkpoints are skipped with reason codes; deterministic output and source-hash immutability are tested.

RULES: No holdout access. All candidate models are independent copies. Use atomic artifact writes and record checkpoint provenance. Run ruff, mypy and pytest.
REPORT: strategy behavior, tests, buffer policy, deviations and limitations.
```

#### Section ML-6: Last-layer fine-tuning

##### ML-6.1 · Head-only recovery
- **DRI:** Aayush. **Reviewer:** Manthan.
- **Description.** Fine-tune only the identifiable classification head while freezing the backbone.
- **Implementation steps.**
  1. Use `ModelAdapter` to identify the head and its parameters; skip if the head is ambiguous.
  2. Deep-copy the model, freeze all parameters, unfreeze only head parameters, and verify the optimizer parameter list contains no backbone tensors.
  3. Train for configured epochs/lr/weight decay using `train`; use `val` only for early stopping/model selection if explicitly enabled.
  4. Save the best validation checkpoint and report gradient steps, examples processed and compute units.
  5. Record before/after validation metrics and parameter-diff summary.
- **Deliverables.** `recovery/last_layer.py` and tests.
- **Acceptance criteria.** Only head parameters change; backbone is byte-identical; the optimizer contains only head parameters; deterministic seed/config behavior; invalid head is skipped.
- **Tests required.** Synthetic degraded-head scenario, frozen-backbone assertions, optimizer parameter audit, early-stop behavior and non-finite loss.
- **Tag.** MVP
- **AGENT PROMPT.**
```text
TASK: Implement LastLayerFineTuneStrategy. Deep-copy the model, freeze the backbone, train only the adapter-identified classification head using train data, and optionally select the best epoch using validation. Read epochs/lr/weight_decay from config. Record compute and parameter changes.

ACCEPTANCE: only head tensors change; backbone tensors remain identical; optimizer includes head parameters only; S5 tiny fixture demonstrates measurable validation recovery; bad loss/head ambiguity fails safely.

RULES: Do not pass holdout into the strategy. Do not mutate the original. Run ruff, mypy and pytest.
REPORT: implementation details, parameter-diff test, fixture results and limitations.
```

#### Section ML-7: Selective fine-tuning with L2-SP

##### ML-7.1 · Targeted backbone adaptation
- **DRI:** Aayush. **Reviewer:** Manthan.
- **Description.** Unfreeze only the top-N layer groups and regularize weights toward the original model to reduce catastrophic forgetting.
- **Implementation steps.**
  1. Deep-copy the original and use `ModelAdapter.layer_groups()` to select the top-N groups plus the head.
  2. Freeze all other parameters. Capture original parameter tensors as immutable L2-SP anchors.
  3. Implement the objective `task_loss + alpha * Σ ||θ_selected − θ_original||²`, with alpha and optimizer settings from config.
  4. Train on `train`; use validation for early stopping and candidate selection only. Keep augmentation controlled by the scenario/config.
  5. Record selected groups, trainable parameter count, L2-SP contribution, gradient steps and compute units.
- **Deliverables.** `recovery/selective_ft.py`, `recovery/l2sp.py` and tests.
- **Acceptance criteria.** Only selected groups/head change; unselected parameters remain identical; regularization term is zero at initialization and grows only as selected weights move; memory use is bounded; non-finite candidates are rejected.
- **Tests required.** L2-SP formula against a hand calculation, layer-group selection, frozen-parameter audit, zero-initialization penalty and S1 recovery smoke test.
- **Tag.** MVP
- **AGENT PROMPT.**
```text
TASK: Implement selective fine-tuning with L2-SP. Select top-N layer groups plus the head via ModelAdapter. Freeze all other weights. Anchor selected parameters to the original checkpoint and optimize task_loss + alpha * sum((parameter - original_parameter)^2). Train on train; use validation for early stopping only. Read settings from configs/default.yaml.

ACCEPTANCE: L2-SP matches a hand calculation; penalty is zero at initialization; only selected parameters change; unselected parameters remain identical; candidate is finite and compute is metered.

RULES: Never mutate original anchors; no holdout access. Run ruff, mypy and pytest.
REPORT: selected groups, trainable parameter count, test outcomes and limitations.
```

#### Section ML-8: Weight interpolation

##### ML-8.1 · Interpolation candidate search
- **DRI:** Aayush. **Reviewer:** Manthan.
- **Description.** Search configured interpolation coefficients between the original weights and a fine-tuned candidate, selecting by validation metric.
- **Implementation steps.**
  1. Require identical architecture, tensor keys and shapes for original and fine-tuned candidate.
  2. For each configured alpha, construct `θ(α) = (1−α)θ_original + αθ_candidate` for floating tensors. Apply the documented buffer policy to non-floating and BatchNorm buffers.
  3. Evaluate each interpolated model on validation data only and select the best candidate according to the diagnosis primary metric.
  4. Record alpha, validation metrics, tensor compatibility and buffer policy. The selected candidate still must pass the independent verification gate.
- **Deliverables.** `recovery/interpolation.py` and tests.
- **Acceptance criteria.** Alpha 0 exactly reproduces original floating weights; alpha 1 reproduces candidate weights; intermediate values match hand calculations; incompatible models are rejected; validation selection is deterministic.
- **Tests required.** Boundary alpha, intermediate arithmetic, buffer handling, mismatch and validation ranking.
- **Tag.** MVP
- **AGENT PROMPT.**
```text
TASK: Implement WeightInterpolationStrategy. Interpolate compatible floating tensors between immutable original and fine-tuned candidate for each configured alpha. Use validation-only scoring to select the candidate. Document and test non-floating/BatchNorm buffer handling.

ACCEPTANCE: alpha 0/1 reproduce endpoints; intermediate tensors match exact arithmetic; shape/key mismatches fail with a reason; selected alpha is validation-optimal and deterministic.

RULES: Never access holdout. Never mutate source models. The verification gate, not this strategy, decides acceptance. Run ruff, mypy and pytest.
REPORT: implementation, buffer policy, tests and limitations.
```

#### Section ML-9: Orchestration and live monitor integration

##### ML-9.1 · Recovery pipeline and callback
- **DRI:** Aayush for domain orchestration and callback; **Manthan** for immutable-original, cancellation and verification-gate integration.
- **Description.** Connect diagnosis, selection, strategy execution, validation shortlisting, backend gate evaluation and rollback. Implement the callback used during live training.
- **Implementation steps.**
  1. Implement `pipeline/orchestrator.py` as a domain service independent of FastAPI. It accepts a model/data/config bundle and emits structured stage events.
  2. Hash and preserve the original checkpoint. For each selected strategy, create a fresh copy of the original (or the documented parent candidate for interpolation), execute it, check finite weights/outputs and score on validation.
  3. Pass only shortlisted frozen candidates to the verification-gate service. The gate is a backend-owned boundary and is the only component allowed to inspect holdout.
  4. Stop on first accepted candidate in `first_accept` mode; otherwise honor `best_of_all`. On rejection, cancellation or error, produce the original checkpoint as the output artifact.
  5. Implement `AMRSCallback` with EMA smoothing, patience, cooldown and configured `log`, `early_stop` or `recover` actions. Callback recovery must snapshot safely and must not run concurrently with an active recovery job.
  6. Emit progress events with stable stages and percentages; persist stage timings, strategy attempts, monitor events and terminal verdict.
- **Deliverables.** `pipeline/orchestrator.py`, `monitor/callback.py`, `monitor/detectors.py`, integration tests and event schema.
- **Acceptance criteria.** End-to-end tiny S1–S6 runs produce a terminal state and complete report; S6 retains byte-identical original; rejected candidates never become output; cancellation stops at a safe boundary; monitor triggers only after patience and outside cooldown; all events are ordered and attributable to a run ID.
- **Tests required.** Full pipeline happy path, all-candidate rejection, strategy exception, cancellation, crash/restart recovery, healthy no-action, monitor patience/cooldown and duplicate-trigger prevention.
- **Tag.** MVP
- **AGENT PROMPT.**
```text
TASK: Implement the AMRS domain orchestrator and live-training callback. Orchestrator order: intake/hash original -> data contract -> diagnosis -> selector -> candidate copy/strategy -> validation shortlist -> backend verification gate -> accept or byte-identical rollback -> persist report/artifacts. Emit progress events and support cooperative cancellation. Implement EMA/patience/cooldown monitor actions log, early_stop and recover.

ACCEPTANCE: tiny S1-S6 end-to-end tests; S6 no-action preserves original hash; rejected/failed/cancelled runs output original; candidate errors do not corrupt the run; monitor patience/cooldown tests pass; progress is monotonic and terminal state is unique.

RULES: Keep this service independent of FastAPI. Do not let the orchestrator bypass the gate or expose holdout to strategies. Coordinate gate calls with Manthan. Run ruff, mypy and pytest.
REPORT: sequence diagram or flow summary, test outcomes, artifacts, known failure modes and deviations.
```

#### Section ML-10: Transformer adapter recovery (Post-MVP)

##### ML-10.1 · Hugging Face PEFT/LoRA extension
- **DRI:** Aayush. **Reviewer:** Manthan.
- **Description.** Post-MVP extension for supported Hugging Face transformer classifiers using PEFT/LoRA adapters. This is not required for the hackathon MVP.
- **Implementation steps.**
  1. Define a separate `TransformerModelAdapter` contract; do not force transformer modules into assumptions made by the CNN adapter.
  2. Support a small allowlist of model architectures and PEFT target modules. Load base models from trusted local/cache sources only.
  3. Train candidate adapters on train, select on validation and verify through the same gate abstraction.
  4. Track base-model revision, tokenizer/config hashes, adapter config and package versions.
- **Deliverables.** Separate adapter package, configuration examples, tests and a transformer scenario.
- **Acceptance criteria.** A documented transformer classifier can be loaded reproducibly; adapter training changes only adapter parameters; gate and rollback semantics remain identical to the MVP.
- **Tag.** Post-MVP
- **AGENT PROMPT.**
```text
TASK: Design and implement a separate Hugging Face PEFT/LoRA recovery adapter for classification. This is explicitly Post-MVP. Preserve the existing PyTorch classifier contract and verification gate. Restrict supported model families and target modules; record immutable base revision and adapter metadata.

ACCEPTANCE: adapter-only updates, reproducible load/save, train/validation/holdout separation and end-to-end gate compatibility are tested on a small transformer scenario.
RULES: Do not delay or destabilize MVP work. No arbitrary remote code loading. Run the complete existing suite plus transformer-specific tests.
REPORT: supported models, adapter design, benchmark evidence, dependency/security impact and limitations.
```

### 5.7 Department BM — Benchmarking and Evidence

**Purpose.** Demonstrate whether AMRS improves models more reliably or cheaply than reasonable alternatives. Benchmarks must be reproducible and must not tune AMRS against the final evaluation split. Aayush is the DRI; Manthan reviews split integrity, statistical analysis and claims.

**Dependencies.** DM-1–DM-4, ML-1–ML-9, PX-1.1 and BE-2 persistence.

#### Section BM-1: Baseline implementations

##### BM-1.1 · Comparable baseline methods
- **DRI:** Aayush. **Reviewer:** Manthan.
- **Implementation steps.**
  1. Implement common baseline interface `run_baseline(scenario, seed, budget, data_bundle) -> BaselineResult`.
  2. Add early stopping, regularized fine-tuning, full retraining and fixed-strategy recovery baselines as specified in Sections 2.1 and 3.2.
  3. Ensure each baseline receives equivalent training data and a comparable compute budget. Full retraining starts from the documented initialization; regularized fine-tuning uses a fixed, predeclared recipe.
  4. Use validation data for baseline selection. Evaluate final baseline artifacts once on the benchmark evaluation split, separate from any tuning split.
  5. Record all hyperparameters, seed, hardware/device, library versions, wall time, forward/backward samples and compute units.
- **Deliverables.** `benchmark/baselines.py`, baseline config files and tests.
- **Acceptance criteria.** All baselines run on tiny S1–S6 fixtures; each returns the common result schema; resource accounting is populated; no baseline receives privileged data unavailable to AMRS.
- **Tests required.** Interface conformance, budget enforcement, deterministic seeds, missing-data handling and no-holdout-tuning tests.
- **Tag.** MVP
- **AGENT PROMPT.**
```text
TASK: Implement comparable benchmark baselines: early stopping, regularized fine-tuning, full retraining and fixed-strategy recovery. Use a common BaselineResult schema and common compute/time accounting. Use train/validation for fitting and selection; reserve benchmark evaluation data for final scoring only.

ACCEPTANCE: all baselines execute on tiny scenarios, emit comparable metrics and resource use, obey budgets, and are deterministic for fixed seeds/configs.
RULES: No baseline-specific access to AMRS holdout. Do not tune baseline hyperparameters on the final evaluation split. Run ruff, mypy and pytest.
REPORT: baseline definitions, fairness assumptions, test results and deviations.
```

#### Section BM-2: Benchmark orchestration

##### BM-2.1 · Scenario/seed/method matrix runner
- **DRI:** Aayush. **Reviewer:** Manthan.
- **Implementation steps.**
  1. Implement a benchmark job that expands selected scenarios × seeds × methods into immutable trial specifications.
  2. Execute trials serially under the MVP single-worker policy. Persist status before execution and after each trial so interrupted benchmarks can be diagnosed.
  3. Reuse scenario artifacts only when their config hash, seed and data provenance match the requested trial.
  4. Store per-trial accuracy, NLL, ECE, retention, agreement, compute units, wall time, accepted status and failure reason.
  5. Aggregate mean, standard deviation and paired method deltas only after all requested trials finish; incomplete matrices must be clearly marked.
- **Deliverables.** `benchmark/runner.py`, benchmark schemas, persistence integration and CLI/API wiring.
- **Acceptance criteria.** A tiny matrix completes and persists every trial; reruns do not silently overwrite incompatible results; partial failures remain visible; aggregates match hand-computed fixtures.
- **Tests required.** Matrix expansion, resume behavior, partial failure, aggregation arithmetic, duplicate trial prevention and database restart persistence.
- **Tag.** MVP
- **AGENT PROMPT.**
```text
TASK: Implement the benchmark matrix runner for scenario × seed × method. Persist trial status and results, support safe resume, reuse only matching scenario artifacts, and aggregate mean/std and paired deltas. Integrate with the existing SQLite repository and CLI/API service layer.

ACCEPTANCE: tiny matrix completes; every requested trial is represented; partial failures are explicit; aggregates match hand calculations; restart/resume does not duplicate completed trials.
RULES: Respect the single-worker execution boundary and holdout/evaluation policy. Do not store model weights in SQLite. Run ruff, mypy and pytest.
REPORT: matrix schema, persistence behavior, test results and known limits.
```

#### Section BM-3: Statistical analysis and reporting

##### BM-3.1 · Benchmark evidence and claim validation
- **DRI:** Aayush. **Reviewer:** Manthan.
- **Implementation steps.**
  1. Calculate per-scenario/per-method mean ± standard deviation over seeds and paired differences where runs share scenario/seed.
  2. Report accuracy, ECE, NLL, retained-correct rate, compute units and wall time; never collapse them into an unexplained single score.
  3. Calculate gain-per-compute consistently and show the exact formula in the report.
  4. Mark missing trials and low seed counts. Do not describe three seeds as broad statistical proof.
  5. Generate machine-readable `benchmark.json` and human-readable Markdown/CSV summaries. Include config hash, environment and run IDs.
  6. Compare results against targets M1–M10 and state pass/fail/insufficient evidence for each.
- **Deliverables.** `benchmark/report.py`, report templates, benchmark summary artifacts and documentation.
- **Acceptance criteria.** Report values match stored trial records; missing data is never silently dropped; every chart/table has units and seed count; claims are traceable to run IDs/config hashes.
- **Tests required.** Aggregation/report snapshot tests, missing-trial handling, zero-compute edge case, gain-per-compute formula and deterministic serialization.
- **Tag.** MVP
- **AGENT PROMPT.**
```text
TASK: Implement benchmark aggregation and reporting. Report mean/std across seeds and paired deltas by scenario/method for accuracy, ECE, NLL, retention, compute units and wall time. Generate benchmark.json and benchmark.md (CSV optional), with run IDs, config hashes, environment, seed counts and M1-M10 target status.

ACCEPTANCE: reports reproduce stored values; missing trials and low sample counts are visible; units and formulas are explicit; no unsupported claim of statistical certainty is made.
RULES: Do not alter raw benchmark records or cherry-pick seeds. Run ruff, mypy and pytest.
REPORT: sample report, test results, target scorecard and limitations.
```

### 5.8 Department QA — Quality Assurance and Security

**Purpose.** Establish that AMRS is correct, reproducible, safe to operate and demonstrably integrated. Manthan is the DRI for security and release gates. Each contributor owns unit tests for their modules; Aayush supports backend/ML integration tests and Manas supports browser/UI tests.

**Dependencies.** All implementation departments. QA planning and test scaffolding begin alongside INF-1.

#### Section QA-1: Test strategy and traceability

##### QA-1.1 · Test pyramid and requirement matrix
- **DRI:** Manthan. **Support:** Aayush and Manas.
- **Implementation steps.**
  1. Create `docs/qa/test-plan.md` mapping every F1–F18, BR1–BR13, M1–M10 and API endpoint to unit, integration, E2E or manual evidence.
  2. Organize tests under `tests/unit`, `tests/integration`, `tests/e2e` and `apps/web` test locations. Use synthetic fixtures only in CI; tests must not require external datasets or network access.
  3. Define test markers: `unit`, `integration`, `e2e`, `gpu`, `slow`, `security`. CI runs unit and CPU integration by default; GPU/long benchmarks are manual or scheduled.
  4. Require regression tests for every fixed defect and deterministic seeds for ML fixtures.
  5. Set minimum 80% coverage for `src/amrs` core modules; exclude generated files and keep exclusions documented. Coverage does not replace behavioral acceptance criteria.
- **Deliverables.** Test plan, requirement traceability matrix, pytest config, fixtures and CI test commands.
- **Acceptance criteria.** Every Must feature and business rule maps to at least one automated test; CI runs without network; coverage threshold is enforced; all skipped tests have a documented reason.
- **Tests required.** CI dry run on a clean clone, coverage threshold failure test and test-marker selection checks.
- **Tag.** MVP
- **AGENT PROMPT.**
```text
TASK: Create the AMRS QA strategy and traceability matrix. Map F1-F18, BR1-BR13, M1-M10 and API routes to unit/integration/E2E/manual tests. Configure pytest markers and synthetic-only offline CI. Enforce 80% coverage for core modules.

ACCEPTANCE: every MVP requirement has test evidence; default CI requires no network/GPU; coverage gate is enforced; skipped tests are explained.
RULES: Do not lower coverage or weaken existing assertions to obtain a green build. Run the full test suite.
REPORT: traceability matrix, commands, coverage, uncovered requirements and release blockers.
```

#### Section QA-2: Security and abuse-case validation

##### QA-2.1 · Threat model and security test suite
- **DRI:** Manthan. **Support:** Aayush.
- **Implementation steps.**
  1. Write `docs/qa/threat-model.md` covering untrusted model uploads, malicious serialized files, path traversal, oversized files, resource exhaustion, concurrent jobs, artifact ID guessing, secret leakage, unsafe CORS and public tunnel exposure.
  2. Add adversarial tests for `weights_only=True`, invalid tensor payloads, extension/content mismatch, oversized uploads, traversal names, symlinks, absolute paths and cross-run artifact access.
  3. Test upload disablement by default, API-key enforcement when exposed, localhost binding, allowed-origin CORS and absence of secrets/internal paths in API responses and logs.
  4. Add worker resource limits: one active job, bounded upload size, configurable timeouts and safe cancellation. Document that a local single-user tool is not a hardened multi-tenant service.
  5. Run dependency vulnerability audit (`pip-audit`) in CI and document accepted exceptions with owner and expiry.
- **Deliverables.** Threat model, security tests, dependency audit report and security checklist.
- **Acceptance criteria.** All listed abuse cases are covered; malicious pickle payload does not execute; upload remains disabled by default; no public FastAPI port is exposed in the demo topology; no critical/high unresolved dependency finding without an explicit waiver.
- **Tests required.** Automated security regression suite plus manual review of deployment/tunnel configuration.
- **Tag.** MVP
- **AGENT PROMPT.**
```text
TASK: Produce the AMRS threat model and security regression suite. Cover untrusted state_dict uploads, unsafe pickle/RCE, path traversal, symlink/absolute path, file size/type, resource exhaustion, worker concurrency/cancellation, artifact authorization, CORS, API key, tunnel exposure and secret leakage. Verify weights_only=True and upload-disabled-by-default behavior.

ACCEPTANCE: malicious payload never executes; traversal and cross-run access are rejected; size/type limits work; secrets and filesystem paths are not leaked; FastAPI remains private behind Next.js in demo topology; pip-audit runs in CI.
RULES: Do not add arbitrary code execution or weaken upload controls for convenience. Manthan must approve security-sensitive changes.
REPORT: threat model, abuse-case results, dependency findings, waivers and blockers.
```

#### Section QA-3: API, browser and end-to-end integration

##### QA-3.1 · Real workflow E2E tests
- **DRI:** Manthan. **Support:** Manas and Aayush.
- **Implementation steps.**
  1. Use Playwright to test the real Next.js app against a running FastAPI service with a tiny scenario fixture.
  2. Cover health status, scenario loading, run submission, HTTP 202 handling, status polling, terminal results, cancellation, artifact download, history and benchmark result rendering.
  3. Cover backend-offline, 422 validation, 409 active-run conflict, 413 upload, failed run and empty-state behavior.
  4. Assert browser requests remain same-origin `/api/v1`; no browser request may target `localhost:8000`, `127.0.0.1:8000` or a private container hostname.
  5. Verify API response schemas against frontend TypeScript/Zod contracts and generated OpenAPI.
  6. Run a Docker Compose smoke test and a documented Colab tunnel rehearsal.
- **Deliverables.** Playwright suite, API contract tests, Docker smoke script and E2E run report.
- **Acceptance criteria.** One complete browser-to-persisted-result workflow passes without mocking the backend; all key error states render; same-origin proxy assertions pass; Docker and Colab topology checks are recorded.
- **Tests required.** Playwright Chromium suite, API contract tests and service-start/stop integration test.
- **Tag.** MVP
- **AGENT PROMPT.**
```text
TASK: Implement real-stack E2E and API contract tests for AMRS. Start Next.js and FastAPI, run a tiny scenario from the browser, verify 202 job creation, polling, terminal verdict, persisted history and artifact download. Test cancellation, backend offline, 422, 409 and 413 states. Assert browser traffic uses only same-origin /api/v1 and never targets the private FastAPI host.

ACCEPTANCE: end-to-end workflow passes against the real API; OpenAPI and Zod contracts agree; error states are visible; Docker Compose smoke test passes; Colab tunnel exposes only port 3000.
RULES: Do not mock the complete backend for the primary path. Keep tests deterministic and clean up generated artifacts.
REPORT: test commands, screenshots/traces, results, environment and unresolved failures.
```

#### Section QA-4: Release gate and regression rehearsal

##### QA-4.1 · Pre-release validation
- **DRI:** Manthan. **Support:** all contributors.
- **Implementation steps.**
  1. Create `docs/qa/release-checklist.md` with functional, statistical, security, reproducibility, UI accessibility, deployment and documentation checks.
  2. Run unit/integration/E2E suites, lint/type checks, coverage, dependency audit and CPU tiny-scenario suite on the release candidate.
  3. Run the GPU scenario/benchmark suite on the selected Colab/Kaggle runtime and record device, runtime, package versions and elapsed time.
  4. Verify S6 healthy behavior, all-rejected rollback, cancellation and artifact integrity in a live rehearsal.
  5. Freeze release commit and config; record known issues and explicitly defer non-MVP work.
- **Deliverables.** Release checklist, test report, security sign-off and release-candidate tag.
- **Acceptance criteria.** No open critical/high severity defects; all MVP gates pass; known limitations are documented; demo can be repeated from a clean environment; Manthan records release sign-off.
- **Tests required.** Full release checklist and one timed end-to-end rehearsal.
- **Tag.** MVP
- **AGENT PROMPT.**
```text
TASK: Execute the AMRS release gate. Run lint, type checks, unit/integration/E2E, coverage, pip-audit, tiny scenarios, GPU smoke/benchmark where available, rollback/cancel/artifact-integrity rehearsals and accessibility checks. Create the release checklist and test report.

ACCEPTANCE: no unresolved critical/high defect; all MVP criteria have evidence; S6 and rollback behavior are demonstrated; release instructions work from a clean checkout; known issues and deferred scope are explicit.
RULES: Do not waive a failed safety or holdout-integrity test to meet the deadline. Record unavailable GPU checks as not run, not passed.
REPORT: pass/fail matrix, commands, environment, blockers, waivers and release recommendation.
```

### 5.9 Department DOC — Documentation and Demo

**Purpose.** Make AMRS understandable, installable, reproducible and demonstrable. Aayush owns technical documentation; Manas supplies accurate UI screenshots and user-flow descriptions; Manthan validates architecture, security and claims.

**Dependencies.** PX-1, INF, DM, ML, BM, BE, FE and QA. Drafting can begin early, but final commands/screenshots must be verified against the release candidate.

#### Section DOC-1: Product and developer documentation

##### DOC-1.1 · Documentation set and clean-install guide
- **DRI:** Aayush. **Support:** Manthan and Manas.
- **Implementation steps.**
  1. Write a concise root `README.md`: problem, solution, key differentiator, feature summary, architecture diagram, supported scope, screenshots and quick-start links.
  2. Write `docs/installation.md` for Windows/PowerShell and Linux/macOS, Python 3.11, Node.js LTS, package installation, environment variables and startup commands.
  3. Write `docs/user_guide.md` for scenario selection, model upload, config review, starting/cancelling a run, interpreting diagnosis/gate decisions and downloading artifacts.
  4. Write `docs/developer_guide.md` for repository structure, module boundaries, coding standards, tests, migrations, adding a strategy and adding a registered architecture.
  5. Write `docs/api.md` from the actual OpenAPI schema and `docs/frontend-integration.md` from the verified Next.js proxy contract.
  6. Write `docs/reproducibility.md`, `docs/limitations.md`, `docs/runbook_gpu.md` and `docs/qa/release-checklist.md`. Include data provenance, seeds, config hashes, hardware and the difference between validation selection and holdout verification.
  7. Include a troubleshooting section for missing GPU, CUDA mismatch, Colab disconnection, upload disabled, active-run conflict and stale jobs.
- **Deliverables.** README and documentation set above, with diagrams and current UI screenshots.
- **Acceptance criteria.** A teammate unfamiliar with the repo can install and run the CPU tiny demo from a clean checkout by following the docs; API documentation matches OpenAPI; no secret, private path or unsupported guarantee appears in docs.
- **Tests required.** Follow installation steps in a clean environment; validate commands and links; compare API docs against generated schema.
- **Tag.** MVP
- **AGENT PROMPT.**
```text
TASK: Write AMRS product/developer documentation: README, installation (Windows PowerShell + Linux/macOS), user guide, developer guide, API reference from OpenAPI, frontend integration, reproducibility, GPU runbook, limitations and troubleshooting. Explain the four-way data contract, diagnosis evidence, seven MVP strategies, verification gate, rollback and compute-unit proxy accurately.

ACCEPTANCE: a new teammate can clone and run the CPU tiny demo from a clean environment; commands are verified; API docs match OpenAPI; environment variables and Next.js-to-FastAPI proxy are correct; limitations and statistical caveats are explicit.
RULES: Do not invent completed features, benchmark results or guarantees. Never include secrets or local private paths. Run documentation link/command checks where practical.
REPORT: files created, clean-install test evidence, broken links, known gaps and reviewer notes.
```

#### Section DOC-2: Demo narrative and presentation assets

##### DOC-2.1 · Repeatable judge demonstration
- **DRI:** Manas for visual/story assets; **Aayush** for technical scenario preparation; **Manthan** for claims and release validation.
- **Implementation steps.**
  1. Prepare a 5–7 minute demo script: problem → upload/select scenario → diagnosis → cheapest-first attempts → gate evidence → accepted repair or rollback → benchmark comparison.
  2. Prepare two deterministic demo paths: S1 overfit recovery with an accepted candidate, and S6 healthy control or a deliberately rejected candidate showing rollback. If an acceptance path is not reproducible, do not script it as guaranteed.
  3. Pre-build and verify scenario artifacts for the demo environment; store config hashes, seeds and model hashes. Keep a live-build fallback only if time permits.
  4. Capture screenshots of Run Recovery, diagnosis, candidate table, gate decision, benchmark comparison and history. Use actual release-candidate UI.
  5. Prepare a short architecture diagram, one-slide technical differentiator summary, benchmark scorecard and limitations slide. Ensure all figures are sourced from actual benchmark output.
  6. Rehearse offline fallback and explain what is live versus precomputed. Do not present precomputed results as a live run.
- **Deliverables.** `docs/demo/script.md`, `docs/demo/rehearsal-checklist.md`, screenshots, architecture image and benchmark scorecard.
- **Acceptance criteria.** Demo completes within 5–7 minutes; every displayed number maps to a run/report; both recovery and rollback/healthy behavior are shown; precomputed material is labelled; no unsupported "always improves" claim is made.
- **Tests required.** Two timed rehearsals on the intended demo machine/network and one fallback rehearsal with the GPU unavailable.
- **Tag.** MVP
- **AGENT PROMPT.**
```text
TASK: Prepare a repeatable 5-7 minute AMRS judge demo. Show the complete diagnosis -> cheapest-first recovery -> independent verification -> accept/rollback story. Include an S1 recovery path and S6 healthy-control or rejected-candidate path. Capture actual UI screenshots and generate a benchmark scorecard from stored benchmark outputs.

ACCEPTANCE: two rehearsals fit the time; every metric traces to a run ID/report; precomputed outputs are labelled; offline/GPU-unavailable fallback is ready; all claims match measured evidence.
RULES: Never fabricate benchmark values or imply holdout guarantees generalize beyond its distribution. Do not change application behavior solely for screenshots.
REPORT: script, assets, rehearsal timings, fallback procedure and remaining risks.
```

---

### 5.10 Team allocation matrix

| Workstream / Part | DRI | Support / reviewer | Responsibility boundary |
|---|---|---|---|
| PX-1 specification freeze | Manthan | Manas, Aayush | Manthan resolves cross-stack product/API decisions; all three approve scope. |
| PX-2 UX design and page behavior | Manas | Manthan | Manas owns UI decisions within the approved product contract; Manthan reviews security-sensitive flows. |
| INF repository, CI and environments | Manthan | Aayush | Manthan owns deployment secrets, proxy and network exposure; Aayush contributes Python tooling. |
| DM-1 metrics, DM-2 data/splits, DM-3 models, DM-4 scenarios | Aayush | Manthan | Aayush owns data/model implementation; Manthan reviews split isolation and model-loading safety. |
| ML-1 diagnosis, ML-2 selector, ML-3–ML-8 strategies | Aayush | Manthan | Aayush owns algorithm implementation; Manthan reviews data isolation and candidate immutability. |
| ML-9 orchestrator and monitor | Aayush | Manthan | Aayush owns domain service/callback; Manthan owns worker boundary, cancellation and gate integration. |
| ML-10 transformer adapter (Post-MVP) | Aayush | Manthan | Deferred; must not block MVP. |
| BM-1 baselines, BM-2 runner, BM-3 reports | Aayush | Manthan | Aayush owns benchmark implementation; Manthan reviews fairness, holdout discipline and claims. |
| BE-1 schemas/ordinary handlers | Aayush | Manthan | Aayush implements; Manthan approves contract changes. |
| BE-2 persistence/history | Aayush | Manthan | Aayush implements repository layer; Manthan reviews path isolation and data integrity. |
| BE-3 job lifecycle/execution boundary | Manthan | Aayush | Manthan owns worker safety/state transitions; Aayush integrates domain services. |
| BE-4 upload/artifact/API hardening | Manthan | Aayush, Manas | Manthan owns all security-sensitive implementation; others provide integration tests/UI states. |
| BE-5 verification gate/holdout integrity | Manthan | Aayush | Manthan owns policy enforcement; Aayush supplies metric/evaluation functions. |
| BE-6 CLI and service wiring | Aayush | Manthan | Aayush owns CLI; Manthan owns runtime/deployment wiring. |
| FE-1.1 app shell/design system/routes | Manas | Manthan | Manas owns UI implementation; no API proxy or security config changes without Manthan. |
| FE-1.2 API proxy/client/contracts | Manthan | Manas, Aayush | Manthan owns browser-to-backend trust boundary and typed contract; Manas consumes hooks; Aayush aligns OpenAPI. |
| FE-2.1 intake forms/scenario UI | Manas | Manthan | Manas owns UX; Manthan owns server-side upload enforcement. |
| FE-2.2 results/progress/artifacts UI | Manas | Manthan | Manas renders backend verdicts; Manthan owns cancellation and artifact authorization. |
| FE-2.3 benchmarks/monitor/history UI | Manas | Aayush | Manas owns pages; Aayush supplies endpoint semantics/data. |
| FE-2.4 E2E and release integration | Manthan | Manas, Aayush | Manthan owns end-to-end pass/fail and integration fixes; all three fix their respective defects. |
| QA-1 test strategy/traceability | Manthan | Aayush, Manas | Each DRI owns module tests; Manthan owns coverage and traceability gate. |
| QA-2 security | Manthan | Aayush | Manthan owns threat model and security sign-off. |
| QA-3 E2E integration | Manthan | Manas, Aayush | Manthan owns real-stack E2E; each fixes defects in their layer. |
| QA-4 release gate | Manthan | All | No release without evidence for critical gates. |
| DOC-1 technical docs | Aayush | Manthan, Manas | Aayush owns technical content; Manthan validates contracts/security; Manas supplies UI evidence. |
| DOC-2 demo assets | Manas | Aayush, Manthan | Manas owns visual assets; Aayush prepares scenarios; Manthan validates claims and rehearsal. |

### 5.11 Working agreement and merge controls

1. Use one issue per Part or independently testable subtask. Every issue names one DRI, reviewer, prerequisites, acceptance criteria and target branch.
2. Manas works primarily in `apps/web/app`, `apps/web/components` and UI tests. Manthan owns `apps/web/lib/api`, proxy/environment configuration, security-sensitive UI flows and cross-stack integration. Coordinate shared files through small pull requests; do not edit the same file concurrently without agreement.
3. Aayush works primarily in Python domain/ML, repositories, ordinary API handlers, CLI and benchmark modules. Manthan owns security-sensitive worker/upload/artifact/gate modules. Aayush must not weaken or bypass those controls to make a demo work.
4. Require a pull request for every merge. The author runs relevant tests; one teammate reviews. Changes to upload handling, worker execution, artifact access, secrets, holdout isolation or verification policy require Manthan's explicit approval and security tests.
5. Never commit datasets, model weights, API secrets, `.env` files, Colab tokens or generated user uploads. Use `.env.example` with placeholders only.
6. Keep the main branch runnable. Merge the smallest vertical slices: health → scenarios → create run → progress → result/gate → artifact → benchmark/history.
7. No one may mark a Part complete based only on code generation. The DRI must attach commands, test output, screenshots/logs where relevant, and known limitations to the completion report.
8. The MVP release gate takes priority over Post-MVP work. ML-10 and Section 3.3 roadmap items must not consume time needed for verification, security, integration or the demo.

## 6. Three-person implementation schedule and dependency order

The 14-calendar-day window in this plan is an assumption, not a confirmed deadline. This schedule is a suggested order; if the actual deadline differs, preserve dependencies and release gates rather than compressing security work.

| Window | Manas — Frontend | Aayush — Backend/domain | Manthan — Critical cross-stack/security |
|---|---|---|---|
| Days 1–2 | Review UX, finalize page structure and design tokens; scaffold UI after repo baseline | Audit current Python modules, define domain/service boundaries, validate metric/data contracts; draft diagnosis/strategy interfaces | Freeze API contract, repository conventions, env/network topology, threat model and acceptance-policy invariants; set up CI/branch protection; QA traceability setup |
| Days 3–4 | Build AppShell, routes, components and responsive states (FE-1.1) | Implement DM-1/DM-2 foundations, BE-1 schemas and ML-1 diagnosis foundations | Implement FE-1.2 proxy/API client foundation; review model intake and holdout split boundary; add security test scaffolding |
| Days 5–7 | Build scenario picker, config preview and run intake UI (FE-2.1) | Implement DM-3/DM-4, ML-2–ML-8 strategies and BE-2 persistence | Implement BE-3 worker/job lifecycle and BE-4 upload/artifact security; wire secure upload UI behavior with Manas |
| Days 8–10 | Build run detail, progress, result and history/benchmark pages (FE-2.2/2.3) | Complete ML-9 orchestration/monitor, BM-1–BM-3 and ordinary API integrations | Implement BE-5 verification gate/holdout enforcement; integrate cancellation, result and artifact endpoints; review API contracts |
| Days 11–12 | Fix UI integration, accessibility, responsive and empty/error states; capture UI evidence | Add backend integration tests, CLI wiring, benchmark reports and technical docs | Complete FE-2.4/QA-1–QA-3 E2E, Docker/Colab topology checks, security tests and release candidate integration |
| Days 13–14 | Demo polish, user-flow verification, screenshots and DOC-2 demo assets | Final benchmark runs, DOC-1 guides and reproducibility report | QA-4 release review, security sign-off, regression triage and rollback/demo rehearsal |

**Critical path:** API schemas and runtime topology → data/model contract → job lifecycle and secure intake → recovery engine + verification gate → frontend integration → E2E/security gate → demo. UI scaffolding and independent domain work can proceed in parallel, but integration must use the agreed schemas early.

**Definition of done for the team:** all MVP acceptance criteria pass; frontend and backend run from a clean checkout; a real scenario completes from browser intake to persisted result; rejected candidates preserve the original model; artifact access is allowlisted; holdout is isolated; tests/CI pass; the Colab/Docker demo topology is verified; README/runbook and known limitations are present. A polished dashboard alone is not a completed MVP.

### 6.1 Completeness and professionalism audit

**Assessment: substantially more complete, but still requires repository validation.** Version 1.3 now supplies implementation work breakdowns for ML-1–ML-10, BM-1–BM-3, QA-1–QA-4 and DOC-1–DOC-2, alongside the existing PX, INF, DM, FE and BE parts. Every new Part includes a DRI, prerequisites, implementation steps, deliverables, acceptance criteria, tests and an agent prompt. These additions close the major structural gaps in the uploaded plan; they do not prove the code has been implemented or that every assumption is experimentally validated.

| Area | Status | Remaining validation before execution |
|---|---|---|
| Product scope, flows, success metrics | Specified | Confirm assumptions, metric formulas, dataset availability and benchmark targets. |
| Frontend stack and page/API integration | Specified | Validate Next.js version/Tailwind setup, actual OpenAPI schemas, UI design assets and browser proxy behavior. |
| Backend architecture and ownership | Specified at service/workstream level | Map contracts to the actual repository and confirm worker implementation and endpoint payloads. |
| ML diagnosis/recovery algorithms | Work breakdown authored | Validate algorithm details on tiny scenarios; verify strategy prerequisites, BatchNorm buffer policy and L2-SP implementation. |
| Benchmark methodology | Work breakdown authored | Confirm fair compute budgets, evaluation split protocol, seed count and statistical reporting. |
| QA/security | Work breakdown authored | Execute threat-model tests, verify deployment exposure and complete the release checklist. |
| Infrastructure/deployment | Partly specified | Run exact Docker/Colab commands against the repository and rehearse tunnel/network behavior. |
| Documentation/demo | Work breakdown authored | Generate docs/screenshots from the working release candidate and rehearse with actual outputs. |
| Schedule and capacity | Proposed, assumption-based | Confirm deadline, available hours, GPU quota and contingency. Prioritize the vertical MVP path. |
| References and citations | Not fully auditable from available source | Restore the original reference list and verify every paper, library and version. |

**Recommendation:** use v1.3 as the complete planning baseline, then validate it against the current codebase. Treat all acceptance criteria as targets until tests produce evidence. If the deadline is tight, prioritize one complete browser-to-result vertical slice, the verification/rollback guarantees, S1/S6 scenarios, benchmark evidence and release security. Defer ML-10 and other Post-MVP items rather than weakening safety or verification controls.


---

## Revision 1.3 review result

- **Frontend technology:** Next.js App Router + React + TypeScript + Tailwind CSS is the only active frontend stack. Streamlit is superseded and is not part of the application.
- **Frontend/backend connection:** specified in Section 4.6 and FE-1.2/FE-2.4: same-origin `/api/v1`, Next.js rewrite proxy, server-only backend URL, typed API client, Zod schemas, TanStack Query, polling, mutations, upload flow, cancellation, error handling, Docker service DNS, Colab tunnel and integration acceptance tests.
- **Backend remains:** Python 3.11, FastAPI, Pydantic v2, PyTorch/Torchvision, SQLite and existing AMRS core package. No ML logic is moved into the frontend.
- **Team allocation:** Manas owns UI implementation; Aayush owns backend/domain implementation; Manthan owns cross-stack integration and the security-sensitive frontend/backend boundary, including proxy, upload, worker, artifact, holdout and verification-gate controls.
- **Completeness:** detailed ML-1–ML-10, BM-1–BM-3, QA-1–QA-4 and DOC-1–DOC-2 work breakdowns added, with prerequisites, DRIs, deliverables, acceptance criteria, tests and agent prompts. BE-1–BE-6 and FE-1.1–FE-2.4 remain part of the implementation plan.
- **Source provenance:** the uploaded source ended after DM-4.1. The missing department work breakdowns in this revision are newly authored implementation proposals; validate them against the actual repository and any approved original plan before treating every detail as frozen.
