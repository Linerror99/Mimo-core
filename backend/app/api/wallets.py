"""
API Endpoints pour les wallets (Sprint 6 - Mode Couple)

GET /wallets - Récupérer les 3 portefeuilles d'un household COUPLE
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models import User
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

    - Si SOLO (pas de household): retourne seulement total_balance des comptes personnels
    - Si INDIVIDUAL: retourne seulement total_balance
    - Si COUPLE: retourne les 3 vues (membre 1, membre 2, commun)

    Returns:
        WalletsResponse avec les données des portefeuilles
    """
    from decimal import Decimal

    from sqlalchemy import func, select

    from app.models import Account, Household, HouseholdType, Transaction

    household_id = current_user.household_id

    # CAS 1: Utilisateur SOLO (pas de household_id)
    if not household_id:
        # Calculer le solde total des comptes personnels de l'utilisateur
        stmt = select(Account).where(Account.original_owner_user_id == current_user.id)
        accounts = (await db.execute(stmt)).scalars().all()

        total_balance = Decimal("0")
        
        # Import pour filtres de date et état
        from datetime import date
        from app.models.transaction import TransactionState
        
        today = date.today()
        
        for account in accounts:
            # Balance = initial_balance + sum(transactions RÉALISÉES jusqu'à aujourd'hui)
            tx_stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                Transaction.account_id == account.id,
                Transaction.deleted_at.is_(None),
                Transaction.state == TransactionState.REALIZED,
                Transaction.transaction_date <= today
            )
            tx_sum = (await db.execute(tx_stmt)).scalar_one()
            total_balance += account.initial_balance + Decimal(str(tx_sum))

        return WalletsResponse(
            household_type="SOLO",
            total_balance=float(total_balance),
            members=None,
            shared=None
        )

    # CAS 2 & 3: Utilisateur avec household
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

        # Transactions RÉALISÉES jusqu'à aujourd'hui uniquement
        from datetime import date
        from app.models.transaction import TransactionState
        
        today = date.today()
        
        stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.household_id == household_id,
            Transaction.deleted_at.is_(None),
            Transaction.state == TransactionState.REALIZED,
            Transaction.transaction_date <= today
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
