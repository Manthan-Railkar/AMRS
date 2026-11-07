"""Supporting analyses and diagnostic probes for AMRS diagnosis engine (ML-1 / Section 2.8)."""

from __future__ import annotations

from typing import Any
import numpy as np
from scipy.optimize import minimize_scalar
from sklearn.linear_model import LogisticRegression
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader

from amrs.models.adapter import ModelAdapter
from amrs.metrics.classification import accuracy, ece, predict_logits


def compute_acc_and_gap(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    device: str = "cpu",
) -> dict[str, Any]:
    """Compute predictions, accuracy on train and val, and the generalization gap."""
    train_logits, train_labels = predict_logits(model, train_loader, device=device)
    val_logits, val_labels = predict_logits(model, val_loader, device=device)

    train_acc = accuracy(train_logits, train_labels)
    val_acc = accuracy(val_logits, val_labels)
    gap = train_acc - val_acc

    return {
        "train_acc": float(train_acc),
        "val_acc": float(val_acc),
        "gap": float(gap),
        "train_logits": train_logits,
        "train_labels": train_labels,
        "val_logits": val_logits,
        "val_labels": val_labels,
    }


def analyze_history_trend(
    history: list[dict[str, Any]] | None,
    val_loss_rise_epochs: int = 3,
) -> dict[str, Any]:
    """Analyze validation loss rise while training loss falls in training history."""
    if not history or len(history) < 2:
        return {
            "available": False,
            "condition_met": False,
            "rise_count": 0,
            "reason": "NO_HISTORY",
        }

    val_losses = [float(ep["val_loss"]) for ep in history if "val_loss" in ep]
    train_losses = [float(ep["train_loss"]) for ep in history if "train_loss" in ep]

    if len(val_losses) < 2 or len(train_losses) < 2:
        return {
            "available": False,
            "condition_met": False,
            "rise_count": 0,
            "reason": "INSUFFICIENT_HISTORY",
        }

    n_transitions = min(val_loss_rise_epochs, len(val_losses) - 1)
    rise_count = 0
    start_idx = len(val_losses) - n_transitions
    for t in range(start_idx, len(val_losses)):
        if val_losses[t] > val_losses[t - 1] and train_losses[t] < train_losses[t - 1]:
            rise_count += 1

    condition_met = (rise_count >= val_loss_rise_epochs) and (len(val_losses) - 1 >= val_loss_rise_epochs)

    return {
        "available": True,
        "condition_met": condition_met,
        "rise_count": rise_count,
        "val_loss_rise_epochs": val_loss_rise_epochs,
    }


def fit_temperature_diagnostic(
    val_logits: torch.Tensor,
    val_labels: torch.Tensor,
    ece_bins: int = 15,
) -> dict[str, Any]:
    """Calculate validation ECE and fit a positive scalar temperature T to minimize NLL."""
    ece_val = ece(val_logits, val_labels, n_bins=ece_bins)

    def nll_objective(t: float) -> float:
        if t <= 1e-4:
            return 1e9
        scaled = val_logits / t
        return float(F.cross_entropy(scaled, val_labels).item())

    res = minimize_scalar(nll_objective, bounds=(0.01, 10.0), method="bounded")
    fitted_t = float(res.x)
    temp_diff = abs(fitted_t - 1.0)

    return {
        "ece": float(ece_val),
        "fitted_temperature": float(fitted_t),
        "temperature_divergence": float(temp_diff),
    }


def compute_bn_divergence(
    model: nn.Module,
    eval_loader: DataLoader | None,
    device: str = "cpu",
) -> dict[str, Any]:
    """Compute BatchNorm running-statistic divergence against evaluation data."""
    adapter = ModelAdapter(model)
    if not adapter.supports_bn():
        return {
            "evaluable": False,
            "reason": "NO_BN_LAYERS",
            "divergence": None,
            "num_bn_layers": 0,
        }

    if eval_loader is None:
        return {
            "evaluable": False,
            "reason": "MISSING_EVAL_INPUTS",
            "divergence": None,
            "num_bn_layers": len(adapter.bn_layers()),
        }

    bn_layers = adapter.bn_layers()
    stats: dict[int, dict[str, Any]] = {
        i: {"sum": None, "sum2": None, "count": 0} for i in range(len(bn_layers))
    }

    handles = []
    for i, bn in enumerate(bn_layers):
        def make_hook(idx: int):
            def hook(m: nn.Module, inp: tuple[Any, ...], out: Any) -> None:
                if inp and isinstance(inp[0], torch.Tensor):
                    x = inp[0].detach()
                    # Flatten spatial dims if conv
                    if x.ndim == 4:
                        # (B, C, H, W) -> sum across (B, H, W)
                        cnt = x.shape[0] * x.shape[2] * x.shape[3]
                        s = x.sum(dim=(0, 2, 3)).cpu()
                        s2 = (x ** 2).sum(dim=(0, 2, 3)).cpu()
                    elif x.ndim == 2:
                        cnt = x.shape[0]
                        s = x.sum(dim=0).cpu()
                        s2 = (x ** 2).sum(dim=0).cpu()
                    else:
                        cnt = x.shape[0]
                        flat = x.reshape(x.shape[0], x.shape[1], -1)
                        s = flat.sum(dim=(0, 2)).cpu()
                        s2 = (flat ** 2).sum(dim=(0, 2)).cpu()

                    if stats[idx]["sum"] is None:
                        stats[idx]["sum"] = s
                        stats[idx]["sum2"] = s2
                    else:
                        stats[idx]["sum"] += s
                        stats[idx]["sum2"] += s2
                    stats[idx]["count"] += cnt

            return hook

        handles.append(bn.register_forward_hook(make_hook(i)))

    was_training = model.training
    model.eval()
    try:
        with torch.inference_mode():
            for batch in eval_loader:
                x = batch[0] if isinstance(batch, (list, tuple)) else batch
                x = x.to(device)
                _ = model(x)
    finally:
        for h in handles:
            h.remove()
        model.train(was_training)

    divergences: list[float] = []
    for i, bn in enumerate(bn_layers):
        cnt = stats[i]["count"]
        if cnt == 0 or stats[i]["sum"] is None:
            continue
        mu_new = stats[i]["sum"] / cnt
        var_new = (stats[i]["sum2"] / cnt) - (mu_new ** 2)
        var_new = torch.clamp(var_new, min=0.0)

        mu_run = bn.running_mean.cpu() if bn.running_mean is not None else torch.zeros_like(mu_new)
        var_run = bn.running_var.cpu() if bn.running_var is not None else torch.ones_like(var_new)
        eps = float(bn.eps)

        denom = torch.sqrt(var_run + eps)
        diff = torch.abs(mu_run - mu_new)
        layer_div = float(torch.mean(diff / denom).item())
        divergences.append(layer_div)

    mean_div = float(np.mean(divergences)) if divergences else 0.0

    return {
        "evaluable": True,
        "divergence": mean_div,
        "num_bn_layers": len(bn_layers),
        "per_layer_divergence": divergences,
    }


