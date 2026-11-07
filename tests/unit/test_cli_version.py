"""Test for AMRS CLI version output."""

from __future__ import annotations

import subprocess
import sys

import pytest

from amrs.cli import create_parser, main


def test_cli_version_flag_via_parser(capsys: pytest.CaptureFixture[str]) -> None:
    """Verify --version flag prints 0.1.0 using parser."""
    parser = create_parser()
    with pytest.raises(SystemExit) as exc:
        parser.parse_args(["--version"])
    assert exc.value.code == 0
    captured = capsys.readouterr()
    assert "0.1.0" in captured.out


def test_cli_version_flag_via_main(capsys: pytest.CaptureFixture[str]) -> None:
    """Verify main(['--version']) prints version and exits cleanly."""
    with pytest.raises(SystemExit) as exc:
        main(["--version"])
    assert exc.value.code == 0
    captured = capsys.readouterr()
    assert "0.1.0" in captured.out


def test_cli_version_subprocess() -> None:
    """Verify running the CLI as a module via subprocess prints 0.1.0."""
    result = subprocess.run(
        [sys.executable, "-m", "amrs.cli", "--version"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0
    assert "0.1.0" in result.stdout
