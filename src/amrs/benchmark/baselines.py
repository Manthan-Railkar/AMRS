"""Comparative benchmark baselines implementation for AMRS (BM-1.1).

Defines standard, comparable baseline methods for model failure recovery:
1. Early Stopping: selects the best historical epoch checkpoint based on validation loss/accuracy.
2. Regularized Fine-Tuning: applies a fixed, predeclared fine-tuning recipe with weight decay and lower learning rate.
3. Full Retraining: retrains the architecture from scratch from documented initialization on train split.
4. Fixed-Strategy Recovery: executes a fixed recovery strategy (e.g. Temperature Scaling, BatchNorm Recalibration)
   unconditionally without diagnosis or adaptive candidate selection.

Adheres strictly to the benchmark protocol:
- Common result schema (`BaselineResult`).
- Common compute and time resource accounting via `ComputeMeter` (`fwd + 3 * bwd` samples and wall clock seconds).
- Validation data is used strictly for model fitting and selection; benchmark evaluation (or test holdout)
  is scored exactly once on the final selected model artifact.
- Zero privileged access to holdout data.
"""

from __future__ import annotations

import copy
import logging
import platform
import sys
from collections.abc import Sized
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
import torch
import torch.nn as nn
import yaml

from amrs.data.loaders import make_loader
from amrs.errors import HoldoutTooSmallError
from amrs.metrics.classification import accuracy, ece, nll, per_sample_correct, predict_logits
from amrs.metrics.compute import ComputeMeter
from amrs.metrics.retention import retained_correct_rate, top1_agreement
from amrs.models.loader import load_state_dict_safe
from amrs.models.registry import build
from amrs.recovery.base import RecoveryContext
from amrs.recovery.bn_recal import BnRecalibrationStrategy
from amrs.recovery.checkpoints import CheckpointReversionStrategy
from amrs.recovery.temperature import TemperatureScalingStrategy
from amrs.schemas import DataBundle

logger = logging.getLogger("amrs.benchmark.baselines")

CONFIGS_BASELINES_DIR = Path("configs/baselines")


