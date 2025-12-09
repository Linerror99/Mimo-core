"""
Tests for Goals API endpoints

Tests TDD pour les endpoints /api/v1/goals
"""
import pytest
from httpx import AsyncClient
from datetime import date, timedelta


@pytest.fixture
async def auth_data(client: AsyncClient):
    """Client authentifié avec headers (couple avec 2 utilisateurs)"""
    # Register user 1
    await client.post("/api/v1/auth/register", json={
        "email": "goals.test@example.com",
        "password": "Pass123!",
        "first_name": "Goals",
        "last_name": "Test"
    })
    
    # Register user 2 (partner)
    await client.post("/api/v1/auth/register", json={
        "email": "goals.partner@example.com",
        "password": "Pass123!",
        "first_name": "Partner",
        "last_name": "Test"
    })
    
    # Login user 1
    login_response = await client.post("/api/v1/auth/login", json={
        "email": "goals.test@example.com",
        "password": "Pass123!"
    })
    token = login_response.json()["access_token"]
    
    # Login user 2
    login2_response = await client.post("/api/v1/auth/login", json={
        "email": "goals.partner@example.com",
        "password": "Pass123!"
    })
    token2 = login2_response.json()["access_token"]
    
    # User 1 invite User 2
    invite_response = await client.post(
        "/api/v1/invitations",
        headers={"Authorization": f"Bearer {token}"},
        json={"invitee_email": "goals.partner@example.com"}
    )
    invitation_id = invite_response.json()["id"]
    
    # User 2 accepts invitation (this will merge households)
    await client.post(
        f"/api/v1/invitations/{invitation_id}/accept",
        headers={"Authorization": f"Bearer {token2}"}
    )
    
    # Get updated user info AFTER merge
    me_response = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    user_data = me_response.json()
    
    return {
        "headers": {"Authorization": f"Bearer {token}"},
        "user_id": user_data["id"],
        "household_id": user_data["household_id"]
    }


@pytest.mark.asyncio
class TestGoalsAPI:
    """Tests des endpoints Goals"""
    
    async def test_create_personal_goal(self, client: AsyncClient, auth_data: dict):
        """Test création objectif personnel"""
        response = await client.post(
            "/api/v1/goals",
            headers=auth_data["headers"],
            json={
                "name": "Vacances à Bali",
                "target_amount": 3000.00,
                "description": "Trip de rêve",
                "target_date": (date.today() + timedelta(days=180)).isoformat()
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Vacances à Bali"
        assert float(data["target_amount"]) == 3000.00
        assert data["is_personal"] is True
    
    async def test_create_household_goal(self, client: AsyncClient, auth_data: dict):
        """Test création objectif foyer"""
        response = await client.post(
            "/api/v1/goals",
            headers=auth_data["headers"],
            json={
                "name": "Apport maison",
                "target_amount": 50000.00,
                "household_id": auth_data["household_id"]
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Apport maison"
        assert data["is_household"] is True
    
    async def test_list_goals(self, client: AsyncClient, auth_data: dict):
        """Test lister les objectifs"""
        # Créer 2 objectifs
        await client.post(
            "/api/v1/goals",
            headers=auth_data["headers"],
            json={"name": "Goal 1", "target_amount": 1000.00}
        )
        await client.post(
            "/api/v1/goals",
            headers=auth_data["headers"],
            json={"name": "Goal 2", "target_amount": 2000.00}
        )
        
        response = await client.get(
            "/api/v1/goals",
            headers=auth_data["headers"]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2
    
    async def test_update_goal(self, client: AsyncClient, auth_data: dict):
        """Test mettre à jour un objectif"""
        # Créer
        create_response = await client.post(
            "/api/v1/goals",
            headers=auth_data["headers"],
            json={"name": "Old Name", "target_amount": 1000.00}
        )
        goal_id = create_response.json()["id"]
        
        # Mettre à jour
        response = await client.patch(
            f"/api/v1/goals/{goal_id}",
            headers=auth_data["headers"],
            json={"name": "New Name", "target_amount": 2000.00}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Name"
        assert float(data["target_amount"]) == 2000.00
    
    async def test_delete_goal(self, client: AsyncClient, auth_data: dict):
        """Test supprimer un objectif"""
        # Créer
        create_response = await client.post(
            "/api/v1/goals",
            headers=auth_data["headers"],
            json={"name": "To Delete", "target_amount": 1000.00}
        )
        goal_id = create_response.json()["id"]
        
        # Supprimer
        response = await client.delete(
            f"/api/v1/goals/{goal_id}",
            headers=auth_data["headers"]
        )
        
        assert response.status_code == 204
    
    async def test_update_contribution(self, client: AsyncClient, auth_data: dict):
        """Test mise à jour manuelle de la contribution"""
        # Créer
        create_response = await client.post(
            "/api/v1/goals",
            headers=auth_data["headers"],
            json={"name": "Test Contribution", "target_amount": 10000.00}
        )
        goal_id = create_response.json()["id"]
        
        # Mettre à jour contribution
        response = await client.patch(
            f"/api/v1/goals/{goal_id}/contribution",
            headers=auth_data["headers"],
            json={"amount": 5000.00}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert float(data["current_amount"]) == 5000.00
        assert data["progress_percentage"] == 50.0

