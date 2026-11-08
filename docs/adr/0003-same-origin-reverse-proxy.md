# ADR-0003: Same-Origin Next.js Reverse Proxy Architecture

## Status
Accepted

## Context
AMRS consists of a Next.js App Router frontend on port 3000 and an internal FastAPI REST service on port 8000. 

Directly exposing the FastAPI backend port 8000 to browser clients introduces Cross-Origin Resource Sharing (CORS) preflight latencies, exposes internal microservice network topology, and complicates cookie/authentication session handling.

## Decision
We enforce a strict Same-Origin reverse-proxy architecture:
1. **Next.js Rewrite Proxy**: All browser client API requests target relative path `/api/v1/*` on origin `http://localhost:3000`. The Next.js server transparently proxies these requests upstream to `http://127.0.0.1:8000` (or Docker container network `http://api:8000`) via Next.js rewrites in `next.config.ts`.
2. **Internal Network Isolation**: In containerized deployments (`docker-compose.yml`), port 8000 is exposed only within the Docker internal bridge network (`amrs-network`) and is not bound to public host ports.
3. **Frontend Client Contract**: The frontend API client (`lib/api/client.ts`) uses relative URLs and `credentials: "same-origin"`, guaranteeing seamless network routing without CORS headers or leaked backend origins.

## Consequences
- **Positive**: Eliminates CORS preflights; unifies frontend and backend under a single ingress host; prevents unauthorized direct access to raw backend endpoints.
- **Negative**: Adds single-hop proxy latency on frontend server routes, though negligible on localhost and internal Docker bridge networks.

