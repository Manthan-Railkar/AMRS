# AMRS Multi-Service Dockerfile (INF-2.2 / BE-6)
# Python 3.11-slim base image for secure, lean container footprint
FROM python:3.11-slim AS base

# Prevent Python from writing bytecode and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/src

WORKDIR /app

# Install minimal OS dependencies for network probes and building packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU wheels by default (configurable via TORCH_INDEX build-arg)
ARG TORCH_INDEX=https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir torch torchvision --index-url ${TORCH_INDEX}

# Copy package dependency manifests
COPY pyproject.toml /app/

# Install AMRS package and requirements in editable mode
COPY src/ /app/src/
RUN pip install --no-cache-dir -e .

# Create persistent storage directories for artifacts, uploads, and runtime DB
RUN mkdir -p /app/artifacts /app/uploads /app/configs

# Copy default configurations
COPY configs/ /app/configs/

# Create non-root system user for secure container execution
RUN useradd -m -u 10001 amrs && \
    chown -R amrs:amrs /app

USER amrs

# Expose backend port 8000
EXPOSE 8000

ENV PORT=8000

# Container healthcheck on standardized health endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/v1/health || exit 1

# Start Uvicorn ASGI server bound to internal container network (respects cloud $PORT)
CMD ["sh", "-c", "uvicorn amrs.api.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
