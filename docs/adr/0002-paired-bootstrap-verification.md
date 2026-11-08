# ADR-0002: Paired Bootstrap Verification Gate

## Status
Accepted

## Context
When an automated recovery strategy produces an adapted neural network candidate, empirical validation performance on the training or validation split is insufficient to guard against subtle regression, overfitting to recovery targets, or catastrophic forgetting of previously learned capabilities.

A safety verification gate is mandatory before promoting any candidate to `accepted_model.pt`. We needed a rigorous, non-parametric statistical framework to verify candidate superiority and prevent deployment of degraded models.

## Decision
We implement a Paired Bootstrap Verification Gate operating strictly on an isolated `holdout` evaluation split (`HoldoutIsolatedContext`):

1. **Holdout Isolation**: The holdout split is strictly quarantined and inaccessible during diagnosis, hyperparameter search, or candidate fitting. It is evaluated at most $K \le 3$ times per recovery run to avoid adaptive overfitting on the holdout partition.
2. **Paired Bootstrap Sampling**: 1,000 paired bootstrap resamples of candidate and original model predictions are computed on the holdout dataset to generate 95% confidence intervals ($\Delta \text{Accuracy}$, $\Delta \text{ECE}$).
3. **Statistical Non-Regression**: A candidate is rejected if the lower bound of its primary metric gain confidence interval ($\text{CI}_{\text{low}}$) drops below zero, or if maximum permissible metric regression thresholds are violated.
4. **Retained Accuracy Constraint**: The candidate must demonstrate a retained accuracy rate $\ge 0.95$ on holdout samples that the original model correctly classified, guaranteeing that existing capabilities are preserved.

## Consequences
- **Positive**: Provides mathematical proof that promoted candidates are statistically superior without making Gaussian assumptions about model error distributions.
- **Negative**: Adds evaluation runtime overhead during gate verification due to 1,000 resample calculations, mitigated by vectorized NumPy/Torch implementations.

