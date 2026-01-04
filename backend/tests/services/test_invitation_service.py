"""Tests pour InvitationService (Sprint 6 - Mode Couple)."""
from datetime import datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Household,
    HouseholdType,
    InvitationStatus,
    InvitationType,
    User,
)
from app.services.invitation_service import InvitationService


@pytest.fixture
async def user1(db_session: AsyncSession) -> User:
    """Créer un utilisateur 1 pour les tests."""
    user = User(
        id="user1_id",
        email="user1@test.com",
        password_hash="hashed",
        first_name="User",
        last_name="One",
    )
    db_session.add(user)

    # Créer un household INDIVIDUAL pour user1
    household = Household(
        id="household1_id",
        name="User One's Household",
        type=HouseholdType.INDIVIDUAL,
    )
    user.household_id = household.id
    db_session.add(household)

    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def user2(db_session: AsyncSession) -> User:
    """Créer un utilisateur 2 pour les tests."""
    user = User(
        id="user2_id",
        email="user2@test.com",
        password_hash="hashed",
        first_name="User",
        last_name="Two",
    )
    db_session.add(user)

    # Créer un household INDIVIDUAL pour user2
    household = Household(
        id="household2_id",
        name="User Two's Household",
        type=HouseholdType.INDIVIDUAL,
    )
    user.household_id = household.id
    db_session.add(household)

    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.mark.asyncio
class TestInvitationService:
    """Tests pour InvitationService."""

    async def test_create_invitation_success(
        self, db_session: AsyncSession, user1: User, user2: User
    ):
        """Test: créer une invitation entre deux utilisateurs existants."""
        service = InvitationService(db_session)

        invitation = await service.create_invitation(
            inviter_user_id=user1.id,
            invitee_user_id=user2.id,
        )

        assert invitation.id is not None
        assert invitation.inviter_user_id == user1.id
        assert invitation.invitee_user_id == user2.id
        assert invitation.type == InvitationType.EXISTING_USER
        assert invitation.status == InvitationStatus.PENDING
        assert invitation.expires_at > datetime.utcnow()
        assert invitation.expires_at <= datetime.utcnow() + timedelta(days=7)
        assert invitation.created_at is not None
        assert invitation.accepted_at is None
        assert invitation.rejected_at is None

    async def test_create_invitation_duplicate_pending(
        self, db_session: AsyncSession, user1: User, user2: User
    ):
        """Test: empêcher la création d'une invitation si une PENDING existe déjà."""
        service = InvitationService(db_session)

        # Première invitation
        await service.create_invitation(user1.id, user2.id)

        # Tentative de dupliquer
        with pytest.raises(ValueError, match="invitation.*pending"):
            await service.create_invitation(user1.id, user2.id)

    async def test_accept_invitation_success(
        self, db_session: AsyncSession, user1: User, user2: User
    ):
        """Test: accepter une invitation PENDING."""
        service = InvitationService(db_session)

        # Créer invitation
        invitation = await service.create_invitation(user1.id, user2.id)

        # Accepter
        accepted_invitation = await service.accept_invitation(invitation.id)

        assert accepted_invitation.status == InvitationStatus.ACCEPTED
        assert accepted_invitation.accepted_at is not None
        assert accepted_invitation.accepted_at <= datetime.utcnow()

    async def test_reject_invitation_success(
        self, db_session: AsyncSession, user1: User, user2: User
    ):
        """Test: rejeter une invitation PENDING."""
        service = InvitationService(db_session)

        # Créer invitation
        invitation = await service.create_invitation(user1.id, user2.id)

        # Rejeter
        rejected_invitation = await service.reject_invitation(invitation.id)

        assert rejected_invitation.status == InvitationStatus.REJECTED
        assert rejected_invitation.rejected_at is not None
        assert rejected_invitation.rejected_at <= datetime.utcnow()

    async def test_get_user_invitations_sent(
        self, db_session: AsyncSession, user1: User, user2: User
    ):
        """Test: récupérer les invitations ENVOYÉES par un utilisateur."""
        service = InvitationService(db_session)

        # user1 envoie une invitation à user2
        await service.create_invitation(user1.id, user2.id)

        # Récupérer invitations envoyées par user1
        sent_invitations = await service.get_user_invitations(
            user_id=user1.id, type="sent"
        )

        assert len(sent_invitations) == 1
        assert sent_invitations[0].inviter_user_id == user1.id
        assert sent_invitations[0].invitee_user_id == user2.id

    async def test_get_user_invitations_received(
        self, db_session: AsyncSession, user1: User, user2: User
    ):
        """Test: récupérer les invitations REÇUES par un utilisateur."""
        service = InvitationService(db_session)

        # user1 envoie une invitation à user2
        await service.create_invitation(user1.id, user2.id)

        # Récupérer invitations reçues par user2
        received_invitations = await service.get_user_invitations(
            user_id=user2.id, type="received"
        )

        assert len(received_invitations) == 1
        assert received_invitations[0].inviter_user_id == user1.id
        assert received_invitations[0].invitee_user_id == user2.id

    async def test_cancel_invitation_success(
        self, db_session: AsyncSession, user1: User, user2: User
    ):
        """Test: annuler une invitation PENDING (inviter uniquement)."""
        service = InvitationService(db_session)

        # Créer invitation
        invitation = await service.create_invitation(user1.id, user2.id)

        # Annuler
        await service.cancel_invitation(invitation.id, user_id=user1.id)

        # Vérifier que l'invitation a été supprimée
        invitations = await service.get_user_invitations(user1.id, "sent")
        assert len(invitations) == 0

    async def test_invitation_expiry_validation(self, db_session: AsyncSession, user1: User, user2: User):
        """Test: une invitation expirée ne peut pas être acceptée."""
        service = InvitationService(db_session)

        # Créer une invitation
        invitation = await service.create_invitation(user1.id, user2.id)

        # Simuler expiration en modifiant expires_at manuellement
        invitation.expires_at = datetime.utcnow() - timedelta(days=1)
        await db_session.commit()
        await db_session.refresh(invitation)

        # Tenter d'accepter
        with pytest.raises(ValueError, match="expired"):
            await service.accept_invitation(invitation.id)
