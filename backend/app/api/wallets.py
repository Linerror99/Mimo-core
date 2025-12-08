"""
API Endpoints pour les wallets (Sprint 6 - Mode Couple)

GET /wallets - Récupérer les 3 portefeuilles d'un household COUPLE
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models import User
from app.api.deps import get_current_user
from app.services.household_service import HouseholdService


router = APIRouter()


# ============================================================================
# Schemas
# ============================================================================

class MemberWalletResponse(BaseModel):
    """Portefeuille d'un membre du couple."""
    user_id: str
    user_name: str
    balance: float
    personal_balance: float
    shared_contribution: float


class SharedWalletResponse(BaseModel):
    """Portefeuille commun du couple."""
    balance: float
    split_per_person: float


class WalletsResponse(BaseModel):
    """Réponse complète avec les 3 vues de portefeuilles."""
    household_type: str  # "COUPLE" ou "INDIVIDUAL"
    total_balance: float
    members: dict[str, MemberWalletResponse] | None  # None si INDIVIDUAL
    shared: SharedWalletResponse | None  # None si INDIVIDUAL


# ============================================================================
# GET /wallets - Récupérer les portefeuilles
# ============================================================================

@router.get("", response_model=WalletsResponse)
async def get_wallets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Récupérer les portefeuilles du household de l'utilisateur.
    
    - Si INDIVIDUAL: retourne seulement total_balance
    - Si COUPLE: retourne les 3 vues (membre 1, membre 2, commun)
    
    Returns:
        WalletsResponse avec les données des portefeuilles
    """
    from app.models import Household, HouseholdType, Account, Transaction
    from sqlalchemy import select, func
    from decimal import Decimal
    
    household_id = current_user.household_id
    
    # Récupérer le household
    stmt = select(Household).where(Household.id == household_id)
    household = (await db.execute(stmt)).scalar_one_or_none()
    
    if not household:
        raise HTTPException(status_code=404, detail="Household not found")
    
    # Si INDIVIDUAL: calcul simple
    if household.type == HouseholdType.INDIVIDUAL:
        # Récupérer tous les comptes
        stmt = select(Account).where(Account.household_id == household_id)
        accounts = list((await db.execute(stmt)).scalars().all())
        
        # Solde initial
        initial_balance = sum(Decimal(str(acc.initial_balance)) for acc in accounts)
        
        # Toutes les transactions (pas de owner_type en INDIVIDUAL)
        stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.household_id == household_id,
            Transaction.deleted_at.is_(None),
        )
        all_transactions = Decimal(str((await db.execute(stmt)).scalar()))
        
        total_balance = initial_balance + all_transactions
        
        return WalletsResponse(
            household_type="INDIVIDUAL",
            total_balance=float(total_balance),
            members=None,
            shared=None,
        )
    
    # Si COUPLE: utiliser le service
    service = HouseholdService(db)
    
    try:
        wallet_data = await service.calculate_wallets(household_id)
        
        # Convertir en format API
        members_response = {
            user_id: MemberWalletResponse(**member_data)
            for user_id, member_data in wallet_data["members"].items()
        }
        
        shared_response = SharedWalletResponse(**wallet_data["shared"])
        
        return WalletsResponse(
            household_type="COUPLE",
            total_balance=wallet_data["total_balance"],
            members=members_response,
            shared=shared_response,
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
