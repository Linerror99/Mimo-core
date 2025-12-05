"""Application Configuration"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    # Application
    APP_NAME: str = "DuoFlow Finance"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql://duoflow:duoflow123@postgres:5432/duoflow"
    DB_ECHO: bool = False

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS - Allow all origins in development (set CORS_ORIGINS env var for production)
    CORS_ORIGINS: List[str] = ["*"]  # Allow all origins

    # Security
    BCRYPT_ROUNDS: int = 12

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
