"""Unit tests and smoke tests for AMRS CLI commands (BE-6).

Verifies:
1. `amrs --version`
2. `amrs diagnose` (text and json output)
3. `amrs recover` (execution and custom code guard)
4. `amrs monitor-replay` (series and event output)
5. `amrs benchmark` (result table output)
6. `amrs scenarios build` (scenario artifact generation)
"""

from __future__ import annotations

import json
from pathlib import Path
import pytest

from amrs import __version__
from amrs.cli import create_parser, main


def test_cli_version(capsys: pytest.CaptureFixture) -> None:
    parser = create_parser()
    with pytest.raises(SystemExit) as exc:
        parser.parse_args(["-v"])
    assert exc.value.code == 0
    captured = capsys.readouterr()
    assert f"AMRS {__version__}" in captured.out


def test_cli_diagnose_text_and_json(capsys: pytest.CaptureFixture) -> None:
    # Text format
    rc = main(["diagnose", "--scenario", "s1_overfit", "--format", "text"])
    assert rc == 0
    captured = capsys.readouterr()
    assert "AMRS Diagnosis Report: s1_overfit" in captured.out
    assert "OVERFITTING" in captured.out

    # JSON format
    rc_json = main(["diagnose", "--scenario", "s2_miscalibration", "--format", "json"])
    assert rc_json == 0
    captured_json = capsys.readouterr()
    parsed = json.loads(captured_json.out)
    assert parsed["scenario_id"] == "s2_miscalibration"
    assert parsed["diagnoses"][0]["label"] == "miscalibration"


def test_cli_recover_execution(capsys: pytest.CaptureFixture, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AMRS_ARTIFACTS_ROOT", str(tmp_path / "artifacts"))
    monkeypatch.setenv("AMRS_DB_PATH", str(tmp_path / "cli_test.db"))

    rc = main(["recover", "--scenario", "s1_overfit", "--seed", "1234", "--format", "json"])
    assert rc == 0
    captured = capsys.readouterr()
    parsed = json.loads(captured.out)
    assert parsed["status"] == "succeeded"
    assert parsed["verdict"] == "accepted"
    assert parsed["accepted_strategy"] == "checkpoint_reversion"


def test_cli_recover_custom_module_without_flag_fails(capsys: pytest.CaptureFixture) -> None:
    rc = main(["recover", "--model-module", "custom.py:factory"])
    assert rc == 1
    captured = capsys.readouterr()
    assert "Custom model modules require --allow-custom-code" in captured.err


def test_cli_monitor_replay(capsys: pytest.CaptureFixture) -> None:
    rc = main(["monitor-replay", "--scenario", "s1_overfit", "--format", "json"])
    assert rc == 0
    captured = capsys.readouterr()
    parsed = json.loads(captured.out)
    assert "replay_id" in parsed
    assert "series" in parsed
    assert "events" in parsed


def test_cli_benchmark(capsys: pytest.CaptureFixture) -> None:
    rc = main(["benchmark", "--scenarios", "s1_overfit", "s2_miscalibration", "--format", "json"])
    assert rc == 0
    captured = capsys.readouterr()
    parsed = json.loads(captured.out)
    assert "benchmark_id" in parsed
    assert len(parsed["results"]) > 0


def test_cli_scenarios_build(tmp_path: Path, capsys: pytest.CaptureFixture) -> None:
    out_dir = str(tmp_path / "scenarios")
    rc = main(["scenarios", "build", "--id", "s1_overfit", "--profile", "tiny", "--seeds", "0", "--out-dir", out_dir, "--format", "json"])
    assert rc == 0
    captured = capsys.readouterr()
    parsed = json.loads(captured.out)
    assert len(parsed) == 1
    assert parsed[0]["scenario_id"] == "s1_overfit"
    assert Path(parsed[0]["artifact_path"]).exists()

