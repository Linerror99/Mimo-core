"""Database configuration and session management"""

import os
import re
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# Configure database URL for Cloud SQL connection
connection_name = os.getenv("DATABASE_CONNECTION_NAME")
if connection_name:
    # Cloud Run with Cloud SQL Unix socket
    db_name = os.getenv("DATABASE_NAME", "mimo_db")
    db_user = os.getenv("DATABASE_USER", "mimo_user")
    db_password = os.getenv("DATABASE_PASSWORD", "")
    
    # Extract password from DATABASE_URL if not set explicitly
    if not db_password and settings.DATABASE_URL:
        try:
            match = re.search(r'://[^:]+:([^@]+)@', settings.DATABASE_URL)
            if match:
                db_password = match.group(1)
        except Exception:
            pass
    
    # Use Unix socket for Cloud SQL connection
    # asyncpg doesn't support ?host= syntax, use direct Unix socket path
    database_url = f"postgresql+asyncpg://{db_user}:{db_password}@/cloudsql/{connection_name}/{db_name}"
    print(f"[Database] Using Cloud SQL Unix socket: /cloudsql/{connection_name}")
else:
    # Local development with DATABASE_URL
    database_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    print(f"[Database] Using DATABASE_URL from settings")

# Create async engine
engine = create_async_engine(
    database_url,
    echo=settings.DB_ECHO,
    future=True,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models"""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
