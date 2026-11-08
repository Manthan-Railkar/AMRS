# ADR-0001: In-Process Asynchronous Job Queue

## Status
Accepted

## Context
AMRS requires asynchronous execution of model recovery runs, candidate evaluations, and comparative benchmarks. Full machine learning recovery pipelines involve iterative tensor operations, backpropagation, and multi-candidate evaluation that cannot be executed synchronously within the standard HTTP request-response cycle of web requests. 

We evaluated whether to introduce an external distributed task broker (such as Celery with Redis or RabbitMQ) versus an in-process thread pool and asyncio task coordinator.

## Decision
We implement an internal, in-process Job Coordinator (`amrs.api.jobs.JobCoordinator`) backed by `concurrent.futures.ThreadPoolExecutor` and SQLite database state persistence.

Key characteristics:
1. **Single Worker Guard**: A strict concurrency limit ensures only one active recovery run executes at a time to prevent CPU/GPU compute contention, thermal throttling, and resource starvation on developer/edge workstations.
2. **Cooperative Cancellation**: Checkpoints are inserted between recovery stages (Diagnosis, Candidate Generation, Strategy Fitting, Verification Gate). When cancellation is requested via `POST /api/v1/runs/{id}/cancel`, an atomic cancellation token is set, allowing active tasks to safely clean up intermediate tensors and commit byte-identical original weights before marking the run `cancelled`.
3. **Crash Recovery**: On application startup, the coordinator scans for runs left in `queued`, `running`, or `cancel_requested` status and marks them `failed`, preventing zombie states across service restarts.

## Consequences
- **Positive**: Zero external service dependencies (no Redis or RabbitMQ required); effortless single-container and local deployment; low memory footprint.
- **Negative**: Vertical scaling within a single container only. For multi-node cluster distribution, an external queue adapter will need to be introduced in a future release.

