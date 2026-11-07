"""Temperature scaling calibration strategy and wrapper (Section ML-3, ML-3.1).

Fits a single scalar temperature T > 0 on validation logits by minimizing negative log-likelihood (NLL).
Softplus parameterization guarantees positivity without altering the classifier's learned weights or
changing non-tied predicted class ordering.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from pydantic import BaseModel, Field

from amrs.metrics.classification import accuracy, ece, nll, predict_logits
from amrs.models.adapter import ModelAdapter
from amrs.recovery.base import (
    Applicability,
    CostEstimate,
    RecoveryContext,
    RecoveryStrategy,
    StrategyResult,
)

# softplus(0.5413248546129181) = 1.0 - 1e-4 -> temperature = 1.0
INITIAL_RAW_TEMPERATURE = 0.5413248546129181
MIN_TEMPERATURE_EPS = 1e-4


def _raw_from_temperature(t: float) -> float:
    """Compute raw scalar parameter such that softplus(raw) + eps = t."""
    eff_t = max(MIN_TEMPERATURE_EPS + 1e-5, float(t))
    diff = eff_t - MIN_TEMPERATURE_EPS
    # exp(diff) - 1
    val = np.expm1(diff)
    return float(np.log(val))


def _temperature_from_raw(raw: float | torch.Tensor) -> float:
    """Compute temperature scalar from raw parameter."""
    if isinstance(raw, torch.Tensor):
        return float(F.softplus(raw).item() + MIN_TEMPERATURE_EPS)
    # log(1 + exp(raw))
    return float(np.log1p(np.exp(raw)) + MIN_TEMPERATURE_EPS)


class CalibrationArtifact(BaseModel):
    """Serializable metadata for a fitted temperature scaling calibration."""

    strategy: str = "temperature_scaling"
    temperature: float
    raw_temperature: float
    ece_before: float
    ece_after: float
    nll_before: float
    nll_after: float
    accuracy_before: float
    accuracy_after: float
    top1_changed: bool = False
    converged: bool = True
    iterations: int = 0
    optimizer: str = "LBFGS"
    metadata: dict[str, Any] = Field(default_factory=dict)

    def save(self, path: str | Path) -> None:
        """Serialize calibration artifact to a JSON file."""
        file_path = Path(path)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(self.model_dump_json(indent=2))

    @classmethod
    def load(cls, path: str | Path) -> CalibrationArtifact:
        """Load calibration artifact from a JSON file."""
        file_path = Path(path)
        if not file_path.exists():
            raise FileNotFoundError(f"Calibration artifact not found at '{file_path}'")
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls(**data)


class CalibratedModel(nn.Module):
    """Wrapper that applies scalar temperature scaling to model logits without mutating weights."""

    def __init__(self, base_model: nn.Module, temperature: float = 1.0) -> None:
        super().__init__()
        self.base_model = base_model
        if temperature <= 0.0 or not np.isfinite(temperature):
            raise ValueError(f"Temperature must be finite and strictly positive, got {temperature}")

        raw_val = _raw_from_temperature(temperature)
        self.raw_temperature = nn.Parameter(torch.tensor(raw_val, dtype=torch.float32))
        self.raw_temperature.requires_grad = False

    @property
    def temperature(self) -> float:
        with torch.no_grad():
            return _temperature_from_raw(self.raw_temperature)

    def set_temperature(self, t: float) -> None:
        """Update temperature parameter safely."""
        if t <= 0.0 or not np.isfinite(t):
            raise ValueError(f"Temperature must be finite and positive, got {t}")
        with torch.no_grad():
            self.raw_temperature.copy_(torch.tensor(_raw_from_temperature(t), dtype=torch.float32))

    def forward(self, *args: Any, **kwargs: Any) -> torch.Tensor:
        logits = self.base_model(*args, **kwargs)
        return logits / self.temperature

    def save_calibration(self, path: str | Path) -> None:
        """Save calibration parameter state."""
        file_path = Path(path)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        torch.save({"raw_temperature": self.raw_temperature.detach().cpu()}, file_path)

    def load_calibration(self, path: str | Path) -> None:
        """Load calibration parameter state."""
        state = torch.load(path, weights_only=True)
        if "raw_temperature" in state:
            with torch.no_grad():
                self.raw_temperature.copy_(state["raw_temperature"])


def fit_temperature(
    val_logits: torch.Tensor,
    val_labels: torch.Tensor,
    max_iter: int = 50,
    lr: float = 0.05,
) -> tuple[float, bool, int]:
    """Fit a single positive scalar temperature on validation logits by minimizing NLL.

    Returns:
        (fitted_temperature, converged, iterations)
    """
    if len(val_logits) == 0:
        raise ValueError("Cannot fit temperature on empty validation logits.")
    if not torch.isfinite(val_logits).all():
        raise ValueError("Cannot fit temperature on logits containing NaN or Inf.")

    device = val_logits.device
    logits = val_logits.detach()
    labels = val_labels.detach()

    raw_temp = nn.Parameter(
        torch.tensor([INITIAL_RAW_TEMPERATURE], dtype=torch.float32, device=device)
    )
    optimizer = torch.optim.LBFGS(
        [raw_temp],
        lr=lr,
        max_iter=max_iter,
        tolerance_grad=1e-7,
        tolerance_change=1e-9,
        line_search_fn="strong_wolfe",
    )

    iteration_count = 0
    converged = True

    def closure() -> torch.Tensor:
        nonlocal iteration_count
        iteration_count += 1
        optimizer.zero_grad()
        t = F.softplus(raw_temp) + MIN_TEMPERATURE_EPS
        scaled = logits / t
        loss = F.cross_entropy(scaled, labels)
        loss.backward()
        return loss

    try:
        optimizer.step(closure)
    except Exception:
        # Fallback to Adam if L-BFGS line search fails on degenerate inputs
        converged = False
        raw_temp.data.fill_(INITIAL_RAW_TEMPERATURE)
        adam_opt = torch.optim.Adam([raw_temp], lr=0.01)
        for _ in range(min(max_iter, 50)):
            adam_opt.zero_grad()
            t = F.softplus(raw_temp) + MIN_TEMPERATURE_EPS
            loss = F.cross_entropy(logits / t, labels)
            if not torch.isfinite(loss):
                break
            loss.backward()
            adam_opt.step()

    fitted_t = _temperature_from_raw(raw_temp)

    # Sanity checks: must be positive and finite
    if not np.isfinite(fitted_t) or fitted_t <= 0.0:
        fitted_t = 1.0
        converged = False

    return fitted_t, converged, iteration_count


class TemperatureScalingStrategy(RecoveryStrategy):
    """Post-processing calibration recovery strategy via learned temperature scaling."""

    @property
    def name(self) -> str:
        return "temperature_scaling"

    def is_applicable(self, model: ModelAdapter, context: RecoveryContext) -> Applicability:
        """Check prerequisites for temperature scaling."""
        if context.val_loader is None and "logits" not in context.extra:
            return Applicability(
                can_apply=False,
                reason="MISSING_VALIDATION_DATA",
                message="Validation data loader or precomputed validation logits required for temperature scaling.",
            )
        return Applicability(can_apply=True)

    def estimate_cost(
        self, context: RecoveryContext, model: ModelAdapter | None = None
    ) -> CostEstimate:
        """Estimate compute units: 1 validation forward pass (BR12)."""
        loader = context.val_loader
        n_val = 500
        if loader is not None:
            if hasattr(loader, "dataset") and hasattr(loader.dataset, "__len__"):
                try:
                    n_val = len(loader.dataset)
                except Exception:
                    pass
            elif hasattr(loader, "__len__"):
                batch_size = getattr(loader, "batch_size", 32) or 32
                n_val = len(loader) * batch_size

        return CostEstimate(
            estimated_units=float(n_val),
            details={"fwd_samples": n_val, "bwd_samples": 0, "strategy": self.name},
        )

    def apply(
        self, model_copy: nn.Module, context: RecoveryContext
    ) -> tuple[nn.Module, StrategyResult]:
        """Fit scalar temperature on validation logits and return CalibratedModel wrapper."""
        t0 = time.monotonic()

        # Split isolation check: NEVER evaluate or fit on holdout
        if hasattr(context, "_holdout_loader") or "holdout" in context.extra:
            raise ValueError(
                "Split discipline violation: holdout data cannot enter TemperatureScalingStrategy."
            )

        # Extract max_iter from config
        max_iter = 50
        if context.config and hasattr(context.config, "strategies"):
            cfg = getattr(context.config.strategies, "temperature_scaling", None)
            if cfg is not None:
                max_iter = getattr(cfg, "max_iter", 50)

        # 1. Collect validation logits and labels
        if context.val_loader is not None:
            val_logits, val_labels = predict_logits(
                model_copy, context.val_loader, device=context.device
            )
        elif "logits" in context.extra and "labels" in context.extra:
            val_logits = context.extra["logits"]
            val_labels = context.extra["labels"]
        else:
            raise ValueError("Temperature scaling requires validation loader or logits.")

        n_val = len(val_logits)

        # 2. Before metrics
        acc_before = accuracy(val_logits, val_labels)
        nll_before = nll(val_logits, val_labels)
        ece_before = ece(val_logits, val_labels)
        top1_before = torch.argmax(val_logits, dim=-1)

        # 3. Fit scalar temperature
        fitted_t, converged, iters = fit_temperature(val_logits, val_labels, max_iter=max_iter)

        # 4. After metrics
        scaled_logits = val_logits / fitted_t
        acc_after = accuracy(scaled_logits, val_labels)
        nll_after = nll(scaled_logits, val_labels)
        ece_after = ece(scaled_logits, val_labels)
        top1_after = torch.argmax(scaled_logits, dim=-1)

        # 5. Non-tied top-1 invariance check
        top1_changed = not torch.equal(top1_before, top1_after)

        # Numerical tolerance check on NLL: NLL must not increase beyond float tolerance
        if nll_after > (nll_before + 1e-4):
            # If fitting degraded NLL, fall back to T = 1.0 (identity)
            fitted_t = 1.0
            scaled_logits = val_logits
            nll_after = nll_before
            ece_after = ece_before
            acc_after = acc_before
            converged = False

        # 6. Wrap model in CalibratedModel without mutating base model weights
        calibrated_model = CalibratedModel(model_copy, temperature=fitted_t)

        elapsed = round(time.monotonic() - t0, 3)

        artifact = CalibrationArtifact(
            strategy=self.name,
            temperature=round(fitted_t, 6),
            raw_temperature=round(_raw_from_temperature(fitted_t), 6),
            ece_before=round(ece_before, 6),
            ece_after=round(ece_after, 6),
            nll_before=round(nll_before, 6),
            nll_after=round(nll_after, 6),
            accuracy_before=round(acc_before, 6),
            accuracy_after=round(acc_after, 6),
            top1_changed=top1_changed,
            converged=converged,
            iterations=iters,
            optimizer="LBFGS",
            metadata={
                "n_samples": n_val,
                "max_iter": max_iter,
                "delta_ece": round(ece_before - ece_after, 6),
                "delta_nll": round(nll_before - nll_after, 6),
            },
        )

        result = StrategyResult(
            strategy_name=self.name,
            success=converged and (nll_after <= nll_before + 1e-4),
            params={"temperature": round(fitted_t, 6), "max_iter": max_iter},
            seed=context.seed,
            elapsed_wall_s=elapsed,
            compute_units=float(n_val),
            grad_steps=iters,
            warnings=[] if not top1_changed else ["Top-1 predictions changed due to tied logits."],
            artifact_metadata=artifact.model_dump(),
            error_message=None if converged else "Optimizer did not fully converge; used best fit.",
        )

        return calibrated_model, result
