from logging.config import fileConfig
import asyncio
import os

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Import app config and models
from app.config import settings
from app.database import Base
from app.models import User, Household

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Set the database URL from app config
# In Cloud Run, use Unix socket for Cloud SQL connection
connection_name = os.getenv("DATABASE_CONNECTION_NAME")
if connection_name:
    # Cloud Run with Cloud SQL Unix socket
    db_name = os.getenv("DATABASE_NAME", "mimo_db")
    db_user = os.getenv("DATABASE_USER", "mimo_user")
    db_password = os.getenv("DATABASE_PASSWORD", "")
    
    # Extract password from DATABASE_URL if not set explicitly
    if not db_password and settings.DATABASE_URL:
        # Parse password from URL like: postgresql://user:password@host:port/db
        try:
            import re
            match = re.search(r'://[^:]+:([^@]+)@', settings.DATABASE_URL)
            if match:
                db_password = match.group(1)
        except:
            pass
    
    database_url = f"postgresql+asyncpg://{db_user}:{db_password}@/{db_name}?host=/cloudsql/{connection_name}"
    print(f"[Alembic] Using Cloud SQL Unix socket: /cloudsql/{connection_name}")
else:
    # Local development with DATABASE_URL
    database_url = settings.DATABASE_URL
    print(f"[Alembic] Using DATABASE_URL from settings")

config.set_main_option("sqlalchemy.url", database_url)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    
    def do_run_migrations(connection):
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()

    async def run_async_migrations():
        from sqlalchemy.ext.asyncio import create_async_engine
        
        # Replace postgresql:// with postgresql+asyncpg:// for async support
        database_url = settings.DATABASE_URL.replace(
            "postgresql://", 
            "postgresql+asyncpg://"
        )
        
        connectable = create_async_engine(
            database_url,
            poolclass=pool.NullPool,
        )

        async with connectable.connect() as connection:
            await connection.run_sync(do_run_migrations)

        await connectable.dispose()

    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
