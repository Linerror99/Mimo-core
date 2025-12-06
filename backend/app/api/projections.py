"""
Projections API Endpoints

API pour générer et consulter les projections financières.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from datetime import date
from dateutil.relativedelta import relativedelta

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.projection_service import ProjectionService


router = APIRouter(prefix="/api/v1/projections", tags=["projections"])


@router.get("/generate")
async def generate_projections(
    start_date: date = Query(..., description="Date de début de projection"),
    end_date: date = Query(..., description="Date de fin de projection"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Générer les projections pour toutes les récurrences actives sur une période.
    Retourne une liste de projections (occurrences futures).
    """
    projections = await ProjectionService.generate_projections(
        db=db,
        household_id=current_user.household_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_projections": len(projections),
        "projections": projections
    }


@router.get("/monthly/{year}/{month}")
async def get_monthly_projection(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculer la projection pour un mois donné.
    Retourne les totaux (revenus, dépenses, balance) et la liste des projections.
    """
    projection = await ProjectionService.calculate_monthly_projection(
        db=db,
        household_id=current_user.household_id,
        target_month=month,
        target_year=year
    )
    
    return projection


@router.get("/12-months")
async def get_12_months_projection(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Générer le tableau de projection sur 12 mois à partir du mois actuel.
    Utilisé pour la page /projection avec tableau et graphique.
    """
    # Calculer les 12 prochains mois
    today = date.today()
    start_month = today.replace(day=1)
    
    monthly_projections = []
    
    for i in range(12):
        target_date = start_month + relativedelta(months=i)
        
        projection = await ProjectionService.calculate_monthly_projection(
            db=db,
            household_id=current_user.household_id,
            target_month=target_date.month,
            target_year=target_date.year
        )
        
        monthly_projections.append(projection)
    
    # Calculer les totaux sur 12 mois
    total_income = sum(p["income"] for p in monthly_projections)
    total_expense = sum(p["expense"] for p in monthly_projections)
    total_balance = total_income - total_expense
    
    return {
        "period": "12 months",
        "start_date": start_month,
        "end_date": start_month + relativedelta(months=11),
        "total_income": float(total_income),
        "total_expense": float(total_expense),
        "total_balance": float(total_balance),
        "monthly_projections": monthly_projections
    }
