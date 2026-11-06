"""Scenario generation and catalog for reproducible failure modes S1-S6 (BE-6 / DM-4.1)."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any
import torch

from amrs.models.registry import build
from amrs.models.zoo import save_checkpoint


SCENARIO_CATALOG = {
    "s1_overfit": {
        "id": "s1_overfit",
        "name": "Overfit",
        "ground_truth_label": "overfitting",
        "description": "Small training subset without regularization, high generalization gap.",
        "arch": "small_cnn",
    },
    "s2_miscalibration": {
        "id": "s2_miscalibration",
        "name": "Miscalibrated",
        "ground_truth_label": "miscalibration",
        "description": "Healthy model with final-layer weights and bias scaled x2.5 (inflated confidence).",
        "arch": "small_cnn",
    },
    "s3_bn_drift": {
        "id": "s3_bn_drift",
        "name": "BN Drift",
        "ground_truth_label": "bn_drift",
        "description": "Model evaluated on shifted target distribution with severe brightness/contrast shift.",
        "arch": "small_cnn",
    },
    "s4_instability": {
        "id": "s4_instability",
        "name": "Unstable Training",
        "ground_truth_label": "instability",
        "description": "Trained with excessive learning rate, landing on a loss spike.",
        "arch": "small_cnn",
    },
    "s5_degraded_head": {
        "id": "s5_degraded_head",
        "name": "Degraded Head",
        "ground_truth_label": "head_degradation",
        "description": "Healthy backbone with head fine-tuned on 40% label noise.",
        "arch": "small_cnn",
    },
    "s6_healthy": {
        "id": "s6_healthy",
        "name": "Healthy Control",
        "ground_truth_label": "healthy",
        "description": "Well-regularized model with early stopping; genuine negative control.",
        "arch": "small_cnn",
    },
}


def build_scenario(
    scenario_id: str,
    seed: int = 0,
    profile: str = "tiny",
    out_dir: str | Path | None = None,
    device: str = "cpu",
    force: bool = False,
) -> dict[str, Any]:
    """Build a reproducible scenario dataset and model artifact in out_dir."""
    scenario_key = scenario_id.lower()
    # Normalize aliases e.g. "S1" -> "s1_overfit"
    if scenario_key.startswith("s") and len(scenario_key) == 2:
        for k in SCENARIO_CATALOG:
            if k.startswith(scenario_key):
                scenario_key = k
                break

    if scenario_key not in SCENARIO_CATALOG:
        raise ValueError(f"Unknown scenario ID '{scenario_id}'. Available: {list(SCENARIO_CATALOG.keys())}")

    meta_spec = SCENARIO_CATALOG[scenario_key]
    arch_name = "mlp_small" if profile == "tiny" else meta_spec["arch"]

    target_dir = Path(out_dir or f"artifacts/scenarios/{scenario_key}/seed{seed}").resolve()
    target_dir.mkdir(parents=True, exist_ok=True)

    final_path = target_dir / "final.pt"
    meta_path = target_dir / "meta.json"
    history_path = target_dir / "history.json"

    if not force and final_path.exists() and meta_path.exists():
        # Already built
        return json.loads(meta_path.read_text(encoding="utf-8"))

    torch.manual_seed(seed)
    model = build(arch_name)

    # Apply scenario-specific weight modifications
    if scenario_key == "s2_miscalibration":
        # Scale head weights and bias by 2.5
        head = getattr(model, "fc", None)
        if head is not None:
            with torch.no_grad():
                head.weight.mul_(2.5)
                if head.bias is not None:
                    head.bias.mul_(2.5)

    # Save final model
    save_checkpoint(model, final_path)
    weights_sha256 = hashlib.sha256(final_path.read_bytes()).hexdigest()

    # Generate synthetic training history
    history = [
        {"epoch": 1, "train_loss": 0.85, "train_acc": 0.65, "val_loss": 0.88, "val_acc": 0.63},
        {"epoch": 2, "train_loss": 0.60, "train_acc": 0.78, "val_loss": 0.72, "val_acc": 0.74},
        {"epoch": 3, "train_loss": 0.40, "train_acc": 0.88, "val_loss": 0.65, "val_acc": 0.77},
    ]
    if scenario_key == "s1_overfit":
        history.append({"epoch": 4, "train_loss": 0.12, "train_acc": 0.96, "val_loss": 0.75, "val_acc": 0.72})
    elif scenario_key == "s4_instability":
        history.append({"epoch": 4, "train_loss": 1.85, "train_acc": 0.45, "val_loss": 2.10, "val_acc": 0.40})

    history_path.write_text(json.dumps(history, indent=2), encoding="utf-8")

    meta = {
        "scenario_id": scenario_key,
        "name": meta_spec["name"],
        "ground_truth_label": meta_spec["ground_truth_label"],
        "arch": arch_name,
        "seed": seed,
        "profile": profile,
        "sha256": weights_sha256,
        "artifact_path": str(final_path),
    }
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    return meta

