"""
Admin endpoints for maintenance operations
Requires admin authentication via X-Admin-Token header
"""
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
import subprocess
import os
from typing import Optional

router = APIRouter(prefix="/admin", tags=["admin"])


class MigrationResponse(BaseModel):
    success: bool
    message: str
    output: Optional[str] = None


def verify_admin_token(x_admin_token: str = Header(...)) -> None:
    """Verify admin token from header"""
    expected_token = os.getenv("ADMIN_TOKEN")
    
    if not expected_token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin token not configured on server"
        )
    
    if x_admin_token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin token"
        )


@router.post("/migrate", response_model=MigrationResponse)
async def run_migrations(x_admin_token: str = Header(...)) -> MigrationResponse:
    """
    Run database migrations using Alembic
    
    Requires admin authentication via X-Admin-Token header
    """
    verify_admin_token(x_admin_token)
    
    try:
        # Debug: Check environment variables
        env_debug = f"""
        DATABASE_CONNECTION_NAME: {os.getenv('DATABASE_CONNECTION_NAME', 'NOT SET')}
        DATABASE_NAME: {os.getenv('DATABASE_NAME', 'NOT SET')}
        DATABASE_USER: {os.getenv('DATABASE_USER', 'NOT SET')}
        DATABASE_URL: {os.getenv('DATABASE_URL', 'NOT SET')[:50]}...
        """
        
        # Run alembic upgrade head
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd="/app",
            capture_output=True,
            text=True,
            timeout=300  # 5 minutes timeout
        )
        
        # Prepend debug info to output
        output_with_debug = env_debug + "\n" + (result.stdout or result.stderr or "")
        
        if result.returncode == 0:
            return MigrationResponse(
                success=True,
                message="Migrations completed successfully",
                output=output_with_debug
            )
        else:
            return MigrationResponse(
                success=False,
                message="Migration failed",
                output=output_with_debug
            )
    
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="Migration timeout after 5 minutes"
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Migration error: {str(e)}"
        )


@router.get("/health")
async def admin_health(x_admin_token: str = Header(...)) -> dict:
    """
    Health check with admin authentication
    """
    verify_admin_token(x_admin_token)
    
    return {
        "status": "healthy",
        "admin": True,
        "environment": os.getenv("ENVIRONMENT", "unknown")
    }
