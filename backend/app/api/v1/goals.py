"""
Goals Router

API endpoints for managing financial goals (personal & household)
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.goal import GoalContributionUpdate, GoalCreate, GoalResponse, GoalUpdate
from app.services.goal_service import GoalService

router = APIRouter(prefix="/goals", tags=["goals"])


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal_data: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Créer un objectif financier

    - **Objectif personnel** : fournir `user_id` (doit être l'utilisateur connecté)
    - **Objectif foyer** : fournir `household_id` (doit être le foyer de l'utilisateur)

    Un seul des deux doit être fourni (exclusif).
    """
    service = GoalService(db)

    # Validation: user_id doit être l'utilisateur connecté si fourni
    if goal_data.user_id and goal_data.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne pouvez créer un objectif personnel que pour vous-même"
        )

    # Validation: household_id doit être le foyer de l'utilisateur si fourni
    if goal_data.household_id:
        if not current_user.household_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vous devez être en couple pour créer un objectif foyer"
            )
        if goal_data.household_id != current_user.household_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous ne pouvez créer un objectif que pour votre foyer"
            )

        # Vérifier que le household a au moins 2 membres (mode COUPLE)
        from sqlalchemy.orm import selectinload

        from app.models import Household

        household_stmt = select(Household).where(
            Household.id == current_user.household_id
        ).options(selectinload(Household.members))
        result = await db.execute(household_stmt)
        household = result.scalar_one_or_none()

        if household and len(household.members) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vous devez être en couple pour créer un objectif foyer"
            )

    # Si ni user_id ni household_id fourni, utiliser user_id par défaut
    if not goal_data.user_id and not goal_data.household_id:
        goal_data.user_id = current_user.id

    try:
        goal = await service.create_goal(
            created_by=current_user.id,
            name=goal_data.name,
            target_amount=float(goal_data.target_amount) if goal_data.target_amount is not None else None,
            current_amount=float(goal_data.current_amount) if goal_data.current_amount is not None else 0,
            monthly_contribution=float(goal_data.monthly_contribution) if goal_data.monthly_contribution is not None else None,
            user_id=goal_data.user_id,
            household_id=goal_data.household_id,
            description=goal_data.description,
            target_date=goal_data.target_date,
            account_id=goal_data.account_id,
            destination_account_id=goal_data.destination_account_id,
            start_date=goal_data.start_date
        )

        return goal
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("", response_model=List[GoalResponse])
async def list_goals(
    goal_type: Optional[str] = None,  # "personal" ou "household"
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lister les objectifs financiers

    - **Sans filtre** : retourne tous les objectifs accessibles (personnels + foyer + partenaire si en couple)
    - **goal_type=personal** : uniquement objectifs personnels de l'utilisateur
    - **goal_type=household** : uniquement objectifs du foyer
    """
    service = GoalService(db)

    if goal_type == "personal":
        goals = await service.list_goals(user_id=current_user.id)
    elif goal_type == "household":
        goals = await service.list_goals(household_id=current_user.household_id)
    else:
        # Retourner TOUS les objectifs accessibles
        goals = []

        # Objectifs personnels
        personal_goals = await service.list_goals(user_id=current_user.id)
        goals.extend(personal_goals)

        # Objectifs de foyer
        if current_user.household_id:
            household_goals = await service.list_goals(household_id=current_user.household_id)
            goals.extend(household_goals)

            # Objectifs personnels du partenaire (si en couple)
            from app.models.user import User as UserModel
            result = await db.execute(
                select(UserModel).where(
                    and_(
                        UserModel.household_id == current_user.household_id,
                        UserModel.id != current_user.id
                    )
                )
            )
            partner = result.scalar_one_or_none()

            if partner:
                partner_goals = await service.list_goals(user_id=partner.id)
                goals.extend(partner_goals)

    return goals


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Récupérer un objectif par ID"""
    service = GoalService(db)

    goal = await service.get_goal(goal_id)

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Objectif introuvable"
        )

    # Vérifier l'accès (personnel = même user, foyer = même household)
    has_access = (
        (goal.user_id and goal.user_id == current_user.id) or
        (goal.household_id and goal.household_id == current_user.household_id)
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas accès à cet objectif"
        )

    return goal


@router.get("/{goal_id}/transactions")
async def get_goal_transactions(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Récupérer toutes les transactions liées à un objectif"""
    service = GoalService(db)
    goal = await service.get_goal(goal_id)

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Objectif introuvable"
        )

    has_access = (
        (goal.user_id and goal.user_id == current_user.id) or
        (goal.household_id and goal.household_id == current_user.household_id)
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas accès à cet objectif"
        )

    transactions = await service.get_goal_transactions(goal_id)
    return transactions


@router.patch("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    goal_data: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mettre à jour un objectif"""
    service = GoalService(db)

    # Vérifier l'existence et l'accès
    goal = await service.get_goal(goal_id)

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Objectif introuvable"
        )

    has_access = (
        (goal.user_id and goal.user_id == current_user.id) or
        (goal.household_id and goal.household_id == current_user.household_id)
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas accès à cet objectif"
        )

    try:
        update_dict = goal_data.model_dump(exclude_unset=True)
        updated_goal = await service.update_goal(
            goal_id=goal_id,
            update_dict=update_dict
        )

        if not updated_goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Objectif introuvable après mise à jour"
            )

        return updated_goal
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Supprimer un objectif"""
    service = GoalService(db)

    # Vérifier l'existence et l'accès
    goal = await service.get_goal(goal_id)

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Objectif introuvable"
        )

    has_access = (
        (goal.user_id and goal.user_id == current_user.id) or
        (goal.household_id and goal.household_id == current_user.household_id)
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas accès à cet objectif"
        )

    try:
        await service.delete_goal(goal_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

    return None


@router.patch("/{goal_id}/contribution", response_model=GoalResponse)
async def update_goal_contribution(
    goal_id: str,
    contribution_data: GoalContributionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mettre à jour manuellement la contribution actuelle d'un objectif

    Permet d'ajuster manuellement `current_amount` sans lier à des transactions.
    Utile pour initialiser un objectif avec une épargne existante.
    """
    service = GoalService(db)

    # Vérifier l'existence et l'accès
    goal = await service.get_goal(goal_id)

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Objectif introuvable"
        )

    has_access = (
        (goal.user_id and goal.user_id == current_user.id) or
        (goal.household_id and goal.household_id == current_user.household_id)
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas accès à cet objectif"
        )

    try:
        updated_goal = await service.update_contribution(
            goal_id=goal_id,
            amount=float(contribution_data.amount)
        )

        if not updated_goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Objectif introuvable après mise à jour"
            )

        return updated_goal
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{goal_id}/contribution", response_model=GoalResponse)
async def set_goal_contribution(
    goal_id: str,
    contribution_data: GoalContributionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Définir le montant actuel d'un objectif (remplace au lieu d'ajouter)

    Utiliser PUT pour remplacer complètement le montant actuel.
    Utiliser PATCH /contribution pour ajouter/retirer un montant.
    """
    service = GoalService(db)

    # Vérifier l'existence et l'accès
    goal = await service.get_goal(goal_id)

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Objectif introuvable"
        )

    has_access = (
        (goal.user_id and goal.user_id == current_user.id) or
        (goal.household_id and goal.household_id == current_user.household_id)
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas accès à cet objectif"
        )

    try:
        updated_goal = await service.set_contribution(
            goal_id=goal_id,
            amount=float(contribution_data.amount),
            user_id=current_user.id,
            household_id=current_user.household_id
        )

        if not updated_goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Objectif introuvable après mise à jour"
            )

        return updated_goal
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
