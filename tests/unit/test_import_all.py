"""Test that all modules in the amrs package can be imported successfully."""

from __future__ import annotations

import importlib
from pathlib import Path
from typing import List

import amrs


def test_import_all_modules() -> None:
    """Recursively discover and import every module under the amrs package."""
    imported_modules: List[str] = []
    amrs_path = Path(amrs.__file__).parent

    for py_file in amrs_path.rglob("*.py"):
        if py_file.name.startswith("."):
            continue
        rel = py_file.relative_to(amrs_path)
        parts = list(rel.with_suffix("").parts)
        if parts and parts[-1] == "__init__":
            parts.pop()
        modname = "amrs." + ".".join(parts) if parts else "amrs"

        # Skip heavy optional transformer extension to keep unit tests fast and portable
        if "transformer" in modname:
            continue

        importlib.import_module(modname)
        imported_modules.append(modname)

    # Assert critical Section 4.4 subpackages are present and imported
    expected_subpackages = [
        "amrs.utils",
        "amrs.data",
        "amrs.models",
        "amrs.metrics",
        "amrs.diagnosis",
        "amrs.recovery",
        "amrs.selector",
        "amrs.evaluation",
        "amrs.pipeline",
        "amrs.monitor",
        "amrs.store",
        "amrs.benchmark",
        "amrs.api",
    ]
    for sp in expected_subpackages:
        assert any(m == sp or m.startswith(f"{sp}.") for m in imported_modules), f"Missing {sp}"
