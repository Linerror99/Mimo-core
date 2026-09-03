"""
Projections API Endpoints

API pour générer et consulter les projections financières.
"""
from datetime import date
from typing import Optional

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
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


from decimal import Decimal
from pydantic import BaseModel, Field
from app.models.transaction import Transaction, TransactionState, TransactionType, RecurrenceFrequency
from app.models.goal import Goal
from app.services.goal_service import GoalService


class SimulationRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    is_saving: bool = False
    total_amount: Optional[float] = None
    monthly_amount: Optional[float] = None
    payment_type: str = "DIRECT"  # 'DIRECT' | 'INSTALLMENTS' | 'RECURRING'
    installments_count: Optional[int] = 3
    start_date: date
    account_id: Optional[str] = None
    destination_account_id: Optional[str] = None
    category_id: Optional[str] = None


class CommitSimulationRequest(SimulationRequest):
    create_goal: bool = True


@router.get("/safe-to-spend")
async def get_safe_to_spend(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Récupérer le Reste à Vivre Réel (Safe-to-Spend)
    """
    if not current_user.household_id:
        return {
            "current_balance": 0,
            "committed_expenses": 0,
            "safe_to_spend": 0,
            "days_until_next_income": 0,
            "status": "healthy"
        }

    return await ProjectionService.calculate_safe_to_spend(
        db=db,
        household_id=current_user.household_id
    )


@router.post("/simulate")
async def simulate_purchase(
    req: SimulationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Simuler un achat ou une épargne et évaluer la viabilité financière
    """
    return await ProjectionService.simulate_purchase(
        db=db,
        household_id=current_user.household_id,
        name=req.name,
        is_saving=req.is_saving,
        total_amount=req.total_amount,
        monthly_amount=req.monthly_amount,
        payment_type=req.payment_type,
        installments_count=req.installments_count,
        start_date=req.start_date,
        account_id=req.account_id
    )


@router.post("/commit-simulation")
async def commit_simulation(
    req: CommitSimulationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Valider une simulation et créer les transactions prévisionnelles (et le Goal associé si applicable)
    """
    today = date.today()
    created_transactions = []
    goal = None

    # 1. Créer l'objectif si c'est de l'épargne ou si demandé
    if req.is_saving or req.create_goal:
        target_date = None
        if req.payment_type == "INSTALLMENTS" and req.installments_count:
            target_date = req.start_date + relativedelta(months=req.installments_count - 1)
        elif req.payment_type == "RECURRING" and req.installments_count:
            target_date = req.start_date + relativedelta(months=req.installments_count - 1)

        monthly_contrib = req.monthly_amount
        if req.payment_type == "INSTALLMENTS" and req.total_amount and req.installments_count:
            monthly_contrib = round(float(req.total_amount) / int(req.installments_count), 2)

        goal_service = GoalService(db)
        goal = await goal_service.create_goal(
            created_by=current_user.id,
            name=req.name,
            target_amount=req.total_amount,
            monthly_contribution=monthly_contrib,
            user_id=current_user.id,
            household_id=None,
            target_date=target_date,
            account_id=req.account_id,
            destination_account_id=req.destination_account_id
        )

    # 2. Déterminer les comptes par défaut si non spécifiés
    account_id = req.account_id
    if not account_id:
        acc_res = await db.execute(
            select(Account).where(
                Account.household_id == current_user.household_id,
                Account.is_active == "true"
            ).order_by(Account.created_at.asc())
        )
        first_acc = acc_res.scalars().first()
        if first_acc:
            account_id = first_acc.id

    if not account_id:
        raise ValueError("Aucun compte disponible pour créer les transactions.")

    # 3. Générer les transactions prévisionnelles
    tx_type = TransactionType.TRANSFER if (req.is_saving and req.destination_account_id) else TransactionType.EXPENSE

    if req.payment_type == "DIRECT":
        amount = float(req.total_amount or req.monthly_amount or 0)
        tx_state = TransactionState.PROJECTED if req.start_date > today else (TransactionState.PENDING if req.start_date == today else TransactionState.REALIZED)
        
        tx = Transaction(
            household_id=current_user.household_id,
            account_id=account_id,
            destination_account_id=req.destination_account_id if tx_type == TransactionType.TRANSFER else None,
            category_id=req.category_id,
            goal_id=goal.id if goal else None,
            amount=Decimal(str(amount if tx_type == TransactionType.TRANSFER else -abs(amount))),
            transaction_date=req.start_date,
            type=tx_type,
            state=tx_state,
            description=req.name,
            notes="Généré par le simulateur de décision"
        )
        db.add(tx)
        created_transactions.append(tx)

    elif req.payment_type in ["INSTALLMENTS", "RECURRING"]:
        count = req.installments_count or (3 if req.payment_type == "INSTALLMENTS" else 12)
        if req.total_amount:
            monthly = round(float(req.total_amount) / count, 2)
        else:
            monthly = float(req.monthly_amount or 0)

        for i in range(count):
            due_date = req.start_date + relativedelta(months=i)
            tx_state = TransactionState.PROJECTED if due_date > today else (TransactionState.PENDING if due_date == today else TransactionState.REALIZED)
            label = f"{req.name} ({i+1}/{count})" if req.payment_type == "INSTALLMENTS" else f"Épargne {req.name} (Mois {i+1})"

            tx = Transaction(
                household_id=current_user.household_id,
                account_id=account_id,
                destination_account_id=req.destination_account_id if tx_type == TransactionType.TRANSFER else None,
                category_id=req.category_id,
                goal_id=goal.id if goal else None,
                amount=Decimal(str(monthly if tx_type == TransactionType.TRANSFER else -abs(monthly))),
                transaction_date=due_date,
                type=tx_type,
                state=tx_state,
                description=label,
                notes="Généré par le simulateur de décision"
            )
            db.add(tx)
            created_transactions.append(tx)

    await db.commit()

    return {
        "success": True,
        "message": f"Simulation validée avec succès ! {len(created_transactions)} transaction(s) prévisionnelle(s) créée(s).",
        "goal_id": goal.id if goal else None,
        "transactions_created": len(created_transactions)
    }