@dataclass
class BaselineResult:
    """Standardized result schema for benchmark baseline execution."""

    scenario_id: str
    seed: int
    method: str
    accuracy: float
    ece: float
    nll: float
    retention: float
    agreement: float
    compute_units: float
    wall_s: float
    fwd_samples: int
    bwd_samples: int
    hyperparameters: dict[str, Any] = field(default_factory=dict)
    provenance: dict[str, Any] = field(default_factory=dict)
    notes: str | None = None
    accepted: bool | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert result to dictionary representation."""
        return {
            "scenario_id": self.scenario_id,
            "seed": self.seed,
            "method": self.method,
            "accuracy": round(self.accuracy, 4),
            "ece": round(self.ece, 4),
            "nll": round(self.nll, 4),
            "retention": round(self.retention, 4),
            "agreement": round(self.agreement, 4),
            "compute_units": round(self.compute_units, 2),
            "wall_s": round(self.wall_s, 3),
            "fwd_samples": self.fwd_samples,
            "bwd_samples": self.bwd_samples,
            "hyperparameters": self.hyperparameters,
            "provenance": self.provenance,
            "notes": self.notes,
            "accepted": self.accepted,
        }


def _get_system_provenance() -> dict[str, Any]:
    """Capture library and hardware versions for provenance recording."""
    return {
        "python_version": sys.version.split()[0],
        "torch_version": torch.__version__,
        "platform": platform.platform(),
        "processor": platform.processor(),
    }


def load_baseline_config(method: str) -> dict[str, Any]:
    """Load baseline hyperparameter configuration from YAML or sensible defaults."""
    cfg_file = CONFIGS_BASELINES_DIR / f"{method}.yaml"
    if cfg_file.exists():
        raw = yaml.safe_load(cfg_file.read_text(encoding="utf-8"))
        if isinstance(raw, dict):
            return raw

    defaults: dict[str, dict[str, Any]] = {
        "early_stopping": {
            "method": "early_stopping",
            "metric": "val_loss",
            "mode": "min",
        },
        "regularized_finetune": {
            "method": "regularized_finetune",
            "epochs": 5,
            "lr": 0.005,
            "weight_decay": 0.01,
            "batch_size": 32,
        },
        "full_retrain": {
            "method": "full_retrain",
            "epochs": 10,
            "lr": 0.01,
            "weight_decay": 1e-4,
            "batch_size": 32,
        },
        "fixed_strategy": {
            "method": "fixed_strategy",
            "strategy": "temperature_scaling",
        },
    }
    return defaults.get(method, {"method": method})


def run_early_stopping(
    model: nn.Module,
    data_bundle: DataBundle,
    scenario_spec: Any,
    seed: int,
    budget: float | None = None,
    device: str = "cpu",
    scenario_dir: Path | str | None = None,
    checkpoints: list[Path] | None = None,
    eval_dataset: Any = None,
    **kwargs: Any,
) -> BaselineResult:
    """Execute Early Stopping baseline by selecting best checkpoint evaluated on validation data."""
    meter = ComputeMeter()
    hparams = load_baseline_config("early_stopping")

    # Locate available checkpoints
    ckpt_paths: list[Path] = []
    if checkpoints:
        ckpt_paths = [Path(p) for p in checkpoints if Path(p).exists()]
    elif scenario_dir:
        s_dir = Path(scenario_dir)
        ckpt_paths = sorted(s_dir.glob("ckpt_epoch*.pt"))
        if not ckpt_paths and (s_dir / "final.pt").exists():
            ckpt_paths = [s_dir / "final.pt"]

    val_loader = make_loader(data_bundle.val, batch_size=64, shuffle=False)
    criterion = nn.CrossEntropyLoss()

    best_loss = float("inf")
    best_ckpt: Path | None = None
    best_model = copy.deepcopy(model).to(device)

    # Evaluate checkpoints on validation set (NOT on holdout or benchmark eval)
    for p in ckpt_paths:
        if budget is not None and meter.units >= budget:
            logger.info("Early stopping baseline reached compute budget during validation.")
            break

        cand = copy.deepcopy(model).to(device)
        sd = load_state_dict_safe(p)
        cand.load_state_dict(sd)

        # Forward evaluate validation set
        val_loss = 0.0
        val_samples = 0
        cand.eval()
        with torch.no_grad():
            for bx, by in val_loader:
                bx, by = bx.to(device), by.to(device)
                out = cand(bx)
                meter.add_fwd(len(by))
                val_loss += criterion(out, by).item() * len(by)
                val_samples += len(by)

        avg_val_loss = val_loss / max(1, val_samples)
        if avg_val_loss < best_loss:
            best_loss = avg_val_loss
            best_ckpt = p
            best_model = cand

    notes = f"Selected checkpoint: {best_ckpt.name if best_ckpt else 'initial'} with val_loss={best_loss:.4f}"

    # Final scoring once on evaluation partition
    eval_ds = eval_dataset if eval_dataset is not None else data_bundle.holdout
    return _score_baseline_model(
        orig_model=model,
        cand_model=best_model,
        eval_ds=eval_ds,
        scenario_id=getattr(scenario_spec, "id", str(scenario_spec)),
        seed=seed,
        method="early_stopping",
        meter=meter,
        hyperparams=hparams,
        notes=notes,
        device=device,
    )


def run_regularized_finetune(
    model: nn.Module,
    data_bundle: DataBundle,
    scenario_spec: Any,
    seed: int,
    budget: float | None = None,
    device: str = "cpu",
    eval_dataset: Any = None,
    **kwargs: Any,
) -> BaselineResult:
    """Execute Regularized Fine-Tuning baseline using standard L2 weight decay."""
    meter = ComputeMeter()
    hparams = load_baseline_config("regularized_finetune")

    epochs = int(hparams.get("epochs", 5))
    lr = float(hparams.get("lr", 0.005))
    weight_decay = float(hparams.get("weight_decay", 0.01))
    batch_size = int(hparams.get("batch_size", 32))

    torch.manual_seed(seed)
    np.random.seed(seed)

    cand_model = copy.deepcopy(model).to(device)
    cand_model.train()

    optimizer = torch.optim.Adam(cand_model.parameters(), lr=lr, weight_decay=weight_decay)
    criterion = nn.CrossEntropyLoss()

    train_loader = make_loader(data_bundle.train, batch_size=batch_size, shuffle=True, seed=seed)
    val_loader = make_loader(data_bundle.val, batch_size=64, shuffle=False)

    best_val_loss = float("inf")
    best_state: dict[str, torch.Tensor] = copy.deepcopy(cand_model.state_dict())
    patience = int(hparams.get("patience", 2))
    patience_counter = 0

    for _ in range(epochs):
        if budget is not None and meter.units >= budget:
            break

        cand_model.train()
        for bx, by in train_loader:
            if budget is not None and meter.units >= budget:
                break
            bx, by = bx.to(device), by.to(device)
            optimizer.zero_grad()
            out = cand_model(bx)
            loss = criterion(out, by)
            loss.backward()
            optimizer.step()

            meter.add_fwd(len(by))
            meter.add_bwd(len(by))
            meter.add_grad_step(1)

        # Evaluate on validation split for selection
        cand_model.eval()
        v_loss = 0.0
        v_total = 0
        with torch.no_grad():
            for bx, by in val_loader:
                bx, by = bx.to(device), by.to(device)
                out = cand_model(bx)
                meter.add_fwd(len(by))
                v_loss += criterion(out, by).item() * len(by)
                v_total += len(by)

        epoch_v_loss = v_loss / max(1, v_total)
        if epoch_v_loss < best_val_loss:
            best_val_loss = epoch_v_loss
            best_state = copy.deepcopy(cand_model.state_dict())
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= patience:
                break

    cand_model.load_state_dict(best_state)

    eval_ds = eval_dataset if eval_dataset is not None else data_bundle.holdout
    return _score_baseline_model(
        orig_model=model,
        cand_model=cand_model,
        eval_ds=eval_ds,
        scenario_id=getattr(scenario_spec, "id", str(scenario_spec)),
        seed=seed,
        method="regularized_finetune",
        meter=meter,
        hyperparams=hparams,
        notes=f"Best validation loss={best_val_loss:.4f}",
        device=device,
    )


def run_full_retrain(
    model: nn.Module,
    data_bundle: DataBundle,
    scenario_spec: Any,
    seed: int,
    budget: float | None = None,
    device: str = "cpu",
    eval_dataset: Any = None,
    **kwargs: Any,
) -> BaselineResult:
    """Execute Full Retraining from scratch using architecture specification and clean initialization."""
    meter = ComputeMeter()
    hparams = load_baseline_config("full_retrain")

    epochs = int(hparams.get("epochs", 10))
    lr = float(hparams.get("lr", 0.01))
    weight_decay = float(hparams.get("weight_decay", 1e-4))
    batch_size = int(hparams.get("batch_size", 32))

    torch.manual_seed(seed)
    np.random.seed(seed)

    arch_name = getattr(scenario_spec, "arch", "mlp_small")
    num_classes = getattr(scenario_spec, "num_classes", data_bundle.num_classes)
    in_shape = getattr(scenario_spec, "input_shape", data_bundle.input_shape)

    # Clean fresh model instance
    cand_model = build(arch_name, num_classes=num_classes, in_shape=in_shape).to(device)

    optimizer = torch.optim.Adam(cand_model.parameters(), lr=lr, weight_decay=weight_decay)
    criterion = nn.CrossEntropyLoss()

    train_loader = make_loader(data_bundle.train, batch_size=batch_size, shuffle=True, seed=seed)
    val_loader = make_loader(data_bundle.val, batch_size=64, shuffle=False)

    best_val_loss = float("inf")
    best_state: dict[str, torch.Tensor] = copy.deepcopy(cand_model.state_dict())

    for _ in range(epochs):
        if budget is not None and meter.units >= budget:
            break

        cand_model.train()
        for bx, by in train_loader:
            if budget is not None and meter.units >= budget:
                break
            bx, by = bx.to(device), by.to(device)
            optimizer.zero_grad()
            out = cand_model(bx)
            loss = criterion(out, by)
            loss.backward()
            optimizer.step()

            meter.add_fwd(len(by))
            meter.add_bwd(len(by))
            meter.add_grad_step(1)

        # Validation selection
        cand_model.eval()
        v_loss = 0.0
        v_total = 0
        with torch.no_grad():
            for bx, by in val_loader:
                bx, by = bx.to(device), by.to(device)
                out = cand_model(bx)
                meter.add_fwd(len(by))
                v_loss += criterion(out, by).item() * len(by)
                v_total += len(by)

        epoch_v_loss = v_loss / max(1, v_total)
        if epoch_v_loss < best_val_loss:
            best_val_loss = epoch_v_loss
            best_state = copy.deepcopy(cand_model.state_dict())

    cand_model.load_state_dict(best_state)

    eval_ds = eval_dataset if eval_dataset is not None else data_bundle.holdout
    return _score_baseline_model(
        orig_model=model,
        cand_model=cand_model,
        eval_ds=eval_ds,
        scenario_id=getattr(scenario_spec, "id", str(scenario_spec)),
        seed=seed,
        method="full_retrain",
        meter=meter,
        hyperparams=hparams,
        notes=f"Retrained from scratch for up to {epochs} epochs.",
        device=device,
    )


def run_fixed_strategy(
    model: nn.Module,
    data_bundle: DataBundle,
    scenario_spec: Any,
    seed: int,
    strategy_name: str | None = None,
    budget: float | None = None,
    device: str = "cpu",
    eval_dataset: Any = None,
    scenario_dir: Path | str | None = None,
    **kwargs: Any,
) -> BaselineResult:
    """Execute Fixed-Strategy baseline applying a non-adaptive recovery strategy unconditionally."""
    meter = ComputeMeter()
    hparams = load_baseline_config("fixed_strategy")
    strat_key = strategy_name or str(hparams.get("strategy", "temperature_scaling"))

    train_loader = make_loader(data_bundle.train, batch_size=32, shuffle=True, seed=seed)
    val_loader = make_loader(data_bundle.val, batch_size=64, shuffle=False)
    target_loader = (
        make_loader(data_bundle.target, batch_size=64, shuffle=False)
        if data_bundle.target is not None
        else val_loader
    )

    checkpoints: list[Path | str] = []
    if scenario_dir:
        s_dir = Path(scenario_dir)
        checkpoints = list(sorted(s_dir.glob("ckpt_epoch*.pt")))

    # Construct RecoveryContext (guaranteed NO holdout access)
    ctx = RecoveryContext(
        model=copy.deepcopy(model),
        train_loader=train_loader,
        val_loader=val_loader,
        target_loader=target_loader,
        checkpoints=checkpoints,
        seed=seed,
        device=device,
    )

    strat_inst: Any
    if strat_key == "temperature_scaling":
        strat_inst = TemperatureScalingStrategy()
    elif strat_key == "bn_recalibration":
        strat_inst = BnRecalibrationStrategy()
    elif strat_key in ("checkpoint_reversion", "reversion"):
        strat_inst = CheckpointReversionStrategy()
    else:
        # Default fallback to TemperatureScaling
        strat_inst = TemperatureScalingStrategy()

    cand_model, strat_result = strat_inst.apply(copy.deepcopy(model), ctx)

    # Account for strategy compute units
    if strat_result.compute_units > 0:
        meter.add_fwd(int(strat_result.compute_units))

    eval_ds = eval_dataset if eval_dataset is not None else data_bundle.holdout
    return _score_baseline_model(
        orig_model=model,
        cand_model=cand_model,
        eval_ds=eval_ds,
        scenario_id=getattr(scenario_spec, "id", str(scenario_spec)),
        seed=seed,
        method=f"fixed_strategy_{strat_key}",
        meter=meter,
        hyperparams={"strategy": strat_key, **hparams},
        notes=f"Unconditional fixed strategy {strat_key} applied.",
        device=device,
    )


def _score_baseline_model(
    orig_model: nn.Module,
    cand_model: nn.Module,
    eval_ds: Any,
    scenario_id: str,
    seed: int,
    method: str,
    meter: ComputeMeter,
    hyperparams: dict[str, Any],
    notes: str | None = None,
    device: str = "cpu",
) -> BaselineResult:
    """Evaluate final baseline model strictly ONCE on the evaluation partition."""
    eval_loader = make_loader(eval_ds, batch_size=64, shuffle=False)

    cand_model.eval()
    orig_model.eval()

    c_logits, y_eval = predict_logits(cand_model, eval_loader, device=device)
    meter.add_fwd(len(y_eval))

    o_logits, _ = predict_logits(orig_model, eval_loader, device=device)
    meter.add_fwd(len(y_eval))

    acc_val = float(accuracy(c_logits, y_eval))
    ece_val = float(ece(c_logits, y_eval))
    nll_val = float(nll(c_logits, y_eval))

    orig_corr = per_sample_correct(o_logits, y_eval)
    cand_corr = per_sample_correct(c_logits, y_eval)
    retention_val, _ = retained_correct_rate(orig_corr, cand_corr)
    agreement_val = float(top1_agreement(o_logits, c_logits))

    return BaselineResult(
        scenario_id=scenario_id,
        seed=seed,
        method=method,
        accuracy=acc_val,
        ece=ece_val,
        nll=nll_val,
        retention=retention_val,
        agreement=agreement_val,
        compute_units=meter.units,
        wall_s=meter.wall_s,
        fwd_samples=meter.fwd_samples,
        bwd_samples=meter.bwd_samples,
        hyperparameters=hyperparams,
        provenance=_get_system_provenance(),
        notes=notes,
        accepted=None,
    )


def run_baseline(
    scenario: Any,
    seed: int,
    budget: float | None = None,
    data_bundle: DataBundle | None = None,
    method: str = "early_stopping",
    model: nn.Module | None = None,
    device: str = "cpu",
    eval_dataset: Any = None,
    scenario_dir: Path | str | None = None,
    **kwargs: Any,
) -> BaselineResult:
    """Common entry point executing benchmark baselines (BM-1.1).

    Args:
        scenario: Scenario identifier (str) or `ScenarioSpec` object.
        seed: Random seed for deterministic reproducibility.
        budget: Maximum permitted compute units (`fwd + 3*bwd`).
        data_bundle: Four-way data bundle (`train`, `val`, `holdout`, `target`).
        method: Baseline algorithm name: 'early_stopping', 'regularized_finetune',
                'full_retrain', or 'fixed_strategy'.
        model: Original uncorrected PyTorch model module.
        device: 'cpu' or 'cuda'.
        eval_dataset: Optional isolated evaluation split for final scoring. If omitted,
                      uses data_bundle.holdout.
        scenario_dir: Directory containing scenario checkpoints and meta.

    Returns:
        BaselineResult conforming to the standardized benchmark result schema.
    """
    from amrs.benchmark.scenarios import ScenarioSpec, _prepare_scenario_data

    # Resolve scenario spec
    if isinstance(scenario, ScenarioSpec):
        spec = scenario
    elif isinstance(scenario, str):
        profile = kwargs.get("profile", "tiny")
        spec = ScenarioSpec.load(scenario, profile=profile)
    else:
        raise ValueError(f"Unrecognized scenario type: {type(scenario)}")

    # Resolve data bundle if not supplied
    if data_bundle is None:
        bundle, _ = _prepare_scenario_data(spec, seed=seed)
    else:
        bundle = data_bundle

    # Validate holdout size if using default holdout as eval
    holdout_len = len(bundle.holdout) if isinstance(bundle.holdout, Sized) else 0
    if (
        eval_dataset is None
        and holdout_len < 200
        and not kwargs.get("allow_small_holdout", True)
    ):
        raise HoldoutTooSmallError(
            f"Holdout dataset size ({holdout_len}) is below minimum of 200",
            details={"size": holdout_len},
        )

    # Resolve model if not supplied
    if model is None:
        if scenario_dir is not None and (Path(scenario_dir) / "final.pt").exists():
            mod = build(spec.arch, num_classes=spec.num_classes, in_shape=spec.input_shape).to(
                device
            )
            sd = load_state_dict_safe(Path(scenario_dir) / "final.pt")
            mod.load_state_dict(sd)
        else:
            mod = build(spec.arch, num_classes=spec.num_classes, in_shape=spec.input_shape).to(
                device
            )
    else:
        mod = model

    normalized_method = method.lower().strip()

    if normalized_method in ("early_stopping", "early_stop"):
        return run_early_stopping(
            model=mod,
            data_bundle=bundle,
            scenario_spec=spec,
            seed=seed,
            budget=budget,
            device=device,
            scenario_dir=scenario_dir,
            eval_dataset=eval_dataset,
            **kwargs,
        )

    elif normalized_method in ("regularized_finetune", "regularized_ft", "finetune"):
        return run_regularized_finetune(
            model=mod,
            data_bundle=bundle,
            scenario_spec=spec,
            seed=seed,
            budget=budget,
            device=device,
            eval_dataset=eval_dataset,
            **kwargs,
        )

    elif normalized_method in ("full_retrain", "retrain"):
        return run_full_retrain(
            model=mod,
            data_bundle=bundle,
            scenario_spec=spec,
            seed=seed,
            budget=budget,
            device=device,
            eval_dataset=eval_dataset,
            **kwargs,
        )

    elif normalized_method.startswith("fixed_strategy") or normalized_method in (
        "fixed",
        "fixed_temperature",
        "fixed_bn",
    ):
        strat_name = kwargs.get("strategy")
        if not strat_name and "_" in normalized_method:
            parts = normalized_method.split("_")
            if len(parts) > 2:
                strat_name = "_".join(parts[2:])
        return run_fixed_strategy(
            model=mod,
            data_bundle=bundle,
            scenario_spec=spec,
            seed=seed,
            strategy_name=strat_name,
            budget=budget,
            device=device,
            scenario_dir=scenario_dir,
            eval_dataset=eval_dataset,
            **kwargs,
        )

    else:
        raise ValueError(
            f"Unknown baseline method: '{method}'. Supported methods: "
            f"['early_stopping', 'regularized_finetune', 'full_retrain', 'fixed_strategy']."
        )
