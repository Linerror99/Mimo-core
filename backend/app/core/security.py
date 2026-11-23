"""Security middleware for HTTP headers, CORS, and rate limiting."""

import time
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Callable, Optional

from fastapi import FastAPI, Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware

from app.core.logger import logger


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add security headers to all responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Add security headers to response."""
        response = await call_next(request)

        # HSTS: Force HTTPS for 1 year
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # XSS Protection (legacy but still useful)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' data: blob: https:; "
            "style-src 'self' 'unsafe-inline'; "
            "script-src 'self'; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        )

        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions Policy (formerly Feature-Policy)
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=()"
        )

        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all HTTP requests with duration."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Log request and response details."""
        start_time = time.time()

        # Get client IP (handle proxies)
        client_ip = request.client.host if request.client else "unknown"
        if "x-forwarded-for" in request.headers:
            client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()

        # Process request
        response = await call_next(request)

        # Calculate duration
        duration_ms = round((time.time() - start_time) * 1000, 2)

        # Log request (without sensitive data)
        log_data = {
            "endpoint": request.url.path,
            "method": request.method,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "ip": client_ip,
        }

        # Don't log Authorization header or query params (may contain tokens)

        # Log with appropriate level
        if response.status_code >= 500:
            logger.error(f"Request failed: {request.method} {request.url.path}", extra=log_data)
        elif response.status_code >= 400:
            logger.warning(f"Client error: {request.method} {request.url.path}", extra=log_data)
        else:
            logger.info(f"Request: {request.method} {request.url.path}", extra=log_data)

        return response


AUTH_RATE_LIMITED_PATHS = frozenset(
    {
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/auth/forgot-password",
        "/api/v1/auth/verify-reset-code",
        "/api/v1/auth/reset-password",
    }
)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware to prevent abuse & brute-force attacks.
    Uses Redis for distributed state across Cloud Run instances,
    with automatic fallback to in-memory if Redis is unavailable.

    Limits:
    - Global: 100 requests per minute per IP address (burst: 20/s)
    - Auth endpoints (POST login/register/forgot-password/reset-password):
      strict brute-force window (default 10 requests / 15 min in production)
    """

    def __init__(
        self,
        app: FastAPI,
        requests_per_minute: int = 100,
        burst_limit: int = 20,
        auth_requests_per_window: Optional[int] = None,
        auth_window_seconds: int = 900,
    ):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.burst_limit = burst_limit
        self.auth_requests_per_window = auth_requests_per_window
        self.auth_window_seconds = auth_window_seconds

        # Fallback in-memory storage: {ip: [(timestamp, count), ...]}
        self.request_history: dict[str, list[tuple[datetime, int]]] = defaultdict(list)
        self.auth_request_history: dict[str, list[datetime]] = defaultdict(list)
        self._redis_client = None

    def _get_redis(self):
        if self._redis_client is None:
            try:
                import redis.asyncio as aioredis
                from app.config import settings
                self._redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            except Exception as e:
                logger.warning(f"Could not initialize Redis client for RateLimit: {e}")
        return self._redis_client

    def _clean_old_requests(self, ip: str, current_time: datetime) -> None:
        """Remove requests older than 1 minute in memory fallback."""
        one_minute_ago = current_time - timedelta(minutes=1)
        self.request_history[ip] = [
            (ts, count) for ts, count in self.request_history[ip]
            if ts > one_minute_ago
        ]

    def _check_rate_limit_memory(self, ip: str, current_time: datetime) -> tuple[bool, int]:
        """Fallback memory-based rate limit."""
        self._clean_old_requests(ip, current_time)
        total_requests = sum(count for _, count in self.request_history[ip])
        one_second_ago = current_time - timedelta(seconds=1)
        recent_requests = sum(
            count for ts, count in self.request_history[ip]
            if ts > one_second_ago
        )
        if recent_requests >= self.burst_limit or total_requests >= self.requests_per_minute:
            return False, total_requests
        self.request_history[ip].append((current_time, 1))
        return True, total_requests

    async def _check_rate_limit_redis(self, ip: str, current_time: datetime) -> tuple[bool, int]:
        """Distributed rate limiting via Redis."""
        redis = self._get_redis()
        if not redis:
            return self._check_rate_limit_memory(ip, current_time)

        try:
            minute_key = f"ratelimit:{ip}:{current_time.strftime('%Y%m%d%H%M')}"
            second_key = f"ratelimit_burst:{ip}:{current_time.strftime('%Y%m%d%H%M%S')}"

            # Pipeline to increment both counters atomically
            async with redis.pipeline(transaction=True) as pipe:
                pipe.incr(minute_key)
                pipe.expire(minute_key, 65)
                pipe.incr(second_key)
                pipe.expire(second_key, 5)
                results = await pipe.execute()

            minute_count = results[0]
            second_count = results[2]

            if second_count > self.burst_limit or minute_count > self.requests_per_minute:
                return False, minute_count

            return True, minute_count
        except Exception as e:
            logger.debug(f"Redis rate limiting failed, falling back to memory: {e}")
            return self._check_rate_limit_memory(ip, current_time)

    def _check_auth_rate_limit_memory(
        self, ip: str, path: str, current_time: datetime
    ) -> tuple[bool, int]:
        key = f"{ip}:{path}"
        cutoff = current_time - timedelta(seconds=self.auth_window_seconds)
        self.auth_request_history[key] = [
            ts for ts in self.auth_request_history[key] if ts > cutoff
        ]
        count = len(self.auth_request_history[key])
        if self.auth_requests_per_window is not None and count >= self.auth_requests_per_window:
            return False, count
        self.auth_request_history[key].append(current_time)
        return True, count + 1

    async def _check_auth_rate_limit(
        self, ip: str, path: str, current_time: datetime
    ) -> tuple[bool, int]:
        if self.auth_requests_per_window is None:
            return True, 0

        redis = self._get_redis()
        if not redis:
            return self._check_auth_rate_limit_memory(ip, path, current_time)

        try:
            bucket = int(current_time.timestamp() // self.auth_window_seconds)
            auth_key = f"ratelimit:auth:{path}:{ip}:{bucket}"
            async with redis.pipeline(transaction=True) as pipe:
                pipe.incr(auth_key)
                pipe.expire(auth_key, self.auth_window_seconds + 5)
                results = await pipe.execute()
            auth_count = results[0]
            if auth_count > self.auth_requests_per_window:
                return False, auth_count
            return True, auth_count
        except Exception as e:
            logger.debug(f"Redis auth rate limiting failed, falling back to memory: {e}")
            return self._check_auth_rate_limit_memory(ip, path, current_time)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Apply rate limiting."""
        # Skip rate limiting for health checks
        if request.url.path in ("/health", "/api/v1/health"):
            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
            response.headers["X-RateLimit-Remaining"] = str(self.requests_per_minute)
            return response

        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        if "x-forwarded-for" in request.headers:
            client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()

        current_time = datetime.utcnow()

        # Dedicated anti brute-force limit on sensitive auth endpoints
        if (
            self.auth_requests_per_window is not None
            and request.method.upper() == "POST"
            and request.url.path in AUTH_RATE_LIMITED_PATHS
        ):
            auth_allowed, auth_count = await self._check_auth_rate_limit(
                client_ip, request.url.path, current_time
            )
            if not auth_allowed:
                logger.warning(
                    f"Auth rate limit exceeded for IP: {client_ip} on {request.url.path}",
                    extra={
                        "ip": client_ip,
                        "endpoint": request.url.path,
                        "method": request.method,
                        "requests_count": auth_count,
                    },
                )
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": "Trop de tentatives d'authentification. Veuillez réessayer dans quelques minutes.",
                        "detail": "Trop de tentatives d'authentification. Veuillez réessayer dans quelques minutes.",
                        "status_code": 429,
                    },
                    headers={
                        "Retry-After": str(self.auth_window_seconds),
                        "X-RateLimit-Limit": str(self.auth_requests_per_window),
                        "X-RateLimit-Remaining": "0",
                    },
                )

        # Check global rate limit via Redis (with in-memory fallback)
        is_allowed, current_count = await self._check_rate_limit_redis(client_ip, current_time)

        if not is_allowed:
            logger.warning(
                f"Rate limit exceeded for IP: {client_ip}",
                extra={
                    "ip": client_ip,
                    "endpoint": request.url.path,
                    "method": request.method,
                    "requests_count": current_count,
                }
            )

            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Trop de requêtes. Veuillez réessayer dans quelques instants.",
                    "status_code": 429,
                },
                headers={
                    "Retry-After": "60",
                    "X-RateLimit-Limit": str(self.requests_per_minute),
                    "X-RateLimit-Remaining": "0",
                }
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers
        remaining = max(0, self.requests_per_minute - current_count)
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(remaining)

        return response


