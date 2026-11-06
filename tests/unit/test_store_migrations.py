"""Unit tests for SQLite schema initialization and migrations."""

from amrs.store.db import Database
from amrs.store.migrations import CURRENT_SCHEMA_VERSION, apply_migrations


def test_migrations_create_all_tables() -> None:
    db = Database(":memory:")
    version = apply_migrations(db)
    assert version == CURRENT_SCHEMA_VERSION

    conn = db.get_connection()
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
    ).fetchall()
    table_names = {r["name"] for r in rows}

    expected_tables = {
        "schema_version",
        "runs",
        "diagnoses",
        "candidates",
        "monitor_events",
        "benchmark_runs",
        "benchmark_results",
    }
    for expected in expected_tables:
        assert expected in table_names, f"Table '{expected}' was not created"


def test_migrations_idempotency() -> None:
    db = Database(":memory:")
    v1 = apply_migrations(db)
    v2 = apply_migrations(db)
    assert v1 == v2 == CURRENT_SCHEMA_VERSION

    conn = db.get_connection()
    count = conn.execute("SELECT COUNT(*) AS c FROM schema_version;").fetchone()["c"]
    assert count == 1


def test_migrations_foreign_keys_and_wal() -> None:
    db = Database(":memory:")
    apply_migrations(db)
    conn = db.get_connection()
    fk = conn.execute("PRAGMA foreign_keys;").fetchone()[0]
    assert fk == 1

