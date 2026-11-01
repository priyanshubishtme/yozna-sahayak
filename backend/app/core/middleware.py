"""HTTP middlewares for request tracking, timing, and error handling."""

import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from backend.app.core.logging import logger


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Ensures every incoming request has an X-Request-ID and logs latency."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        start_time = time.perf_counter()
        response = await call_next(request)
        process_time_ms = (time.perf_counter() - start_time) * 1000

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time-Ms"] = f"{process_time_ms:.2f}"
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Allow in-browser PDF preview / iframe embedding for verified evidence gazettes
        if "/evidence" in request.url.path or request.url.path.endswith("/pdf"):
            response.headers["X-Frame-Options"] = "SAMEORIGIN"
            response.headers["Content-Security-Policy"] = "frame-ancestors 'self' http://localhost:* http://127.0.0.1:*"
        else:
            response.headers["X-Frame-Options"] = "SAMEORIGIN"

        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Exclude noisy health endpoint from info level logs
        if not request.url.path.endswith("/health"):
            logger.info(
                f"{request.method} {request.url.path} -> {response.status_code} ({process_time_ms:.1f}ms) [req:{request_id[:8]}]"
            )

        return response
