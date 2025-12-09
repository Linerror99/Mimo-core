"""
Exports Router

API endpoints for exporting financial data (PDF reports)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.pdf_service import PDFService


router = APIRouter(prefix="/exports", tags=["exports"])


@router.post("/pdf", status_code=status.HTTP_200_OK)
async def export_monthly_report_pdf(
    year: int = Query(..., description="Année (ex: 2025)", ge=2020, le=2100),
    month: int = Query(..., description="Mois (1-12)", ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Exporter un rapport financier mensuel en PDF
    
    Génère un PDF contenant:
    - Résumé financier (revenus, dépenses, solde)
    - Dépenses par catégorie
    - Détail de toutes les transactions du mois
    
    Args:
        year: Année du rapport (ex: 2025)
        month: Mois du rapport (1-12)
    
    Returns:
        Response: Fichier PDF
    """
    service = PDFService(db)
    
    try:
        pdf_bytes = await service.generate_monthly_report(
            user_id=current_user.id,
            year=year,
            month=month
        )
        
        filename = service.get_filename(
            user_id=current_user.id,
            year=year,
            month=month
        )
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la génération du PDF: {str(e)}"
        )
