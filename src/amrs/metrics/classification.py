"""Classification performance metrics: Accuracy, Negative Log-Likelihood (NLL), and Expected Calibration Error (ECE)."""

from __future__ import annotations

import numpy as np
import torch
import torch.nn.functional as F


def predict_logits(
    model: torch.nn.Module,
    loader: torch.utils.data.DataLoader | list[tuple[torch.Tensor, torch.Tensor]],
    device: str = "cpu",
) -> tuple[torch.Tensor, torch.Tensor]:
    """Extract predictions and targets across all batches in eval mode without gradients."""
    model.eval()
    all_logits: list[torch.Tensor] = []
    all_labels: list[torch.Tensor] = []

    with torch.inference_mode():
        for batch in loader:
            if isinstance(batch, (list, tuple)) and len(batch) == 2:
                x, y = batch
                if isinstance(x, dict):
                    x_dev = {
                        k: v.to(device) if isinstance(v, torch.Tensor) else v for k, v in x.items()
                    }
                    logits = model(**x_dev)
                else:
                    x = x.to(device)
                    logits = model(x)
                y = y.to(device)
            elif isinstance(batch, dict):
                label_key = "labels" if "labels" in batch else "label"
                y = batch[label_key].to(device)
                inputs = {
                    k: v.to(device) if isinstance(v, torch.Tensor) else v
                    for k, v in batch.items()
                    if k != label_key
                }
                logits = model(**inputs)
            else:
                x, y = batch
                x = x.to(device)
                y = y.to(device)
                logits = model(x)

            if hasattr(logits, "logits"):
                logits = logits.logits

            all_logits.append(logits.cpu())
            all_labels.append(y.cpu())

    if not all_logits:
        raise ValueError("Cannot compute predictions on an empty data loader.")

    return torch.cat(all_logits, dim=0), torch.cat(all_labels, dim=0)


def per_sample_correct(logits: torch.Tensor, y: torch.Tensor) -> np.ndarray:
    """Return boolean array of whether each sample was predicted correctly."""
    preds = torch.argmax(logits, dim=-1)
    return (preds == y).cpu().numpy()


def accuracy(logits: torch.Tensor, y: torch.Tensor) -> float:
    """Compute top-1 classification accuracy."""
    if len(logits) == 0:
        raise ValueError("Cannot compute accuracy on empty inputs.")
    correct = per_sample_correct(logits, y)
    return float(np.mean(correct))


def nll(logits: torch.Tensor, y: torch.Tensor) -> float:
    """Compute numerically stable negative log-likelihood (cross entropy loss)."""
    if len(logits) == 0:
        raise ValueError("Cannot compute NLL on empty inputs.")
    loss = F.cross_entropy(logits, y, reduction="mean")
    return float(loss.item())


def ece(logits: torch.Tensor, y: torch.Tensor, n_bins: int = 15) -> float:
    """Compute Expected Calibration Error (ECE) using equal-width bins on top-label confidence.

    Bins partition [0, 1] into n_bins intervals.
    """
    if len(logits) == 0:
        raise ValueError("Cannot compute ECE on empty inputs.")

    probs = F.softmax(logits.double(), dim=-1)
    confidences, predictions = torch.max(probs, dim=-1)
    accuracies = (predictions == y).double()

    conf_np = confidences.cpu().numpy()
    acc_np = accuracies.cpu().numpy()
    n_samples = len(conf_np)

    bin_boundaries = np.linspace(0.0, 1.0, n_bins + 1)
    ece_val = 0.0

    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]

        # Use [lower, upper] for final bin, [lower, upper) for earlier bins
        if i == n_bins - 1:
            in_bin = (conf_np >= bin_lower) & (conf_np <= bin_upper)
        else:
            in_bin = (conf_np >= bin_lower) & (conf_np < bin_upper)

        bin_count = int(np.sum(in_bin))
        if bin_count > 0:
            bin_acc = float(np.mean(acc_np[in_bin]))
            bin_conf = float(np.mean(conf_np[in_bin]))
            ece_val += (bin_count / n_samples) * abs(bin_acc - bin_conf)

    return float(ece_val)


def metric_bundle(logits: torch.Tensor, y: torch.Tensor, n_bins: int = 15) -> dict[str, float]:
    """Compute standard classification evaluation metric bundle."""
    return {
        "accuracy": accuracy(logits, y),
        "nll": nll(logits, y),
        "ece": ece(logits, y, n_bins=n_bins),
        "n": float(len(y)),
    }
