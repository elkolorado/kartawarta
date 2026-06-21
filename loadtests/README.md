# Kartawarta load testing and container monitoring

This folder contains k6 load tests and a monitoring stack for estimating VPS requirements.

## Start the app with monitoring

From the repository root:

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d --build
```

Open dashboards/tools:

- Frontend: <http://localhost:8081>
- cAdvisor live container metrics: <http://localhost:8082>
- Prometheus: <http://localhost:9090>
- Grafana: <http://localhost:3001>
  - user: `admin`
  - password: `admin`

Grafana is provisioned with Prometheus automatically. Open:

```text
Dashboards -> Kartawarta -> Kartawarta Container Metrics
```

Use this built-in dashboard for VPS sizing. It reads the `docker-stats-exporter` metrics and should show named containers like `kartawarta-backend`, `kartawarta-vision`, `kartawarta-frontend`, and `kartawarta-sqlserver`.

Imported cAdvisor dashboards can show `No data` on Docker Desktop/Windows because cAdvisor may expose only aggregate Docker VM metrics instead of named containers.

## Quick live stats

For a terminal-only view:

```bash
docker stats
```

One snapshot:

```bash
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}\t{{.PIDs}}"
```

## Simulate a 2 vCore / 4 GB RAM VPS

The repository includes a Docker Compose override that caps containers to roughly fit a small VPS:

- 2 vCore
- 4 GB RAM
- Debian 12 + Docker
- 40 GB SSD
- 200 Mbps public network

Start the stack with the VPS limits:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.monitoring.yml \
  -f docker-compose.vps-2vcpu-4gb.yml \
  up -d --build
```

Open Grafana:

```text
http://localhost:3001
Dashboards -> Kartawarta -> Kartawarta Container Metrics
Dashboards -> Kartawarta -> Kartawarta API Metrics
```

Run load tests while the VPS-limited stack is running. If containers are OOM-killed, restart repeatedly, or p95 latency grows too much under normal expected traffic, the VPS is too small or the service limits need tuning.

Check container restarts/OOM state:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
docker inspect kartawarta-vision kartawarta-backend kartawarta-sqlserver --format '{{.Name}} OOM={{.State.OOMKilled}} Restarting={{.State.Restarting}} Exit={{.State.ExitCode}}'
```

Important: Docker Desktop on Windows still runs inside a WSL VM. This profile limits the containers, but for a closer test also set Docker Desktop resource limits to **2 CPUs** and **4 GB RAM** in Docker Desktop settings.

The profile reserves capacity for OS/Docker overhead by limiting app + monitoring containers below the full 4 GB. It also reduces the vision matching concurrency with `VISION_MATCH_CONCURRENCY=2`.

## Run backend/API load test

```bash
docker run --rm -i grafana/k6 run - < loadtests/api-smoke.js
```

Use a different frontend base URL or TCG:

```bash
docker run --rm -i \
  -e BASE_URL=http://host.docker.internal:8081 \
  -e TCG_NAME=Riftbound \
  grafana/k6 run - < loadtests/api-smoke.js
```

## Run vision image-match load test

Put a realistic card image at:

```text
loadtests/imgs/sample.jpg
```

Then run in Git Bash:

```bash
MSYS_NO_PATHCONV=1 docker run --rm -i \
  -v "$(pwd -W)/loadtests:/loadtests" \
  -e BASE_URL=http://host.docker.internal:8081 \
  -e TCG_NAME=Riftbound \
  -e IMAGE_PATH=/loadtests/imgs/sample.jpg \
  grafana/k6 run /loadtests/vision-match.js
```

On PowerShell, use `${PWD}` instead of `$PWD` if needed:

```powershell
docker run --rm -i `
  -v "${PWD}/loadtests:/loadtests" `
  -e BASE_URL=http://host.docker.internal:8081 `
  -e TCG_NAME=Riftbound `
  -e IMAGE_PATH=/loadtests/imgs/sample.jpg `
  grafana/k6 run /loadtests/vision-match.js
```

## Ingestion stress test

Run ingestion while monitoring `docker stats`, cAdvisor, or Grafana:

```bash
docker compose --profile ingestion up --build ingest-dbs ingest-riftbound
```

Run one at a time:

```bash
docker compose --profile ingestion up --build ingest-dbs
```

```bash
docker compose --profile ingestion up --build ingest-riftbound
```

## What to record for VPS sizing

Record peak values during each scenario:

- Idle stack RAM and CPU
- Backend/API load RAM and CPU
- Vision matching RAM and CPU
- Ingestion RAM, CPU, network, and disk I/O
- Full worst-case: API load + vision load + ingestion together

Recommended VPS sizing rule:

```text
VPS RAM >= observed peak RAM * 1.5 to 2
```

For CPU, check sustained CPU during load. If containers stay near 100% CPU and response times rise, choose more vCPU.
