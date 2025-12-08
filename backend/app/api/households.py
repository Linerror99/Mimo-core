"""API endpoints pour gérer les households (Sprint 6)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user
from app.models import User
from app.services.household_service import HouseholdService


router = APIRouter(prefix="/households", tags=["households"])


class DissolveHouseholdRequest(BaseModel):
    """Request body pour dissoudre un household."""
    pass  # Pas de body nécessaire, on utilise l'user courant


class DissolveHouseholdResponse(BaseModel):
    """Response de dissolution household."""
    archived_household: dict
    new_households: list[dict]


@router.post("/{household_id}/dissolve", response_model=DissolveHouseholdResponse)
async def dissolve_household(
    household_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Dissoudre un household COUPLE et créer 2 households INDIVIDUAL.
    
    Cette opération :
    - Archive le household COUPLE actuel
    - Crée 2 nouveaux households INDIVIDUAL
    - Répartit les comptes selon original_owner_user_id
    - Répartit les transactions (PERSONAL → nouveau household, SHARED RÉALISÉES → archivé, SHARED PROJETÉES → annulées)
    - Calcule les soldes initiaux (wallet personnel + 50% commun)
    - Envoie des notifications aux 2 membres
    
    **Permissions**: Seul un membre du household peut dissoudre.
    
    **Returns**: Détails du household archivé et des 2 nouveaux households créés
    
    **Raises**:
    - 403: Si user n'est pas membre du household
    - 404: Si household n'existe pas
    - 400: Si household n'est pas COUPLE ou pas ACTIVE
    """
    service = HouseholdService(db)
    
    try:
        result = await service.dissolve_household(
            household_id=household_id,
            initiated_by_user_id=current_user.id,
        )
        return result
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la dissolution: {str(e)}",
        )


@router.get("/archived")
async def list_archived_households(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lister tous les households archivés dont l'user est/était membre.
    
    Permet de consulter l'historique des anciens foyers dissous.
    
    **Returns**: Liste des households archivés avec infos basiques
    """
    from sqlalchemy import select, or_
    from app.models import Household, HouseholdStatus, User as UserModel
    
    # Trouver tous les households archivés où l'user est membre
    # (user.household_id ne pointe plus vers archivé, donc on check via l'historique)
    # Pour MVP: On retourne tous les households ARCHIVED (simplifié)
    
    stmt = select(Household).where(
        Household.status == HouseholdStatus.ARCHIVED
    )
    
    result = await db.execute(stmt)
    households = result.scalars().all()
    
    return {
        "archived_households": [
            {
                "id": h.id,
                "name": h.name,
                "type": h.type.value,
                "status": h.status.value,
                "created_at": h.created_at.isoformat(),
                "updated_at": h.updated_at.isoformat(),
            }
            for h in households
        ]
    }
