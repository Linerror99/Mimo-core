"""Application Configuration"""

from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    # Application
    APP_NAME: str = "DuoFlow Finance"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"  # development, staging, production

    # Database
    DATABASE_URL: str = "postgresql://duoflow:duoflow123@postgres:5432/duoflow"
    DB_ECHO: bool = False

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour for development
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS - Development defaults (override in production)
    CORS_ORIGINS: List[str] = [
        "http://localhost:5000",
        "http://localhost:5173",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:5173",
    ]

    # Security
    BCRYPT_ROUNDS: int = 4  # Réduit pour les load tests (12 en prod)

    # Logging
    LOG_LEVEL: str = "INFO"
    ENABLE_JSON_LOGS: bool = True

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
