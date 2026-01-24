import subprocess
import sys

print("íº€ Running database migrations...")
result = subprocess.run(
    ["alembic", "upgrade", "head"],
    cwd="backend",
    env={"DATABASE_URL": "postgresql+asyncpg://mimo_user:PASSWORD@10.93.0.3:5432/mimo_db"}
)
sys.exit(result.returncode)
