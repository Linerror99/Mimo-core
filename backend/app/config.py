"""Application Configuration"""

from typing import List, Optional, Union
import os

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    # Application
    APP_NAME: str = "Mimo Finance"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"  # development, staging, production

    # Database
    DATABASE_URL: str = "postgresql://mimo_user:password@postgres:5432/mimo_db"
    DB_ECHO: bool = False

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120  # 2 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS - Development defaults (override in production)
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5000",
        "http://localhost:5173",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:5173",
    ]

    # Google Cloud Storage
    GCS_BUCKET_UPLOADS: str = "mimo-uploads-prod"
    GCS_BUCKET_BACKUPS: str = "mimo-backups-prod"

    # Admin & Scheduler
    ADMIN_TOKEN: str = ""
    JOB_TOKEN: str = ""
    SCHEDULER_SERVICE_ACCOUNT: Optional[str] = None  # e.g. scheduler-sa@project-id.iam.gserviceaccount.com

    # Security
    BCRYPT_ROUNDS: int = 12  # Standard sécurisé OWASP (12 rounds)
    COOKIE_SECURE: bool = True
    COOKIE_SAMESITE: str = "none"  # "none" for cross-origin frontend/backend on Cloud Run
    COOKIE_DOMAIN: Optional[str] = None

    # Logging
    LOG_LEVEL: str = "INFO"
    ENABLE_JSON_LOGS: bool = True

    # SMTP Email
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "noreply@mimofinance.com"
    SMTP_TLS: bool = True

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """Parse CORS origins from comma-separated string or list"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
