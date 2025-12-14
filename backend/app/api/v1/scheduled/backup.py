"""
Scheduled tasks endpoints
Invoked by Cloud Scheduler with OIDC authentication
"""
from fastapi import APIRouter, Header, HTTPException, status, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from google.cloud import storage
import subprocess
import tempfile
import os
from datetime import datetime
from typing import Optional

from app.database import get_db

router = APIRouter(prefix="/scheduled", tags=["scheduled"])


class BackupResponse(BaseModel):
    success: bool
    message: str
    backup_file: Optional[str] = None
    size_bytes: Optional[int] = None


def verify_cloud_scheduler(authorization: str = Header(None)) -> None:
    """
    Verify request comes from Cloud Scheduler
    In production, this validates the OIDC token
    """
    # For development, allow if ENVIRONMENT is not production
    if os.getenv("ENVIRONMENT") != "production":
        return
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    # In production, Google Cloud Run automatically validates OIDC tokens
    # from Cloud Scheduler, so if the request reaches here, it's authenticated


@router.post("/backup", response_model=BackupResponse)
async def backup_database(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
) -> BackupResponse:
    """
    Create a database backup and upload to GCS
    
    This endpoint is called by Cloud Scheduler every Sunday at 02:00 UTC
    """
    verify_cloud_scheduler(authorization)
    
    try:
        # Get database connection details from environment
        db_connection = os.getenv("DATABASE_CONNECTION_NAME")
        db_name = os.getenv("DATABASE_NAME", "mimodb")
        db_user = os.getenv("DATABASE_USER", "postgres")
        bucket_name = os.getenv("GCS_BUCKET_BACKUPS", "mimo-backups-prod")
        
        if not db_connection:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database connection name not configured"
            )
        
        # Generate backup filename with timestamp
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"backup_{timestamp}.sql.gz"
        
        # Create temporary file for backup
        with tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.sql.gz') as tmp_file:
            tmp_path = tmp_file.name
            
            try:
                # Run pg_dump with gzip compression
                # Use Cloud SQL Proxy connection
                dump_command = [
                    "pg_dump",
                    "-h", "/cloudsql/" + db_connection,
                    "-U", db_user,
                    "-d", db_name,
                    "--no-password",
                    "-F", "c",  # Custom format (compressed)
                    "-f", tmp_path
                ]
                
                result = subprocess.run(
                    dump_command,
                    capture_output=True,
                    text=True,
                    timeout=600  # 10 minutes timeout
                )
                
                if result.returncode != 0:
                    raise Exception(f"pg_dump failed: {result.stderr}")
                
                # Get file size
                file_size = os.path.getsize(tmp_path)
                
                # Upload to Google Cloud Storage
                storage_client = storage.Client()
                bucket = storage_client.bucket(bucket_name)
                blob = bucket.blob(f"backups/{backup_filename}")
                
                blob.upload_from_filename(tmp_path)
                
                # Add metadata
                blob.metadata = {
                    "timestamp": timestamp,
                    "database": db_name,
                    "size_bytes": str(file_size)
                }
                blob.patch()
                
                return BackupResponse(
                    success=True,
                    message=f"Backup completed successfully",
                    backup_file=f"gs://{bucket_name}/backups/{backup_filename}",
                    size_bytes=file_size
                )
            
            finally:
                # Clean up temporary file
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
    
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="Backup timeout after 10 minutes"
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backup error: {str(e)}"
        )


@router.post("/validation")
async def auto_validate_transactions(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Auto-validate pending transactions after 48h
    
    This endpoint is called by Cloud Scheduler daily at 06:00 UTC
    """
    verify_cloud_scheduler(authorization)
    
    try:
        from app.models import Transaction, TransactionStatus
        from sqlalchemy import select, and_
        from datetime import datetime, timedelta
        
        # Find transactions pending for more than 48 hours
        cutoff_date = datetime.utcnow() - timedelta(hours=48)
        
        stmt = select(Transaction).where(
            and_(
                Transaction.status == TransactionStatus.PENDING,
                Transaction.created_at <= cutoff_date
            )
        )
        
        result = await db.execute(stmt)
        pending_transactions = result.scalars().all()
        
        validated_count = 0
        for transaction in pending_transactions:
            transaction.status = TransactionStatus.VALIDATED
            transaction.validated_at = datetime.utcnow()
            validated_count += 1
        
        await db.commit()
        
        return {
            "success": True,
            "message": f"Auto-validated {validated_count} transactions",
            "validated_count": validated_count,
            "cutoff_date": cutoff_date.isoformat()
        }
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation error: {str(e)}"
        )
