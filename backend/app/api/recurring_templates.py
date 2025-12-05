"""
Recurring Templates API Endpoints

API pour gérer les templates de transactions récurrentes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.recurring_template import (
    RecurringTemplateCreate,
    RecurringTemplateUpdate,
    RecurringTemplateResponse,
    BulkCancelRequest,
    BulkUpdateRequest
)
from app.services.recurring_template_service import RecurringTemplateService
from app.services.projection_service import ProjectionService, get_next_occurrence
from datetime import date
from app.models import Transaction, TransactionType
from sqlalchemy import select


router = APIRouter(prefix="/api/v1/recurring-templates", tags=["recurring-templates"])


@router.post("", response_model=RecurringTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_recurring_template(
    template_data: RecurringTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Créer un nouveau template récurrent"""
    template = await RecurringTemplateService.create_template(
        db=db,
        household_id=current_user.household_id,
        data=template_data.model_dump()
    )
    return template


@router.get("", response_model=List[RecurringTemplateResponse])
async def list_recurring_templates(
    include_inactive: bool = True,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lister tous les templates récurrents"""
    templates = await RecurringTemplateService.get_all_templates(
        db=db,
        household_id=current_user.household_id,
        include_inactive=include_inactive
    )
    return templates


@router.get("/{template_id}", response_model=RecurringTemplateResponse)
async def get_recurring_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Récupérer un template récurrent par ID"""
    template = await RecurringTemplateService.get_template(
        db=db,
        template_id=template_id,
        household_id=current_user.household_id
    )
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring template not found"
        )
    
    return template


@router.patch("/{template_id}", response_model=RecurringTemplateResponse)
async def update_recurring_template(
    template_id: str,
    template_data: RecurringTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mettre à jour un template récurrent"""
    try:
        template = await RecurringTemplateService.update_template(
            db=db,
            template_id=template_id,
            household_id=current_user.household_id,
            data=template_data.model_dump(exclude_unset=True)
        )
        return template
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recurring_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Supprimer un template récurrent"""
    try:
        await RecurringTemplateService.delete_template(
            db=db,
            template_id=template_id,
            household_id=current_user.household_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/{template_id}/bulk-cancel", status_code=status.HTTP_200_OK)
async def bulk_cancel_occurrences(
    template_id: str,
    cancel_request: BulkCancelRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Annuler (supprimer) toutes les transactions projetées d'un template sur une période.
    Utile pour annuler une récurrence temporairement (ex: vacances).
    """
    # Vérifier que le template existe et appartient au household
    template = await RecurringTemplateService.get_template(
        db=db,
        template_id=template_id,
        household_id=current_user.household_id
    )
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring template not found"
        )
    
    # Récupérer toutes les transactions PROJECTED liées à ce template sur la période
    result = await db.execute(
        select(Transaction).where(
            Transaction.household_id == current_user.household_id,
            Transaction.account_id == template.account_id,
            Transaction.name == template.name,
            Transaction.amount == template.amount,
            Transaction.state == "PROJECTED",
            Transaction.transaction_date >= cancel_request.start_date,
            Transaction.transaction_date <= cancel_request.end_date,
            Transaction.deleted_at.is_(None)
        )
    )
    
    transactions = list(result.scalars().all())
    deleted_count = 0
    
    # Soft delete de toutes ces transactions
    for transaction in transactions:
        from datetime import datetime
        transaction.deleted_at = datetime.utcnow()
        deleted_count += 1
    
    await db.commit()
    
    return {
        "message": f"Cancelled {deleted_count} projected occurrences",
        "deleted_count": deleted_count
    }


@router.post("/{template_id}/bulk-update", status_code=status.HTTP_200_OK)
async def bulk_update_occurrences(
    template_id: str,
    update_request: BulkUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Modifier le montant de toutes les transactions projetées d'un template sur une période.
    Utile pour ajuster temporairement le montant (ex: augmentation loyer).
    """
    # Vérifier que le template existe et appartient au household
    template = await RecurringTemplateService.get_template(
        db=db,
        template_id=template_id,
        household_id=current_user.household_id
    )
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring template not found"
        )
    
    # Récupérer toutes les transactions PROJECTED liées à ce template sur la période
    result = await db.execute(
        select(Transaction).where(
            Transaction.household_id == current_user.household_id,
            Transaction.account_id == template.account_id,
            Transaction.name == template.name,
            Transaction.state == "PROJECTED",
            Transaction.transaction_date >= update_request.start_date,
            Transaction.transaction_date <= update_request.end_date,
            Transaction.deleted_at.is_(None)
        )
    )
    
    transactions = list(result.scalars().all())
    updated_count = 0
    
    # Mettre à jour le montant
    for transaction in transactions:
        transaction.amount = update_request.amount
        updated_count += 1
    
    await db.commit()
    
    return {
        "message": f"Updated {updated_count} projected occurrences",
        "updated_count": updated_count,
        "new_amount": float(update_request.amount)
    }
