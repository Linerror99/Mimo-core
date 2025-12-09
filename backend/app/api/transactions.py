"""
Transaction API Router

Endpoints for transaction CRUD operations
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import date

from app.database import get_db
from app.api.deps import get_current_user
from app.services.transaction_service import TransactionService
from app.models.user import User
from app.schemas.transaction import (
    TransactionCreate,
    RecurringTransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    TransactionFilters
)
from app.models.transaction import TransactionType, TransactionState


router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction_data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Créer une transaction ponctuelle
    
    Args:
        transaction_data: Données de la transaction
        
    Returns:
        Transaction créée
    """
    service = TransactionService(db)
    
    transaction = await service.create_transaction(
        household_id=current_user.household_id,
        transaction_data=transaction_data
    )
    
    return transaction


@router.post("/recurring", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_recurring_transaction(
    transaction_data: RecurringTransactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Créer une transaction récurrente
    
    Args:
        transaction_data: Données de la transaction récurrente
        
    Returns:
        Transaction récurrente créée
    """
    service = TransactionService(db)
    
    transaction = await service.create_recurring_transaction(
        household_id=current_user.household_id,
        transaction_data=transaction_data
    )
    
    return transaction


@router.get("", response_model=List[TransactionResponse])
async def list_transactions(
    start_date: Optional[date] = Query(None, description="Date de début (inclusive)"),
    end_date: Optional[date] = Query(None, description="Date de fin (inclusive)"),
    transaction_type: Optional[TransactionType] = Query(None, description="Filtrer par type"),
    account_id: Optional[str] = Query(None, description="Filtrer par compte"),
    category_id: Optional[str] = Query(None, description="Filtrer par catégorie"),
    state: Optional[TransactionState] = Query(None, description="Filtrer par état"),
    include_deleted: bool = Query(False, description="Inclure les transactions supprimées"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lister les transactions avec filtres
    
    Query params:
        - start_date: Date de début
        - end_date: Date de fin
        - transaction_type: INCOME, EXPENSE, TRANSFER
        - account_id: ID du compte
        - category_id: ID de la catégorie
        - state: REALIZED, PROJECTED
        - include_deleted: Inclure corbeille
    
    Returns:
        Liste des transactions
    """
    service = TransactionService(db)
    
    transactions = await service.list_transactions(
        household_id=current_user.household_id,
        start_date=start_date,
        end_date=end_date,
        transaction_type=transaction_type,
        account_id=account_id,
        category_id=category_id,
        state=state,
        include_deleted=include_deleted
    )
    
    return transactions


@router.get("/trash", response_model=List[TransactionResponse])
async def list_trash(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lister les transactions dans la corbeille
    
    Returns:
        Liste des transactions supprimées
    """
    service = TransactionService(db)
    
    transactions = await service.list_trash(
        household_id=current_user.household_id
    )
    
    return transactions


@router.get("/pending", response_model=List[TransactionResponse])
async def list_pending_transactions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lister les transactions en attente de validation (PENDING)
    
    Returns:
        Liste des transactions PENDING du foyer
    """
    service = TransactionService(db)
    
    transactions = await service.list_pending_transactions(
        household_id=current_user.household_id
    )
    
    return [TransactionResponse.model_validate(t) for t in transactions]


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Récupérer une transaction par ID
    
    Args:
        transaction_id: ID de la transaction
        
    Returns:
        Transaction
        
    Raises:
        404: Transaction non trouvée
    """
    service = TransactionService(db)
    
    transaction = await service.get_transaction(
        transaction_id=transaction_id,
        household_id=current_user.household_id
    )
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    return transaction


@router.patch("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    transaction_data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mettre à jour une transaction
    
    Args:
        transaction_id: ID de la transaction
        transaction_data: Données à mettre à jour
        
    Returns:
        Transaction mise à jour
        
    Raises:
        404: Transaction non trouvée
    """
    service = TransactionService(db)
    
    transaction = await service.update_transaction(
        transaction_id=transaction_id,
        household_id=current_user.household_id,
        transaction_data=transaction_data
    )
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Supprimer une transaction (soft delete → corbeille)
    
    Args:
        transaction_id: ID de la transaction
        
    Raises:
        404: Transaction non trouvée
    """
    service = TransactionService(db)
    
    transaction = await service.soft_delete_transaction(
        transaction_id=transaction_id,
        household_id=current_user.household_id
    )
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    return None


@router.patch("/{transaction_id}/restore", response_model=TransactionResponse)
async def restore_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Restaurer une transaction depuis la corbeille
    
    Args:
        transaction_id: ID de la transaction
        
    Returns:
        Transaction restaurée
        
    Raises:
        404: Transaction non trouvée
    """
    service = TransactionService(db)
    
    transaction = await service.restore_transaction(
        transaction_id=transaction_id,
        household_id=current_user.household_id
    )
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    return transaction


@router.delete("/{transaction_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
async def permanent_delete_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Supprimer définitivement une transaction
    
    Args:
        transaction_id: ID de la transaction
        
    Raises:
        404: Transaction non trouvée
    """
    service = TransactionService(db)
    
    success = await service.permanent_delete_transaction(
        transaction_id=transaction_id,
        household_id=current_user.household_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    return None


@router.patch("/{transaction_id}/validate", response_model=TransactionResponse)
async def validate_transaction(
    transaction_id: str,
    new_amount: Optional[float] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Valider une transaction PENDING (la marquer comme REALIZED)
    
    Args:
        transaction_id: ID de la transaction
        new_amount: Nouveau montant (optionnel)
        
    Returns:
        Transaction validée
        
    Raises:
        404: Transaction non trouvée
    """
    service = TransactionService(db)
    
    transaction = await service.validate_transaction(
        transaction_id=transaction_id,
        household_id=current_user.household_id,
        new_amount=new_amount
    )
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    return TransactionResponse.model_validate(transaction)


@router.patch("/{transaction_id}/postpone", response_model=TransactionResponse)
async def postpone_transaction(
    transaction_id: str,
    new_date: date,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Reporter une transaction PENDING à une nouvelle date
    
    Args:
        transaction_id: ID de la transaction
        new_date: Nouvelle date
        
    Returns:
        Transaction reportée
        
    Raises:
        404: Transaction non trouvée
    """
    service = TransactionService(db)
    
    transaction = await service.postpone_transaction(
        transaction_id=transaction_id,
        household_id=current_user.household_id,
        new_date=new_date
    )
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    return TransactionResponse.model_validate(transaction)


@router.patch("/{transaction_id}/cancel", response_model=TransactionResponse)
async def cancel_transaction(
    transaction_id: str,
    reason: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Annuler une transaction PROJECTED ou PENDING
    
    Une transaction annulée:
    - Passe à l'état CANCELLED
    - Reste visible dans l'historique (affichée barrée dans l'UI)
    - Ne peut pas être annulée si déjà REALIZED (passée)
    
    Args:
        transaction_id: ID de la transaction
        reason: Raison de l'annulation (optionnel, stocké dans notes)
        
    Returns:
        Transaction annulée
        
    Raises:
        400: Transaction déjà réalisée
        404: Transaction non trouvée
    """
    service = TransactionService(db)
    
    try:
        transaction = await service.cancel_transaction(
            transaction_id=transaction_id,
            household_id=current_user.household_id,
            reason=reason
        )
        
        return TransactionResponse.model_validate(transaction)
    
    except ValueError as e:
        if "introuvable" in str(e):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
