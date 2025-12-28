"""Service pour gérer les invitations (Sprint 6 - Mode Couple)."""
import uuid
from datetime import datetime, timedelta
from typing import List, Literal

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Invitation,
    InvitationStatus,
    InvitationType,
)


class InvitationService:
    """Service pour gérer les invitations household."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_invitation(
        self,
        inviter_user_id: str,
        invitee_user_id: str,
    ) -> Invitation:
        """
        Créer une invitation d'un utilisateur à un autre.

        Args:
            inviter_user_id: ID de l'utilisateur qui envoie l'invitation
            invitee_user_id: ID de l'utilisateur qui reçoit l'invitation

        Returns:
            Invitation: L'invitation créée

        Raises:
            ValueError: Si une invitation PENDING existe déjà entre ces utilisateurs
        """
        # Vérifier qu'il n'existe pas déjà une invitation PENDING
        stmt = select(Invitation).where(
            and_(
                or_(
                    and_(
                        Invitation.inviter_user_id == inviter_user_id,
                        Invitation.invitee_user_id == invitee_user_id,
                    ),
                    and_(
                        Invitation.inviter_user_id == invitee_user_id,
                        Invitation.invitee_user_id == inviter_user_id,
                    ),
                ),
                Invitation.status == InvitationStatus.PENDING,
            )
        )
        existing_invitation = (await self.db.execute(stmt)).scalar_one_or_none()

        if existing_invitation:
            raise ValueError("Une invitation pending existe déjà entre ces utilisateurs")

        # Créer la nouvelle invitation
        invitation = Invitation(
            id=str(uuid.uuid4()),
            inviter_user_id=inviter_user_id,
            invitee_user_id=invitee_user_id,
            type=InvitationType.EXISTING_USER,
            status=InvitationStatus.PENDING,
            expires_at=datetime.utcnow() + timedelta(days=7),
            created_at=datetime.utcnow(),
        )

        self.db.add(invitation)
        await self.db.commit()
        await self.db.refresh(invitation)

        # Charger les relations inviter et invitee
        stmt = select(Invitation).where(Invitation.id == invitation.id).options(
            selectinload(Invitation.inviter),
            selectinload(Invitation.invitee)
        )
        result = await self.db.execute(stmt)
        invitation = result.scalar_one()

        return invitation

    async def accept_invitation(self, invitation_id: str) -> Invitation:
        """
        Accepter une invitation PENDING.

        Args:
            invitation_id: ID de l'invitation

        Returns:
            Invitation: L'invitation acceptée

        Raises:
            ValueError: Si l'invitation n'existe pas, n'est pas PENDING, ou est expirée
        """
        invitation = await self._get_invitation(invitation_id)

        if invitation.status != InvitationStatus.PENDING:
            raise ValueError("Cette invitation ne peut pas être acceptée")

        # Vérifier expiration
        if invitation.is_expired:
            raise ValueError("Cette invitation est expired")

        invitation.status = InvitationStatus.ACCEPTED
        invitation.accepted_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(invitation)

        # Charger les relations inviter et invitee
        stmt = select(Invitation).where(Invitation.id == invitation.id).options(
            selectinload(Invitation.inviter),
            selectinload(Invitation.invitee)
        )
        result = await self.db.execute(stmt)
        invitation = result.scalar_one()

        return invitation

    async def reject_invitation(self, invitation_id: str) -> Invitation:
        """
        Rejeter une invitation PENDING.

        Args:
            invitation_id: ID de l'invitation

        Returns:
            Invitation: L'invitation rejetée

        Raises:
            ValueError: Si l'invitation n'existe pas ou n'est pas PENDING
        """
        invitation = await self._get_invitation(invitation_id)

        if invitation.status != InvitationStatus.PENDING:
            raise ValueError("Cette invitation ne peut pas être rejetée")

        invitation.status = InvitationStatus.REJECTED
        invitation.rejected_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(invitation)

        # Charger les relations inviter et invitee
        stmt = select(Invitation).where(Invitation.id == invitation.id).options(
            selectinload(Invitation.inviter),
            selectinload(Invitation.invitee)
        )
        result = await self.db.execute(stmt)
        invitation = result.scalar_one()

        return invitation

    async def get_user_invitations(
        self,
        user_id: str,
        type: Literal["sent", "received"],
    ) -> List[Invitation]:
        """
        Récupérer les invitations envoyées ou reçues par un utilisateur.

        Args:
            user_id: ID de l'utilisateur
            type: "sent" pour invitations envoyées, "received" pour invitations reçues

        Returns:
            List[Invitation]: Liste des invitations
        """
        if type == "sent":
            stmt = select(Invitation).where(Invitation.inviter_user_id == user_id)
        elif type == "received":
            stmt = select(Invitation).where(Invitation.invitee_user_id == user_id)
        else:
            raise ValueError("type must be 'sent' or 'received'")

        stmt = stmt.options(
            selectinload(Invitation.inviter),
            selectinload(Invitation.invitee)
        ).order_by(Invitation.created_at.desc())

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def cancel_invitation(self, invitation_id: str, user_id: str) -> None:
        """
        Annuler (supprimer) une invitation PENDING.
        Seul l'inviter peut annuler.

        Args:
            invitation_id: ID de l'invitation
            user_id: ID de l'utilisateur qui annule (doit être l'inviter)

        Raises:
            ValueError: Si l'invitation n'existe pas, n'est pas PENDING, ou user_id != inviter
        """
        invitation = await self._get_invitation(invitation_id)

        if invitation.inviter_user_id != user_id:
            raise ValueError("Seul l'inviter peut annuler cette invitation")

        if invitation.status != InvitationStatus.PENDING:
            raise ValueError("Seules les invitations PENDING peuvent être annulées")

        await self.db.delete(invitation)
        await self.db.commit()

    async def _get_invitation(self, invitation_id: str) -> Invitation:
        """Récupérer une invitation par ID avec relations chargées."""
        stmt = select(Invitation).where(Invitation.id == invitation_id).options(
            selectinload(Invitation.inviter),
            selectinload(Invitation.invitee)
        )
        invitation = (await self.db.execute(stmt)).scalar_one_or_none()

        if not invitation:
            raise ValueError("Invitation not found")

        return invitation
