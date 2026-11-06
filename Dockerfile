# AMRS Dockerfile - Multi-stage Python Backend Service (BE-6 / INF-1.2)
FROM python:3.11-slim as base

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/src

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU wheels by default (configurable via TORCH_INDEX build-arg)
ARG TORCH_INDEX=https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir torch torchvision --index-url ${TORCH_INDEX}

# Copy package dependency manifests
COPY pyproject.toml /app/

# Install Python dependencies and AMRS package
COPY src/ /app/src/
RUN pip install --no-cache-dir -e .

# Create persistent storage directories
RUN mkdir -p /app/artifacts /app/uploads /app/configs

# Copy configurations
COPY configs/ /app/configs/

# Create non-root system user for secure container execution
RUN useradd -m -u 10001 amrs && \
    chown -R amrs:amrs /app

USER amrs

# FastAPI internal service port (never exposed directly to public internet)
EXPOSE 8000

# Container healthcheck on standardized health endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Start Uvicorn ASGI server bound to internal container network
CMD ["uvicorn", "amrs.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

