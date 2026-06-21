import time

from fastapi import Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import Response as StarletteResponse

SERVICE_NAME = "vision"

REQUESTS_TOTAL = Counter(
    "kartawarta_api_requests_total",
    "Total HTTP requests handled by Kartawarta services.",
    ["service", "method", "route", "status_code"],
)

REQUEST_DURATION_SECONDS = Histogram(
    "kartawarta_api_request_duration_seconds",
    "HTTP request duration in seconds for Kartawarta services.",
    ["service", "method", "route", "status_code"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30),
)

REQUESTS_IN_PROGRESS = Gauge(
    "kartawarta_api_requests_in_progress",
    "HTTP requests currently in progress for Kartawarta services.",
    ["service", "method", "route"],
)


def _route_label(request: Request) -> str:
    route = request.scope.get("route")
    if route is not None and getattr(route, "path", None):
        return route.path
    return request.url.path


async def metrics_middleware(request: Request, call_next: RequestResponseEndpoint) -> StarletteResponse:
    if request.url.path == "/metrics":
        return await call_next(request)

    method = request.method
    in_progress_route = request.url.path
    route = in_progress_route
    start = time.perf_counter()
    status_code = "500"

    REQUESTS_IN_PROGRESS.labels(SERVICE_NAME, method, in_progress_route).inc()
    try:
        response = await call_next(request)
        route = _route_label(request)
        status_code = str(response.status_code)
        return response
    except Exception:
        route = _route_label(request)
        raise
    finally:
        duration = time.perf_counter() - start
        REQUESTS_IN_PROGRESS.labels(SERVICE_NAME, method, in_progress_route).dec()
        REQUESTS_TOTAL.labels(SERVICE_NAME, method, route, status_code).inc()
        REQUEST_DURATION_SECONDS.labels(SERVICE_NAME, method, route, status_code).observe(duration)


def metrics_response() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
