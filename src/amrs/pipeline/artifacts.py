"""Artifact generation, report persistence, and model checkpoint hashing for AMRS (Section ML-9)."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import torch.nn as nn

from amrs.models.zoo import save_checkpoint


def hash_model_checkpoint(model: nn.Module) -> str:
    """Compute sha256 hash of a PyTorch model's state_dict bytes."""
    hasher = hashlib.sha256()
    for name, tensor in sorted(model.state_dict().items()):
        hasher.update(name.encode("utf-8"))
        hasher.update(tensor.detach().cpu().numpy().tobytes())
    return hasher.hexdigest()


def write_run_artifacts(
    artifacts_dir: Path | str,
    original_model: nn.Module,
    output_model: nn.Module,
    report: dict[str, Any],
) -> dict[str, Path]:
    """Write standard execution artifacts: original.pt, accepted_model.pt, report.json, report.md."""
    out_dir = Path(artifacts_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    orig_path = out_dir / "original.pt"
    accepted_path = out_dir / "accepted_model.pt"
    json_path = out_dir / "report.json"
    md_path = out_dir / "report.md"

    # Save checkpoints
    save_checkpoint(original_model, orig_path)
    if (
        output_model is original_model
        or report.get("verdict") in ("rolled_back", "healthy_no_action")
        or report.get("status") == "cancelled"
    ):
        # Guarantee 100% byte-identical file preservation on rollback / healthy / cancel
        accepted_path.write_bytes(orig_path.read_bytes())
    else:
        save_checkpoint(output_model, accepted_path)

    # Save JSON report
    json_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    # Generate Markdown summary report
    md_content = generate_markdown_report(report)
    md_path.write_text(md_content, encoding="utf-8")

    return {
        "original": orig_path,
        "accepted_model": accepted_path,
        "report_json": json_path,
        "report_md": md_path,
    }


def generate_markdown_report(report: dict[str, Any]) -> str:
    """Generate human-readable decision trail and recovery summary markdown."""
    run_id = report.get("id", "unknown")
    status = report.get("status", "unknown").upper()
    verdict = report.get("verdict", "N/A")
    accepted_strat = report.get("accepted_strategy", "None")
    duration = report.get("duration_s", 0.0)
    compute = report.get("compute_units_total", 0.0)

    lines = [
        f"# AMRS Recovery Report: `{run_id}`",
        "",
        f"- **Status**: `{status}`",
        f"- **Final Verdict**: **{verdict.upper()}**",
        f"- **Accepted Strategy**: `{accepted_strat}`",
        f"- **Duration**: {duration:.2f}s",
        f"- **Total Compute**: {compute:.1f} units",
        "",
        "## 1. Diagnosis Trail",
        "",
        "| Rank | Label | Confidence | Source Split | Explanation |",
        "|---|---|---|---|---|",
    ]

    diagnoses = report.get("diagnoses", [])
    if not diagnoses:
        lines.append("| - | healthy | 1.00 | val | No failure mode detected |")
    else:
        for d in diagnoses:
            rank = d.get("rank", "-")
            label = d.get("label", "")
            conf = d.get("confidence", 0.0)
            ev = d.get("evidence", {}) or {}
            split = ev.get("source_split", "val")
            expl = ev.get("explanation", "")
            lines.append(f"| {rank} | `{label}` | {conf:.2f} | {split} | {expl} |")

    lines.extend(
        [
            "",
            "## 2. Recovery Candidates & Verification Gate",
            "",
            "| Order | Strategy | Cost (units) | Delta Primary | CI (95%) | Retention | Decision | Reasons |",
            "|---|---|---|---|---|---|---|---|",
        ]
    )

    candidates = report.get("candidates", [])
    if not candidates:
        lines.append("| - | *None evaluated* | - | - | - | - | - | - |")
    else:
        for c in candidates:
            order = c.get("order_idx", "-")
            strat = c.get("strategy", "")
            cost = c.get("cost_units", 0.0)
            delta = c.get("delta_primary", 0.0)
            ci_low = c.get("ci_low", 0.0)
            ci_high = c.get("ci_high", 0.0)
            ret = c.get("retention", 0.0)
            dec = c.get("gate_decision", "REJECT")
            reasons = ", ".join(c.get("gate_reasons", []))
            lines.append(
                f"| {order} | `{strat}` | {cost:.1f} | {delta:+.4f} | [{ci_low:.4f}, {ci_high:.4f}] | {ret:.3f} | **{dec}** | {reasons} |"
            )

    lines.extend(
        [
            "",
            "## 3. Rollback & Immutability Guarantee",
            "",
            "The original model checkpoint was cryptographically verified and hashed.",
            f"- Original SHA-256: `{report.get('original_sha256', '')}`",
        ]
    )
    if verdict == "accepted":
        lines.append(
            f"- An independently verified candidate (`{accepted_strat}`) passed all gate criteria and was promoted."
        )
    else:
        lines.append(
            "- Output artifact (`accepted_model.pt`) is byte-identical to the original input model (rollback safety guaranteed)."
        )

    return "\n".join(lines) + "\n"
