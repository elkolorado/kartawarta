import os
import time
from typing import Any

import docker
from prometheus_client import Gauge, start_http_server

PORT = int(os.getenv("EXPORTER_PORT", "9100"))
INTERVAL_SECONDS = float(os.getenv("SCRAPE_INTERVAL_SECONDS", "2"))
PROJECT_LABEL = os.getenv("COMPOSE_PROJECT_LABEL", "kartawarta")

memory_usage = Gauge(
    "docker_container_memory_usage_bytes",
    "Current container memory usage in bytes from Docker stats",
    ["container", "service", "image"],
)
memory_limit = Gauge(
    "docker_container_memory_limit_bytes",
    "Container memory limit in bytes from Docker stats",
    ["container", "service", "image"],
)
cpu_percent = Gauge(
    "docker_container_cpu_percent",
    "Current container CPU percentage from Docker stats",
    ["container", "service", "image"],
)
network_rx = Gauge(
    "docker_container_network_receive_bytes_total",
    "Container network received bytes from Docker stats",
    ["container", "service", "image", "interface"],
)
network_tx = Gauge(
    "docker_container_network_transmit_bytes_total",
    "Container network transmitted bytes from Docker stats",
    ["container", "service", "image", "interface"],
)
block_read = Gauge(
    "docker_container_block_read_bytes_total",
    "Container block device read bytes from Docker stats",
    ["container", "service", "image", "device"],
)
block_write = Gauge(
    "docker_container_block_write_bytes_total",
    "Container block device written bytes from Docker stats",
    ["container", "service", "image", "device"],
)
pids = Gauge(
    "docker_container_pids",
    "Container process/thread count from Docker stats",
    ["container", "service", "image"],
)
container_up = Gauge(
    "docker_container_up",
    "Whether the Docker container is running",
    ["container", "service", "image"],
)


def _cpu_percent(stats: dict[str, Any]) -> float:
    cpu_stats = stats.get("cpu_stats", {})
    precpu_stats = stats.get("precpu_stats", {})

    cpu_delta = (
        cpu_stats.get("cpu_usage", {}).get("total_usage", 0)
        - precpu_stats.get("cpu_usage", {}).get("total_usage", 0)
    )
    system_delta = cpu_stats.get("system_cpu_usage", 0) - precpu_stats.get("system_cpu_usage", 0)
    online_cpus = cpu_stats.get("online_cpus") or len(cpu_stats.get("cpu_usage", {}).get("percpu_usage", []) or []) or 1

    if cpu_delta > 0 and system_delta > 0:
        return (cpu_delta / system_delta) * online_cpus * 100.0
    return 0.0


def _service_name(container: docker.models.containers.Container) -> str:
    labels = container.labels or {}
    return labels.get("com.docker.compose.service") or container.name


def _is_kartawarta(container: docker.models.containers.Container) -> bool:
    labels = container.labels or {}
    if labels.get("com.docker.compose.project") == PROJECT_LABEL:
        return True
    return container.name.startswith("kartawarta-")


def _image_name(container: docker.models.containers.Container) -> str:
    config_image = (container.attrs or {}).get("Config", {}).get("Image")
    if config_image:
        return config_image
    image_id = (container.attrs or {}).get("Image")
    if image_id:
        return image_id
    return "unknown"


def collect_once(client: docker.DockerClient) -> None:
    containers = client.containers.list(all=True)
    for container in containers:
        try:
            if not _is_kartawarta(container):
                continue

            container.reload()
            service = _service_name(container)
            image = _image_name(container)
            labels = [container.name, service, image]
            running = container.status == "running"
            container_up.labels(*labels).set(1 if running else 0)

            if not running:
                continue

            stats = container.stats(stream=False)
            mem_stats = stats.get("memory_stats", {})
            memory_usage.labels(*labels).set(float(mem_stats.get("usage", 0)))
            memory_limit.labels(*labels).set(float(mem_stats.get("limit", 0)))
            cpu_percent.labels(*labels).set(_cpu_percent(stats))
            pids.labels(*labels).set(float(stats.get("pids_stats", {}).get("current", 0)))

            for interface, values in (stats.get("networks") or {}).items():
                network_rx.labels(*labels, interface).set(float(values.get("rx_bytes", 0)))
                network_tx.labels(*labels, interface).set(float(values.get("tx_bytes", 0)))

            for io in stats.get("blkio_stats", {}).get("io_service_bytes_recursive", []) or []:
                device = f"{io.get('major', 'unknown')}:{io.get('minor', 'unknown')}"
                operation = str(io.get("op", "")).lower()
                value = float(io.get("value", 0))
                if operation == "read":
                    block_read.labels(*labels, device).set(value)
                elif operation == "write":
                    block_write.labels(*labels, device).set(value)
        except Exception as exc:
            print(f"failed to collect {container.name}: {exc}", flush=True)


def main() -> None:
    client = docker.from_env()
    start_http_server(PORT)
    while True:
        try:
            collect_once(client)
        except Exception as exc:
            print(f"collect failed: {exc}", flush=True)
        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
