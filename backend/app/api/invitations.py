"""
API Invitations - Sprint 6 Mode Couple

Endpoints pour gérer les invitations entre utilisateurs existants:
- POST /invitations - Créer une invitation
- POST /invitations/{id}/accept - Accepter une invitation
- POST /invitations/{id}/reject - Rejeter une invitation
- GET /invitations - Lister les invitations (sent/received)
- DELETE /invitations/{id} - Annuler une invitation (inviter only)
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models import InvitationStatus, InvitationType, User
from app.services.invitation_service import InvitationService

router = APIRouter(prefix="/invitations", tags=["invitations"])


# ============================================================================
# Schemas
# ============================================================================

class InvitationCreateRequest(BaseModel):
    """Requête de création d'invitation"""
    invitee_email: EmailStr


class InvitationResponse(BaseModel):
    """Réponse invitation"""
    id: str
    inviter_user_id: str
    inviter_email: str
    inviter_name: str
    invitee_user_id: str
    invitee_email: str
    invitee_name: str
    type: InvitationType
    status: InvitationStatus
    expires_at: datetime
    accepted_at: Optional[datetime]
    rejected_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class InvitationAcceptRequest(BaseModel):
    """Requête d'acceptation (vide pour l'instant)"""
    pass


class InvitationRejectRequest(BaseModel):
    """Requête de rejet (vide pour l'instant)"""
    pass


class InvitationListResponse(BaseModel):
    """Liste d'invitations"""
    invitations: List[InvitationResponse]
    total: int


# ============================================================================
# Endpoints
# ============================================================================

