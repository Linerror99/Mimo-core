"""Tests API Invitations - Sprint 6 Mode Couple."""
import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta
from unittest.mock import AsyncMock

from app.models import User, Household, HouseholdType, HouseholdStatus, Invitation, InvitationType, InvitationStatus
from app.api.deps import get_current_user
from app.main import app
from tests.helpers import get_error_message


class TestInvitationsAPI:
    """Tests pour les endpoints d'invitations"""
    
    @pytest.fixture
    def mock_current_user(self):
        """Mock fixture pour get_current_user"""
        def _mock_user(user: User):
            async def override_get_current_user():
                return user
            app.dependency_overrides[get_current_user] = override_get_current_user
        return _mock_user
    
    @pytest.fixture
    async def user1(self, db_session):
        """User 1 avec son household INDIVIDUAL"""
        household = Household(
            id="household1_id",
            name="User1 Household",
            type=HouseholdType.INDIVIDUAL,
            status=HouseholdStatus.ACTIVE,
        )
        db_session.add(household)
        
        user = User(
            id="user1_id",
            email="user1@test.com",
            password_hash="hashed",
            first_name="John",
            last_name="Doe",
            household_id=household.id,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user
    
    @pytest.fixture
    async def user2(self, db_session):
        """User 2 avec son household INDIVIDUAL"""
        household = Household(
            id="household2_id",
            name="User2 Household",
            type=HouseholdType.INDIVIDUAL,
            status=HouseholdStatus.ACTIVE,
        )
        db_session.add(household)
        
        user = User(
            id="user2_id",
            email="user2@test.com",
            password_hash="hashed",
            first_name="Jane",
            last_name="Smith",
            household_id=household.id,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user
    
    @pytest.fixture
    async def pending_invitation(self, db_session, user1, user2):
        """Invitation PENDING de user1 vers user2"""
        invitation = Invitation(
            id="invitation1_id",
            inviter_user_id=user1.id,
            invitee_user_id=user2.id,
            type=InvitationType.EXISTING_USER,
            status=InvitationStatus.PENDING,
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
        db_session.add(invitation)
        await db_session.commit()
        await db_session.refresh(invitation)
        return invitation
    
    # ========================================================================
    # POST /invitations - Créer une invitation
    # ========================================================================
    
    async def test_create_invitation_success(self, client: AsyncClient, user1, user2, mock_current_user):
        """Test: créer une invitation avec succès"""
        mock_current_user(user1)
        
        response = await client.post(
            "/api/v1/invitations",
            json={
                "invitee_email": user2.email,
            },
        )
        
        assert response.status_code == 201
        data = response.json()
        
        assert data["inviter_user_id"] == user1.id
        assert data["inviter_email"] == user1.email
        assert data["inviter_name"] == "John Doe"
        assert data["invitee_user_id"] == user2.id
        assert data["invitee_email"] == user2.email
        assert data["invitee_name"] == "Jane Smith"
        assert data["type"] == InvitationType.EXISTING_USER.value
        assert data["status"] == InvitationStatus.PENDING.value
        assert "id" in data
        assert "expires_at" in data
    
    async def test_create_invitation_user_not_found(self, client: AsyncClient, user1, mock_current_user):
        """Test: créer une invitation pour un email inexistant"""
        mock_current_user(user1)
        
        response = await client.post(
            "/api/v1/invitations",
            json={
                "invitee_email": "nonexistent@test.com",
            },
        )
        
        # Assert - Should return 400 with user-friendly error
        assert response.status_code == 400
        error_msg = get_error_message(response.json())
        assert len(error_msg) > 0  # Error message exists
    
    async def test_create_invitation_duplicate(self, client: AsyncClient, user1, user2, pending_invitation, mock_current_user):
        """Test: créer une invitation en double (déjà PENDING)"""
        mock_current_user(user1)
        
        response = await client.post(
            "/api/v1/invitations",
            json={
                "invitee_email": user2.email,
            },
        )
        
        # Assert - Should return 400 with user-friendly error
        assert response.status_code == 400
        error_msg = get_error_message(response.json())
        assert len(error_msg) > 0  # Error message exists
    
    # ========================================================================
    # POST /invitations/{id}/accept - Accepter une invitation
    # ========================================================================
    
    async def test_accept_invitation_success(self, client: AsyncClient, user2, pending_invitation, mock_current_user):
        """Test: accepter une invitation avec succès"""
        mock_current_user(user2)  # L'invité accepte
        
        response = await client.post(
            f"/api/v1/invitations/{pending_invitation.id}/accept",
            json={},
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == pending_invitation.id
        assert data["status"] == InvitationStatus.ACCEPTED.value
        assert data["accepted_at"] is not None
    
    async def test_accept_invitation_not_invitee(self, client: AsyncClient, user1, pending_invitation, mock_current_user):
        """Test: seul l'invité peut accepter"""
        mock_current_user(user1)  # L'inviteur ne peut pas accepter
        
        response = await client.post(
            f"/api/v1/invitations/{pending_invitation.id}/accept",
            json={},
        )
        
        assert response.status_code == 400
    
    # ========================================================================
    # POST /invitations/{id}/reject - Rejeter une invitation
    # ========================================================================
    
    async def test_reject_invitation_success(self, client: AsyncClient, user2, pending_invitation, mock_current_user):
        """Test: rejeter une invitation avec succès"""
        mock_current_user(user2)  # L'invité rejette
        
        response = await client.post(
            f"/api/v1/invitations/{pending_invitation.id}/reject",
            json={},
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == pending_invitation.id
        assert data["status"] == InvitationStatus.REJECTED.value
        assert data["rejected_at"] is not None
    
    # ========================================================================
    # GET /invitations - Lister les invitations
    # ========================================================================
    
    async def test_list_invitations_sent(self, client: AsyncClient, user1, pending_invitation, mock_current_user):
        """Test: lister les invitations envoyées"""
        mock_current_user(user1)
        
        response = await client.get("/api/v1/invitations?type=sent")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] == 1
        assert len(data["invitations"]) == 1
        assert data["invitations"][0]["id"] == pending_invitation.id
        assert data["invitations"][0]["inviter_user_id"] == user1.id
    
    async def test_list_invitations_received(self, client: AsyncClient, user2, pending_invitation, mock_current_user):
        """Test: lister les invitations reçues"""
        mock_current_user(user2)
        
        response = await client.get("/api/v1/invitations?type=received")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] == 1
        assert len(data["invitations"]) == 1
        assert data["invitations"][0]["id"] == pending_invitation.id
        assert data["invitations"][0]["invitee_user_id"] == user2.id
    
    async def test_list_invitations_all(self, client: AsyncClient, user1, pending_invitation, mock_current_user):
        """Test: lister toutes les invitations (sans filter)"""
        mock_current_user(user1)
        
        response = await client.get("/api/v1/invitations")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] >= 1  # Au moins celle créée par la fixture
    
    # ========================================================================
    # DELETE /invitations/{id} - Annuler une invitation
    # ========================================================================
    
    async def test_cancel_invitation_success(self, client: AsyncClient, user1, pending_invitation, mock_current_user):
        """Test: annuler une invitation avec succès"""
        mock_current_user(user1)  # L'inviteur annule
        
        response = await client.delete(f"/api/v1/invitations/{pending_invitation.id}")
        
        assert response.status_code == 204
        
        # Vérifier que l'invitation est supprimée
        get_response = await client.get("/api/v1/invitations?type=sent")
        data = get_response.json()
        assert data["total"] == 0
    
    async def test_cancel_invitation_not_inviter(self, client: AsyncClient, user2, pending_invitation, mock_current_user):
        """Test: seul l'inviteur peut annuler"""
        mock_current_user(user2)  # L'invité ne peut pas annuler
        
        response = await client.delete(f"/api/v1/invitations/{pending_invitation.id}")
        
        assert response.status_code == 400
    
    async def test_cancel_invitation_not_found(self, client: AsyncClient, user1, mock_current_user):
        """Test: annuler une invitation inexistante"""
        mock_current_user(user1)
        
        response = await client.delete("/api/v1/invitations/nonexistent_id")
        
        assert response.status_code == 400
