"""
Jobs API

Endpoints pour les jobs de maintenance.
En DEV : endpoints manuels pour tester les jobs
En PROD : déclenchés par GCP Cloud Scheduler
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import os

from app.database import get_db
from app.services.daily_maintenance_job import DailyMaintenanceJob


router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


def verify_job_token(x_job_token: Optional[str] = Header(None)) -> bool:
    """
    Vérifie le token d'authentification pour les jobs
    En DEV : pas de vérification (ou token simple)
    En PROD : vérifier le token GCP
    
    Args:
        x_job_token: Token d'authentification dans les headers
        
    Returns:
        True si le token est valide
        
    Raises:
        403: Si le token est invalide en production
    """
    env = os.getenv("ENV", "development")
    
    if env == "production":
        expected_token = os.getenv("JOB_TOKEN")
        if not expected_token or x_job_token != expected_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid job token"
            )
    
    return True


@router.post("/daily-maintenance")
async def run_daily_maintenance(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_job_token)
):
    """
    Exécute le job de maintenance quotidien
    
    Opérations effectuées :
    1. Transition PROJECTED → PENDING pour les transactions d'aujourd'hui
    2. Création des notifications de validation
    3. Nettoyage des transactions supprimées il y a plus de 30 jours
    
    En DEV : POST manuel pour tester
    En PROD : Appelé par GCP Cloud Scheduler
    
    Args:
        db: Session de base de données
        
    Returns:
        Statistiques d'exécution du job
        
    Example:
        ```bash
        # Dev (sans token)
        curl -X POST http://localhost:8000/api/v1/jobs/daily-maintenance
        
        # Prod (avec token)
        curl -X POST https://api.mimo.com/api/v1/jobs/daily-maintenance \
             -H "X-Job-Token: your-secret-token"
        ```
    """
    try:
        stats = await DailyMaintenanceJob.run(db)
        return {
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Job execution failed: {str(e)}"
        )


@router.get("/daily-maintenance/preview")
async def preview_daily_maintenance(
    db: AsyncSession = Depends(get_db)
):
    """
    Prévisualise les transactions qui seraient marquées PENDING
    sans les modifier (aperçu du job)
    
    Utile pour tester avant d'exécuter le job réel
    
    Args:
        db: Session de base de données
        
    Returns:
        Aperçu des transactions concernées
        
    Example:
        ```bash
        curl http://localhost:8000/api/v1/jobs/daily-maintenance/preview
        ```
    """
    preview = await DailyMaintenanceJob.preview_pending_transactions(db)
    return preview