def analyze_instability(
    history: list[dict[str, Any]] | None,
    spike_ratio: float = 2.0,
    cv_min: float = 0.35,
) -> dict[str, Any]:
    """Detect training loss spikes and excessive variance of detrended loss."""
    if not history or len(history) < 2:
        return {
            "evaluable": False,
            "reason": "NO_HISTORY",
            "max_spike_ratio": 0.0,
            "cv_detrended": 0.0,
            "spike_fired": False,
            "cv_fired": False,
            "fired": False,
        }

    losses = [
        float(ep["train_loss"]) if "train_loss" in ep else float(ep["val_loss"])
        for ep in history
        if "train_loss" in ep or "val_loss" in ep
    ]

    if len(losses) < 2:
        return {
            "evaluable": False,
            "reason": "INSUFFICIENT_HISTORY",
            "max_spike_ratio": 0.0,
            "cv_detrended": 0.0,
            "spike_fired": False,
            "cv_fired": False,
            "fired": False,
        }

    last_n = min(10, len(losses))
    spike_ratios: list[float] = []
    start_idx = len(losses) - last_n
    for t in range(max(1, start_idx), len(losses)):
        loss_t = losses[t]
        prev_window = losses[max(0, t - 5):t]
        if prev_window:
            med = float(np.median(prev_window))
            r = loss_t / (med + 1e-8)
            spike_ratios.append(r)

    max_spike = float(max(spike_ratios)) if spike_ratios else 0.0

    x = np.arange(len(losses), dtype=float)
    y = np.array(losses, dtype=float)
    slope, intercept = np.polyfit(x, y, deg=1)
    trend = slope * x + intercept
    detrended = y - trend
    cv_val = float(np.std(detrended) / (abs(np.mean(y)) + 1e-8))

    spike_fired = max_spike >= spike_ratio
    cv_fired = cv_val >= cv_min
    fired = spike_fired or cv_fired

    return {
        "evaluable": True,
        "max_spike_ratio": max_spike,
        "cv_detrended": cv_val,
        "spike_fired": spike_fired,
        "cv_fired": cv_fired,
        "fired": fired,
    }


def fit_linear_probe(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    model_val_acc: float,
    device: str = "cpu",
    seed: int = 1234,
) -> dict[str, Any]:
    """Fit a logistic regression probe on frozen penultimate features to detect degraded head."""
    adapter = ModelAdapter(model)
    try:
        _ = adapter.head_module()
    except Exception:
        return {
            "evaluable": False,
            "reason": "NO_IDENTIFIABLE_HEAD",
            "probe_val_acc": None,
            "probe_gain": None,
        }

    was_training = model.training
    model.eval()

    def extract_features(loader: DataLoader) -> tuple[np.ndarray, np.ndarray]:
        feats_list: list[np.ndarray] = []
        labels_list: list[np.ndarray] = []
        with torch.inference_mode():
            for batch in loader:
                x, y = batch
                x = x.to(device)
                f = adapter.features(x)
                if f.ndim > 2:
                    f = torch.flatten(f, start_dim=1)
                feats_list.append(f.cpu().numpy())
                labels_list.append(y.cpu().numpy())
        return np.concatenate(feats_list, axis=0), np.concatenate(labels_list, axis=0)

    try:
        X_train, y_train = extract_features(train_loader)
        X_val, y_val = extract_features(val_loader)
    finally:
        model.train(was_training)

    if len(np.unique(y_train)) < 2:
        return {
            "evaluable": False,
            "reason": "SINGLE_CLASS_DATA",
            "probe_val_acc": None,
            "probe_gain": None,
        }

    clf = LogisticRegression(max_iter=500, random_state=seed, solver="lbfgs")
    clf.fit(X_train, y_train)
    probe_val_acc = float(clf.score(X_val, y_val))
    probe_gain = probe_val_acc - model_val_acc

    return {
        "evaluable": True,
        "probe_val_acc": probe_val_acc,
        "model_val_acc": model_val_acc,
        "probe_gain": probe_gain,
    }
