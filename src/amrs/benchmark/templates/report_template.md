# AMRS Benchmark Evidence & Target Validation Report

**Benchmark ID:** `{{ benchmark_id }}`  
**Created At:** {{ created_at }}  
**Config Hash:** `{{ config_hash }}`  
**Status:** {{ "COMPLETE" if is_complete else "INCOMPLETE / PARTIAL" }}  
**Environment:** Python {{ environment.python_version }} | PyTorch {{ environment.torch_version }} | OS {{ environment.os }} | CUDA: {{ environment.cuda_available }}  

---

## 1. Statistical Disclaimer & Scope of Evidence

> [!WARNING]
> **Limitations on Statistical Certainty**:  
> {{ statistical_disclaimer }}

---

## 2. Gain-per-Compute Methodology

The cost efficiency of recovery interventions is quantified by **Gain-per-Compute**:

$$\text{gain\_per\_compute} = \frac{\Delta \text{Metric}}{\max(\text{Compute Units}, 1\times 10^{-6})}$$

- **Formula:** `{{ gain_per_compute_formula }}`
- **Metric Gain ($\Delta \text{Metric}$):** Improvement in primary validation/holdout metric (e.g. Accuracy or $\Delta\text{ECE}$) relative to the unrecovered baseline or original model.
- **Compute Units:** Normalized resource counter defined as $\text{fwd\_samples} + 3 \times \text{bwd\_samples}$.
- **Edge cases:** If $\text{Compute Units} \le 0$ and $\Delta \text{Metric} \le 0$, gain-per-compute is strictly $0.0$. If $\text{Compute Units} \le 0$ and $\Delta \text{Metric} > 0$, denominator is clamped to $\epsilon = 1\times 10^{-6}$ to prevent division by zero.

---

## 3. Targets M1–M10 Scorecard

| Target ID | Name | Description | Status | Evidence & Details |
| :--- | :--- | :--- | :---: | :--- |
{% for t in targets %}
| **{{ t.id }}** | {{ t.name }} | {{ t.target_description }} | **`{{ t.status }}`** | {{ t.details }} |
{% endfor %}

---

## 4. Aggregate Performance by Scenario and Method

*All values reported as Mean ± Sample Standard Deviation ($ddof=1$ for $N \ge 2$).*

| Scenario | Method | Seed Count ($N$) | Accuracy [0, 1] | ECE [0, 1] | NLL [nats] | Retention [0, 1] | Compute Units | Wall Time [s] | Gain / Compute |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
{% for s in summaries %}
| `{{ s.scenario_id }}` | `{{ s.method }}` | {{ s.seed_count }} {% if s.seed_count < 5 %}⚠️{% endif %} | {{ "%.4f"|format(s.accuracy.mean) }} ± {{ "%.4f"|format(s.accuracy.std) }} | {{ "%.4f"|format(s.ece.mean) }} ± {{ "%.4f"|format(s.ece.std) }} | {{ "%.4f"|format(s.nll.mean) }} ± {{ "%.4f"|format(s.nll.std) }} | {{ "%.4f"|format(s.retention.mean) }} ± {{ "%.4f"|format(s.retention.std) }} | {{ "%.1f"|format(s.compute_units.mean) }} ± {{ "%.1f"|format(s.compute_units.std) }} | {{ "%.2f"|format(s.wall_s.mean) }} ± {{ "%.2f"|format(s.wall_s.std) }} | {{ "%.2e"|format(s.gain_per_compute.value) }} |
{% endfor %}

*Note: ⚠️ indicates $N < 5$ (low sample count). Directional evidence only.*

---

## 5. Paired Method Deltas (AMRS vs Baselines)

*Paired differences computed on matching `(scenario, seed)` executions.*

| Scenario | Baseline Method | Pairs ($N$) | $\Delta \text{Accuracy}$ | $\Delta \text{ECE}$ | $\Delta \text{NLL}$ | $\Delta \text{Retention}$ | Compute Ratio ($\frac{\text{AMRS}}{\text{Baseline}}$) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
{% for p in paired_deltas %}
| `{{ p.scenario_id }}` | `{{ p.baseline_method }}` | {{ p.seed_count }} | {{ "%+.4f"|format(p.accuracy_delta.mean) }} ± {{ "%.4f"|format(p.accuracy_delta.std) }} | {{ "%+.4f"|format(p.ece_delta.mean) }} ± {{ "%.4f"|format(p.ece_delta.std) }} | {{ "%+.4f"|format(p.nll_delta.mean) }} ± {{ "%.4f"|format(p.nll_delta.std) }} | {{ "%+.4f"|format(p.retention_delta.mean) }} ± {{ "%.4f"|format(p.retention_delta.std) }} | {{ "%.3f"|format(p.compute_ratio.mean) }} |
{% endfor %}

---

## 6. Execution Completeness & Missing Trials

- **Requested Trials:** {{ requested_trials_count }}
- **Completed Trials:** {{ completed_trials_count }}
- **Failed Trials:** {{ failed_trials_count }}
- **Missing Trials:** {{ missing_trials_count }}

{% if missing_trials %}
### Missing / Incomplete Trials Table
| Trial ID | Scenario | Seed | Method | Status | Reason / Error |
| :--- | :--- | :---: | :--- | :---: | :--- |
{% for m in missing_trials %}
| `{{ m.trial_id }}` | `{{ m.scenario_id }}` | {{ m.seed }} | `{{ m.method }}` | **{{ m.status }}** | {{ m.error_message or "Not executed" }} |
{% endfor %}
{% else %}
*All requested matrix trials completed successfully.*
{% endif %}

---

## 7. Traceability & Run Provenance

| Trial ID | Scenario | Seed | Method | Accuracy | Compute Units | Wall Time [s] | Status |
| :--- | :--- | :---: | :--- | :---: | :---: | :---: | :---: |
{% for r in raw_trials %}
| `{{ r.trial_id or (r.scenario_id ~ "_" ~ r.seed ~ "_" ~ r.method) }}` | `{{ r.scenario_id }}` | {{ r.seed }} | `{{ r.method }}` | {{ "%.4f"|format(r.accuracy) if r.accuracy is not none else "N/A" }} | {{ "%.1f"|format(r.compute_units) }} | {{ "%.2f"|format(r.wall_s) }} | `{{ r.status }}` |
{% endfor %}