@router.post("", response_model=InvitationResponse, status_code=201)
async def create_invitation(
    request: InvitationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Créer une invitation pour un utilisateur existant.

    Règles:
    - L'invité doit être un utilisateur existant (email valide)
    - Pas d'invitation en double (PENDING entre les mêmes users)
    - Expiration: 7 jours
    """
    from sqlalchemy import select

    # Chercher l'utilisateur invité par email
    stmt = select(User).where(User.email == request.invitee_email)
    result = await db.execute(stmt)
    invitee_user = result.scalar_one_or_none()

    if not invitee_user:
        raise HTTPException(status_code=400, detail=f"User not found with email: {request.invitee_email}")

    service = InvitationService(db)

    try:
        invitation = await service.create_invitation(
            inviter_user_id=current_user.id,
            invitee_user_id=invitee_user.id,
        )

        # Construire la réponse avec les infos des users
        return InvitationResponse(
            id=invitation.id,
            inviter_user_id=invitation.inviter_user_id,
            inviter_email=invitation.inviter.email,
            inviter_name=f"{invitation.inviter.first_name} {invitation.inviter.last_name}",
            invitee_user_id=invitation.invitee_user_id,
            invitee_email=invitation.invitee.email,
            invitee_name=f"{invitation.invitee.first_name} {invitation.invitee.last_name}",
            type=invitation.type,
            status=invitation.status,
            expires_at=invitation.expires_at,
            accepted_at=invitation.accepted_at,
            rejected_at=invitation.rejected_at,
            created_at=invitation.created_at,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{invitation_id}/accept", response_model=InvitationResponse)
async def accept_invitation(
    invitation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Accepter une invitation.

    Règles:
    - Seul l'invité (invitee) peut accepter
    - L'invitation doit être PENDING
    - L'invitation ne doit pas être expirée
    """
    service = InvitationService(db)

    try:
        # Récupérer l'invitation pour vérifier l'invitee
        from sqlalchemy import select

        from app.models.invitation import Invitation

        stmt = select(Invitation).where(Invitation.id == invitation_id)
        result = await db.execute(stmt)
        invitation = result.scalar_one_or_none()

        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found")

        # Vérifier que l'utilisateur actuel est bien l'invitee
        if invitation.invitee_user_id != current_user.id:
            raise HTTPException(status_code=400, detail="Only the invitee can accept this invitation")

        # Accepter l'invitation (change le statut)
        invitation = await service.accept_invitation(invitation_id=invitation_id)

        # Fusionner les foyers des 2 utilisateurs
        from app.services.household_service import HouseholdService
        household_service = HouseholdService(db)

        # Récupérer les household_ids des 2 utilisateurs
        inviter_household_id = invitation.inviter.household_id
        invitee_household_id = invitation.invitee.household_id

        if inviter_household_id and invitee_household_id:
            # Générer le nom du nouveau household à partir des prénoms des 2 users
            inviter_first_name = invitation.inviter.first_name
            invitee_first_name = invitation.invitee.first_name
            new_household_name = f"{inviter_first_name} & {invitee_first_name}"

            await household_service.merge_households(
                household1_id=inviter_household_id,
                household2_id=invitee_household_id,
                new_household_name=new_household_name
            )

        return InvitationResponse(
            id=invitation.id,
            inviter_user_id=invitation.inviter_user_id,
            inviter_email=invitation.inviter.email,
            inviter_name=f"{invitation.inviter.first_name} {invitation.inviter.last_name}",
            invitee_user_id=invitation.invitee_user_id,
            invitee_email=invitation.invitee.email,
            invitee_name=f"{invitation.invitee.first_name} {invitation.invitee.last_name}",
            type=invitation.type,
            status=invitation.status,
            expires_at=invitation.expires_at,
            accepted_at=invitation.accepted_at,
            rejected_at=invitation.rejected_at,
            created_at=invitation.created_at,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{invitation_id}/reject", response_model=InvitationResponse)
async def reject_invitation(
    invitation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Rejeter une invitation.

    Règles:
    - Seul l'invité (invitee) peut rejeter
    - L'invitation doit être PENDING
    """
    service = InvitationService(db)

    try:
        invitation = await service.reject_invitation(invitation_id=invitation_id)

        return InvitationResponse(
            id=invitation.id,
            inviter_user_id=invitation.inviter_user_id,
            inviter_email=invitation.inviter.email,
            inviter_name=f"{invitation.inviter.first_name} {invitation.inviter.last_name}",
            invitee_user_id=invitation.invitee_user_id,
            invitee_email=invitation.invitee.email,
            invitee_name=f"{invitation.invitee.first_name} {invitation.invitee.last_name}",
            type=invitation.type,
            status=invitation.status,
            expires_at=invitation.expires_at,
            accepted_at=invitation.accepted_at,
            rejected_at=invitation.rejected_at,
            created_at=invitation.created_at,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=InvitationListResponse)
async def list_invitations(
    type: Optional[str] = Query(None, description="Filter: 'sent' or 'received'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lister les invitations de l'utilisateur.

    Query params:
    - type: "sent" (invitations envoyées) ou "received" (invitations reçues)
    - Si omis: toutes les invitations (sent + received)
    """
    service = InvitationService(db)

    try:
        # Si type n'est pas fourni, récupérer les deux types
        if type is None:
            sent_invitations = await service.get_user_invitations(
                user_id=current_user.id,
                type="sent",
            )
            received_invitations = await service.get_user_invitations(
                user_id=current_user.id,
                type="received",
            )
            invitations = sent_invitations + received_invitations
        else:
            if type not in ["sent", "received"]:
                raise HTTPException(status_code=400, detail="type must be 'sent' or 'received'")

            invitations = await service.get_user_invitations(
                user_id=current_user.id,
                type=type,
            )

        responses = [
            InvitationResponse(
                id=inv.id,
                inviter_user_id=inv.inviter_user_id,
                inviter_email=inv.inviter.email,
                inviter_name=f"{inv.inviter.first_name} {inv.inviter.last_name}",
                invitee_user_id=inv.invitee_user_id,
                invitee_email=inv.invitee.email,
                invitee_name=f"{inv.invitee.first_name} {inv.invitee.last_name}",
                type=inv.type,
                status=inv.status,
                expires_at=inv.expires_at,
                accepted_at=inv.accepted_at,
                rejected_at=inv.rejected_at,
                created_at=inv.created_at,
            )
            for inv in invitations
        ]

        return InvitationListResponse(
            invitations=responses,
            total=len(responses),
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{invitation_id}", status_code=204)
async def cancel_invitation(
    invitation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Annuler une invitation.

    Règles:
    - Seul l'inviteur (inviter) peut annuler
    - L'invitation doit être PENDING
    """
    service = InvitationService(db)

    try:
        await service.cancel_invitation(
            invitation_id=invitation_id,
            user_id=current_user.id,
        )
        return None

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
