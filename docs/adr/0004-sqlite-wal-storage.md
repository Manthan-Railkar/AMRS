# ADR-0004: SQLite with Write-Ahead Logging (WAL) Storage

## Status
Accepted

## Context
AMRS requires persistent tracking of recovery runs, candidate summaries, diagnostic probe results, live monitor events, and benchmark evaluations. 

We evaluated whether to require an external relational database service (such as PostgreSQL) versus an embedded relational storage engine.

## Decision
We select SQLite with Write-Ahead Logging (`PRAGMA journal_mode = WAL`) and strict foreign key enforcement (`PRAGMA foreign_keys = ON`).

Key architectural choices:
1. **Embedded Zero-Configuration**: SQLite requires no external database daemon, background service, or network socket configuration, allowing seamless CLI and local developer experience.
2. **Concurrent Read Concurrency**: WAL mode permits concurrent non-blocking readers alongside a single active writer thread, aligning perfectly with the single-worker execution architecture of AMRS.
3. **Repository Pattern & Migrations**: All database operations are encapsulated in `amrs.store.repository.RunRepository` and `BenchmarkRepository`, backed by versioned schema migrations (`amrs.store.migrations`), ensuring clear schema evolution and strict isolation from domain models.

## Consequences
- **Positive**: Lightweight, crash-resilient, single-file database (`amrs.db`), trivially backupable and inspectable via standard SQLite CLI tools.
- **Negative**: Concurrency is limited to single-writer access, which matches AMRS's single-worker job queue design.