def setup_security_middleware(app: FastAPI, environment: str = "production") -> None:
    """
    Setup all security middleware.

    Args:
        app: FastAPI application
        environment: Environment name (development, staging, production)
    """
    # 1. Request logging (first, to log everything)
    app.add_middleware(RequestLoggingMiddleware)

    # 2. Rate limiting (before auth, to prevent brute force)
    from app.config import settings

    if environment == "production":
        app.add_middleware(
            RateLimitMiddleware,
            requests_per_minute=100,
            burst_limit=20,
            auth_requests_per_window=settings.AUTH_RATE_LIMIT_REQUESTS,
            auth_window_seconds=settings.AUTH_RATE_LIMIT_WINDOW_SECONDS,
        )
    else:
        # More permissive in development
        app.add_middleware(RateLimitMiddleware, requests_per_minute=1000, burst_limit=100)

    # 3. Security headers (last, to apply to all responses)
    app.add_middleware(SecurityHeadersMiddleware)

    logger.info(f"Security middleware configured for environment: {environment}")


def setup_cors(app: FastAPI, environment: str = "production", allowed_origins: Optional[list[str]] = None) -> None:
    """
    Setup CORS with secure configuration.

    Args:
        app: FastAPI application
        environment: Environment name
        allowed_origins: List of allowed origins (None = use defaults)
    """
    if allowed_origins is None:
        if environment == "production":
            allowed_origins = [
                "https://duoflow.finance",
                "https://app.duoflow.finance",
            ]
        elif environment == "staging":
            allowed_origins = [
                "https://staging.duoflow.finance",
                "https://staging-app.duoflow.finance",
            ]
        else:  # development
            allowed_origins = [
                "http://localhost:5000",
                "http://localhost:5173",  # Vite default
                "http://localhost:3000",
                "http://127.0.0.1:5000",
                "http://127.0.0.1:5173",
                "http://host.docker.internal:5000",  # Docker for Mac/Windows
                "http://host.docker.internal:5173",
            ]

    # NEVER allow "*" in production
    if environment == "production" and "*" in allowed_origins:
        raise ValueError("Wildcard CORS origin (*) is not allowed in production!")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,  # Allow cookies (for JWT)
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        max_age=3600,  # Cache preflight requests for 1 hour
    )

    logger.info(f"CORS configured for origins: {allowed_origins}")
