"""Structured JSON Logging System for Production"""

import logging
import json
import os
import sys
from datetime import datetime
from typing import Optional
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path


class SensitiveDataFilter(logging.Filter):
    """Filter to mask sensitive data in logs."""
    
    SENSITIVE_KEYS = {
        'password', 'token', 'secret', 'api_key', 'authorization',
        'jwt', 'access_token', 'refresh_token', 'session_id', 'email'
    }
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Mask sensitive data in log messages."""
        if hasattr(record, 'msg') and isinstance(record.msg, str):
            message_lower = record.msg.lower()
            
            # Check if message contains sensitive keywords
            for key in self.SENSITIVE_KEYS:
                if key in message_lower:
                    # Replace sensitive values with masked version
                    record.msg = self._mask_sensitive_data(record.msg)
                    break
        
        return True
    
    def _mask_sensitive_data(self, message: str) -> str:
        """Replace sensitive data with masked version."""
        import re
        
        # Mask email addresses: john.doe@example.com -> j***@example.com
        message = re.sub(
            r'\b([a-zA-Z])[a-zA-Z0-9._-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b',
            r'\1***@\2',
            message
        )
        
        # Mask tokens/passwords: show only first 8 chars
        message = re.sub(
            r'(token|password|secret|jwt|api_key)["\s:=]+([a-zA-Z0-9+/=]{8})[a-zA-Z0-9+/=]{8,}',
            r'\1: \2***',
            message,
            flags=re.IGNORECASE
        )
        
        return message


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add custom fields if present
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "household_id"):
            log_data["household_id"] = record.household_id
        if hasattr(record, "endpoint"):
            log_data["endpoint"] = record.endpoint
        if hasattr(record, "method"):
            log_data["method"] = record.method
        if hasattr(record, "status_code"):
            log_data["status_code"] = record.status_code
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms
        if hasattr(record, "ip"):
            log_data["ip"] = record.ip
        if hasattr(record, "trace_id"):
            log_data["trace_id"] = record.trace_id
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Add stack trace for errors
        if record.levelname == "ERROR" and record.stack_info:
            log_data["stack_trace"] = self.formatStack(record.stack_info)
        
        return json.dumps(log_data, ensure_ascii=False)


def setup_logging(
    app_name: str = "duoflow",
    log_level: str = "INFO",
    log_dir: Optional[Path] = None,
    enable_json: bool = True,
) -> logging.Logger:
    """
    Setup structured logging with JSON format and rotation.
    
    Args:
        app_name: Name of the application (used for logger name)
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_dir: Directory for log files (None = console only)
        enable_json: Use JSON formatting (True) or plain text (False)
    
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(app_name)
    logger.setLevel(getattr(logging, log_level.upper()))
    
    # Remove existing handlers
    logger.handlers.clear()
    
    # Add sensitive data filter
    sensitive_filter = SensitiveDataFilter()
    
    # Console handler (for development & Docker logs)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    
    if enable_json:
        console_handler.setFormatter(JSONFormatter())
    else:
        console_handler.setFormatter(
            logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
        )
    
    console_handler.addFilter(sensitive_filter)
    logger.addHandler(console_handler)
    
    # File handlers (if log_dir specified)
    if log_dir:
        log_dir = Path(log_dir)
        log_dir.mkdir(parents=True, exist_ok=True)
        
        # General application logs (rotated daily)
        app_log_file = log_dir / f"{app_name}.log"
        app_handler = TimedRotatingFileHandler(
            app_log_file,
            when="midnight",
            interval=1,
            backupCount=30,  # Keep 30 days
            encoding="utf-8"
        )
        app_handler.setLevel(logging.INFO)
        app_handler.setFormatter(JSONFormatter() if enable_json else logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        app_handler.addFilter(sensitive_filter)
        logger.addHandler(app_handler)
        
        # Error logs (separate file, rotated daily)
        error_log_file = log_dir / f"{app_name}_errors.log"
        error_handler = TimedRotatingFileHandler(
            error_log_file,
            when="midnight",
            interval=1,
            backupCount=60,  # Keep 60 days for errors
            encoding="utf-8"
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(JSONFormatter() if enable_json else logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        error_handler.addFilter(sensitive_filter)
        logger.addHandler(error_handler)
    
    # Don't propagate to root logger
    logger.propagate = False
    
    return logger


# Global logger instance
# Use LOG_DIR from environment or default to /app/logs (Docker)
_log_dir = os.getenv("LOG_DIR", "/app/logs")
logger = setup_logging(
    app_name="duoflow",
    log_level="INFO",
    log_dir=Path(_log_dir) if _log_dir else None,
    enable_json=True,
)


def log_with_context(
    level: str,
    message: str,
    user_id: Optional[str] = None,
    household_id: Optional[str] = None,
    endpoint: Optional[str] = None,
    method: Optional[str] = None,
    status_code: Optional[int] = None,
    duration_ms: Optional[float] = None,
    ip: Optional[str] = None,
    trace_id: Optional[str] = None,
    exc_info: bool = False,
) -> None:
    """
    Log message with structured context.
    
    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        message: Log message
        user_id: User ID (if authenticated)
        household_id: Household ID (if applicable)
        endpoint: API endpoint path
        method: HTTP method
        status_code: HTTP status code
        duration_ms: Request duration in milliseconds
        ip: Client IP address
        trace_id: Request trace ID
        exc_info: Include exception info
    """
    extra = {}
    if user_id:
        extra["user_id"] = user_id
    if household_id:
        extra["household_id"] = household_id
    if endpoint:
        extra["endpoint"] = endpoint
    if method:
        extra["method"] = method
    if status_code:
        extra["status_code"] = status_code
    if duration_ms:
        extra["duration_ms"] = duration_ms
    if ip:
        extra["ip"] = ip
    if trace_id:
        extra["trace_id"] = trace_id
    
    log_func = getattr(logger, level.lower())
    log_func(message, extra=extra, exc_info=exc_info)
