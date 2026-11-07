# AMRS API Specification

The AMRS backend provides a RESTful API powered by FastAPI with SQLite persistence and private artifact storage.

## Endpoints

### Health & Config
- `GET /api/v1/health`: System health and worker status.
- `GET /api/v1/config`: Active system configuration.

### Runs & Recovery
- `POST /api/v1/runs`: Create and enqueue a recovery run.
- `GET /api/v1/runs`: List recovery runs with pagination and filtering.
- `GET /api/v1/runs/{id}`: Detailed telemetry, candidate evaluations, and gate verdict.
- `POST /api/v1/runs/{id}/cancel`: Cancel an active recovery run.

### Scenarios
- `GET /api/v1/scenarios`: List available failure scenarios (S1-S6).
- `POST /api/v1/scenarios/build`: Trigger synthetic failure scenario generation.

### Benchmarks
- `POST /api/v1/benchmarks`: Enqueue comparative benchmark job.
- `GET /api/v1/benchmarks/{id}`: Detailed benchmark comparison results against baselines.

### Models & Zoo
- `GET /api/v1/models`: List registered model architectures and checkpoints.
- `POST /api/v1/models/upload`: Upload quarantined model checkpoint.

