"""SQLite connection management and transaction boundaries for AMRS."""

from __future__ import annotations

import contextlib
import os
import sqlite3
from collections.abc import Generator
from pathlib import Path


class Database:
    """Manages SQLite connections, transactions, and pragma configuration."""

    def __init__(self, db_path: str = ":memory:") -> None:
        self.db_path = db_path
        if self.db_path != ":memory:":
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._connection: sqlite3.Connection | None = None

    def get_connection(self) -> sqlite3.Connection:
        """Create or return a configured SQLite connection."""
        if self.db_path == ":memory:":
            if self._connection is None:
                self._connection = self._create_connection()
            return self._connection

        # For file-based databases, create or reuse
        if self._connection is None:
            self._connection = self._create_connection()
        return self._connection

    def _create_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(
            self.db_path,
            check_same_thread=False,
            timeout=15.0,
            isolation_level=None,  # Autocommit mode; explicit transactions managed via BEGIN/COMMIT
        )
        conn.row_factory = sqlite3.Row
        # Enable foreign keys and WAL journal mode for performance and safety
        conn.execute("PRAGMA foreign_keys = ON;")
        if self.db_path != ":memory:":
            conn.execute("PRAGMA journal_mode = WAL;")
        return conn

    @contextlib.contextmanager
    def transaction(self) -> Generator[sqlite3.Connection, None, None]:
        """Context manager providing an atomic transaction boundary.

        Issues BEGIN if not already in a transaction, yields the connection,
        and issues COMMIT upon normal exit. If an exception is raised, issues
        ROLLBACK and re-raises the exception.
        """
        conn = self.get_connection()
        if not conn.in_transaction:
            conn.execute("BEGIN;")
        try:
            yield conn
            if conn.in_transaction:
                conn.execute("COMMIT;")
        except Exception:
            if conn.in_transaction:
                conn.execute("ROLLBACK;")
            raise

    def close(self) -> None:
        """Close connection if active."""
        if self._connection is not None:
            try:
                self._connection.close()
            except Exception:
                pass
            self._connection = None
