"""Security middleware for HTTP headers, CORS, and rate limiting."""

from typing import Callable, Optional
from fastapi import FastAPI, Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
import time
from collections import defaultdict
from datetime import datetime, timedelta

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


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware to prevent abuse.
    
    Limits:
    - 100 requests per minute per IP address
    - Burst allowed: 20 requests in 1 second
    """
    
    def __init__(self, app: FastAPI, requests_per_minute: int = 100, burst_limit: int = 20):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.burst_limit = burst_limit
        
        # Storage: {ip: [(timestamp, count), ...]}
        self.request_history: dict[str, list[tuple[datetime, int]]] = defaultdict(list)
    
    def _clean_old_requests(self, ip: str, current_time: datetime) -> None:
        """Remove requests older than 1 minute."""
        one_minute_ago = current_time - timedelta(minutes=1)
        self.request_history[ip] = [
            (ts, count) for ts, count in self.request_history[ip]
            if ts > one_minute_ago
        ]
    
    def _check_rate_limit(self, ip: str, current_time: datetime) -> tuple[bool, int]:
        """
        Check if IP has exceeded rate limit.
        
        Returns:
            (is_allowed, requests_in_last_minute)
        """
        # Clean old requests
        self._clean_old_requests(ip, current_time)
        
        # Count requests in last minute
        total_requests = sum(count for _, count in self.request_history[ip])
        
        # Check burst limit (last second)
        one_second_ago = current_time - timedelta(seconds=1)
        recent_requests = sum(
            count for ts, count in self.request_history[ip]
            if ts > one_second_ago
        )
        
        # Check limits
        if recent_requests >= self.burst_limit:
            return False, total_requests
        if total_requests >= self.requests_per_minute:
            return False, total_requests
        
        return True, total_requests
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Apply rate limiting."""
        # Skip rate limiting for health checks
        if request.url.path == "/health":
            response = await call_next(request)
            # Still add rate limit headers for consistency
            response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
            response.headers["X-RateLimit-Remaining"] = str(self.requests_per_minute)
            return response
        
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        if "x-forwarded-for" in request.headers:
            client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
        
        current_time = datetime.utcnow()
        
        # Check rate limit
        is_allowed, current_count = self._check_rate_limit(client_ip, current_time)
        
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
                    "Retry-After": "60",  # Retry after 60 seconds
                    "X-RateLimit-Limit": str(self.requests_per_minute),
                    "X-RateLimit-Remaining": "0",
                }
            )
        
        # Record request
        self.request_history[client_ip].append((current_time, 1))
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        remaining = self.requests_per_minute - current_count - 1
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
        
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
    if environment == "production":
        app.add_middleware(RateLimitMiddleware, requests_per_minute=100, burst_limit=20)
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
                "http://127.0.0.1:5000",
                "http://127.0.0.1:5173",
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
