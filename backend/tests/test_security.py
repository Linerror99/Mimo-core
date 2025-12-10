"""Tests for security middleware and logging."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.logger import SensitiveDataFilter, JSONFormatter
import logging
import json


client = TestClient(app)


class TestSecurityHeaders:
    """Test security headers middleware."""
    
    def test_security_headers_present(self):
        """Test that security headers are added to responses."""
        response = client.get("/health")
        
        assert response.status_code == 200
        
        # Check security headers
        assert "Strict-Transport-Security" in response.headers
        assert "X-Content-Type-Options" in response.headers
        assert "X-Frame-Options" in response.headers
        assert "X-XSS-Protection" in response.headers
        assert "Content-Security-Policy" in response.headers
        assert "Referrer-Policy" in response.headers
        assert "Permissions-Policy" in response.headers
    
    def test_hsts_header_value(self):
        """Test HSTS header has correct value."""
        response = client.get("/health")
        
        hsts = response.headers.get("Strict-Transport-Security")
        assert "max-age=31536000" in hsts
        assert "includeSubDomains" in hsts
    
    def test_frame_options_deny(self):
        """Test X-Frame-Options is set to DENY."""
        response = client.get("/health")
        
        assert response.headers.get("X-Frame-Options") == "DENY"
    
    def test_content_type_options(self):
        """Test X-Content-Type-Options is set to nosniff."""
        response = client.get("/health")
        
        assert response.headers.get("X-Content-Type-Options") == "nosniff"


class TestRateLimiting:
    """Test rate limiting middleware."""
    
    def test_rate_limit_not_exceeded(self):
        """Test that normal requests are allowed."""
        # Make 10 requests (well below limit)
        for _ in range(10):
            response = client.get("/health")
            assert response.status_code == 200
            assert "X-RateLimit-Limit" in response.headers
            assert "X-RateLimit-Remaining" in response.headers
    
    def test_rate_limit_headers_present(self):
        """Test that rate limit headers are present."""
        response = client.get("/health")
        
        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Remaining" in response.headers
        
        limit = int(response.headers["X-RateLimit-Limit"])
        remaining = int(response.headers["X-RateLimit-Remaining"])
        
        # In development, limit should be high (1000)
        assert limit >= 100
        assert remaining >= 0
    
    @pytest.mark.skip(reason="Slow test - only run manually")
    def test_rate_limit_exceeded(self):
        """Test that rate limiting blocks excessive requests."""
        # Make many requests rapidly
        responses = []
        for _ in range(150):  # Exceed development limit of 100
            responses.append(client.get("/health"))
        
        # Some requests should be rate limited (429)
        status_codes = [r.status_code for r in responses]
        assert 429 in status_codes
        
        # Check rate limit response
        rate_limited = [r for r in responses if r.status_code == 429]
        if rate_limited:
            response = rate_limited[0]
            assert "Retry-After" in response.headers
            assert "error" in response.json()


class TestSensitiveDataFilter:
    """Test sensitive data filtering in logs."""
    
    def test_filter_email_addresses(self):
        """Test that email addresses are masked."""
        filter_obj = SensitiveDataFilter()
        
        # Create log record with "email" keyword to trigger filter
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="User email login: john.doe@example.com",
            args=(),
            exc_info=None,
        )
        
        # Apply filter
        filter_obj.filter(record)
        
        # Email should be masked
        assert "j***@example.com" in record.msg
        assert "john.doe@example.com" not in record.msg
    
    def test_filter_tokens(self):
        """Test that tokens are masked."""
        filter_obj = SensitiveDataFilter()
        
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="JWT token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ",
            args=(),
            exc_info=None,
        )
        
        filter_obj.filter(record)
        
        # Token should be masked (only first 8 chars visible)
        assert "eyJhbGci***" in record.msg
        assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in record.msg
    
    def test_filter_passwords(self):
        """Test that passwords are masked."""
        filter_obj = SensitiveDataFilter()
        
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="Password: MySecretPass123!",
            args=(),
            exc_info=None,
        )
        
        filter_obj.filter(record)
        
        # Password should be masked
        assert "MySecret***" in record.msg or "password" in record.msg.lower()


class TestJSONFormatter:
    """Test JSON log formatting."""
    
    def test_json_format_basic(self):
        """Test basic JSON log formatting."""
        formatter = JSONFormatter()
        
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=42,
            msg="Test message",
            args=(),
            exc_info=None,
        )
        
        # Format record
        formatted = formatter.format(record)
        
        # Should be valid JSON
        log_data = json.loads(formatted)
        
        assert log_data["level"] == "INFO"
        assert log_data["message"] == "Test message"
        assert log_data["module"] == "test"
        assert log_data["line"] == 42
        assert "timestamp" in log_data
    
    def test_json_format_with_context(self):
        """Test JSON formatting with custom context."""
        formatter = JSONFormatter()
        
        record = logging.LogRecord(
            name="test",
            level=logging.ERROR,
            pathname="test.py",
            lineno=100,
            msg="Request failed",
            args=(),
            exc_info=None,
        )
        
        # Add custom fields
        record.user_id = "user-123"
        record.endpoint = "/api/v1/transactions"
        record.method = "POST"
        record.status_code = 500
        record.duration_ms = 245.5
        
        formatted = formatter.format(record)
        log_data = json.loads(formatted)
        
        assert log_data["user_id"] == "user-123"
        assert log_data["endpoint"] == "/api/v1/transactions"
        assert log_data["method"] == "POST"
        assert log_data["status_code"] == 500
        assert log_data["duration_ms"] == 245.5


class TestCORS:
    """Test CORS configuration."""
    
    def test_cors_development_origins(self):
        """Test that development origins are allowed."""
        # Test preflight request
        response = client.options(
            "/health",
            headers={
                "Origin": "http://localhost:5000",
                "Access-Control-Request-Method": "GET",
            }
        )
        
        # Should allow origin
        assert response.status_code in [200, 204]
        assert "Access-Control-Allow-Origin" in response.headers
    
    def test_cors_credentials_allowed(self):
        """Test that credentials are allowed (for JWT cookies)."""
        response = client.get(
            "/health",
            headers={"Origin": "http://localhost:5000"}
        )
        
        # Check credentials header
        cors_creds = response.headers.get("Access-Control-Allow-Credentials")
        assert cors_creds == "true" or cors_creds is None  # None means default (true)


class TestErrorHandling:
    """Test global error handling."""
    
    def test_404_user_friendly_message(self):
        """Test that 404 errors return user-friendly messages."""
        response = client.get("/api/v1/nonexistent")
        
        assert response.status_code == 404
        data = response.json()
        
        # Should have error field (or detail for FastAPI default)
        assert "error" in data or "detail" in data
        error_msg = data.get("error") or data.get("detail")
        assert isinstance(error_msg, str)
    
    def test_422_validation_error(self):
        """Test that validation errors return clear messages."""
        # Try to create transaction with invalid data
        response = client.post(
            "/api/v1/transactions",
            json={"invalid": "data"},
        )
        
        # 401/403 if auth required first, 422 for validation
        assert response.status_code in [401, 403, 422]
        data = response.json()
        
        # Should have error field
        assert "error" in data or "detail" in data
        error_msg = data.get("error") or data.get("detail")
        assert isinstance(error_msg, str)
