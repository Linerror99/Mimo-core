"""
Tests for user profile management (TDD - Red Phase)

User Stories tested:
- US-6.2: Update user info
- US-6.2b: Change password
"""
import pytest
from httpx import AsyncClient
from tests.helpers import get_error_message


@pytest.mark.asyncio
class TestUserAPI:
    """Test user profile management endpoints."""
    
    async def test_get_current_user_returns_profile(self, client: AsyncClient):
        """Authenticated user can get their profile."""
        # Arrange - Register and login
        register_payload = {
            "email": "profile@example.com",
            "password": "Pass123!",
            "first_name": "Profile",
            "last_name": "User"
        }
        await client.post("/api/v1/auth/register", json=register_payload)
        
        login_response = await client.post("/api/v1/auth/login", json={
            "email": "profile@example.com",
            "password": "Pass123!"
        })
        access_token = login_response.json()["access_token"]
        
        # Act
        response = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "profile@example.com"
        assert data["first_name"] == "Profile"
        assert data["last_name"] == "User"
    
    async def test_update_user_info_succeeds(self, client: AsyncClient):
        """US-6.2: User can update their first_name and last_name."""
        # Arrange - Register and login
        register_payload = {
            "email": "update@example.com",
            "password": "Pass123!",
            "first_name": "Old",
            "last_name": "Name"
        }
        await client.post("/api/v1/auth/register", json=register_payload)
        
        login_response = await client.post("/api/v1/auth/login", json={
            "email": "update@example.com",
            "password": "Pass123!"
        })
        access_token = login_response.json()["access_token"]
        
        # Act - Update profile
        update_payload = {
            "first_name": "New",
            "last_name": "Name"
        }
        response = await client.patch(
            "/api/v1/users/me",
            json=update_payload,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "New"
        assert data["last_name"] == "Name"
    
    async def test_change_password_succeeds(self, client: AsyncClient):
        """US-6.2b: User can change their password."""
        # Arrange - Register and login
        register_payload = {
            "email": "changepass@example.com",
            "password": "OldPass123!",
            "first_name": "Change",
            "last_name": "Password"
        }
        await client.post("/api/v1/auth/register", json=register_payload)
        
        login_response = await client.post("/api/v1/auth/login", json={
            "email": "changepass@example.com",
            "password": "OldPass123!"
        })
        access_token = login_response.json()["access_token"]
        
        # Act - Change password
        password_payload = {
            "old_password": "OldPass123!",
            "new_password": "NewPass123!"
        }
        response = await client.patch(
            "/api/v1/users/me/password",
            json=password_payload,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        # Assert
        assert response.status_code == 200
        
        # Verify can login with new password
        new_login = await client.post("/api/v1/auth/login", json={
            "email": "changepass@example.com",
            "password": "NewPass123!"
        })
        assert new_login.status_code == 200
    
    async def test_change_password_with_wrong_old_password_fails(self, client: AsyncClient):
        """Changing password with wrong old password should fail."""
        # Arrange
        register_payload = {
            "email": "wrongold@example.com",
            "password": "CorrectPass123!",
            "first_name": "Test",
            "last_name": "User"
        }
        await client.post("/api/v1/auth/register", json=register_payload)
        
        login_response = await client.post("/api/v1/auth/login", json={
            "email": "wrongold@example.com",
            "password": "CorrectPass123!"
        })
        access_token = login_response.json()["access_token"]
        
        # Act - Try to change with wrong old password
        password_payload = {
            "old_password": "WrongOldPass!",
            "new_password": "NewPass123!"
        }
        response = await client.patch(
            "/api/v1/users/me/password",
            json=password_payload,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        # Assert - Should return 400 with user-friendly error
        assert response.status_code == 400
        error_msg = get_error_message(response.json())
        assert len(error_msg) > 0  # Error message exists
