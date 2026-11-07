"""SQLite connection management and transaction boundaries for AMRS."""

from __future__ import annotations

import contextlib
import sqlite3
import threading
import uuid
from collections.abc import Generator
from pathlib import Path


class Database:
    """Manages thread-safe SQLite connections, transactions, and pragma configuration."""

    def __init__(self, db_path: str = ":memory:") -> None:
        self.raw_path = db_path
        if db_path == ":memory:":
            # Use unique shared in-memory URI so multiple threads share the same database
            self.db_path = f"file:amrs_mem_{uuid.uuid4().hex}?mode=memory&cache=shared"
            self.is_uri = True
            # Keep one connection open to prevent in-memory DB destruction across thread exits
            self._keepalive: sqlite3.Connection | None = sqlite3.connect(
                self.db_path, uri=True, check_same_thread=False
            )
        else:
            self.db_path = db_path
            self.is_uri = False
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
            self._keepalive = None

        self._local = threading.local()
        self._tx_lock = threading.RLock()

    def get_connection(self) -> sqlite3.Connection:
        """Create or return a thread-local configured SQLite connection."""
        conn = getattr(self._local, "conn", None)
        if conn is None:
            conn = sqlite3.connect(
                self.db_path,
                uri=self.is_uri,
                check_same_thread=False,
                timeout=30.0,
                isolation_level=None,  # Autocommit mode; explicit transactions managed via BEGIN/COMMIT
            )
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON;")
            conn.execute("PRAGMA busy_timeout = 30000;")
            if not self.is_uri:
                conn.execute("PRAGMA journal_mode = WAL;")
            self._local.conn = conn
        return conn

    @contextlib.contextmanager
    def transaction(self) -> Generator[sqlite3.Connection, None, None]:
        """Context manager providing an atomic transaction boundary.

        Serializes write transactions across threads and executes BEGIN IMMEDIATE
        to eliminate database-is-locked deadlocks. Issues COMMIT upon normal exit
        or ROLLBACK on exceptions.
        """
        with self._tx_lock:
            conn = self.get_connection()
            conn.execute("BEGIN IMMEDIATE;")
            try:
                yield conn
                conn.execute("COMMIT;")
            except Exception:
                try:
                    conn.execute("ROLLBACK;")
                except Exception:
                    pass
                raise

    def close(self) -> None:
        """Close keepalive connection and thread-local connections."""
        if self._keepalive is not None:
            try:
                self._keepalive.close()
            except Exception:
                pass
            self._keepalive = None

        conn = getattr(self._local, "conn", None)
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass
            self._local.conn = None
