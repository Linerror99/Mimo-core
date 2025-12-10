"""
Tests for authentication API endpoints (TDD - Red Phase)

User Stories tested:
- US-1.1: POST /api/v1/auth/register
- Login: POST /api/v1/auth/login
- US-6.1: POST /api/v1/auth/logout
- POST /api/v1/auth/refresh
"""
import pytest
from tests.helpers import get_error_message
from httpx import AsyncClient


@pytest.mark.asyncio
class TestAuthAPI:
    """Test authentication API endpoints."""
    
    async def test_register_endpoint_creates_user(self, client: AsyncClient):
        """US-1.1: User can register via POST /api/v1/auth/register."""
        # Arrange
        payload = {
            "email": "newuser@example.com",
            "password": "SecurePass123!",
            "first_name": "Alice",
            "last_name": "Smith"
        }
        
        # Act
        response = await client.post("/api/v1/auth/register", json=payload)
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["first_name"] == "Alice"
        assert data["last_name"] == "Smith"
        assert "id" in data
        assert "hashed_password" not in data  # Should not return password
    
    async def test_register_with_duplicate_email_returns_400(self, client: AsyncClient):
        """Registering duplicate email should return 400."""
        # Arrange
        payload = {
            "email": "duplicate@example.com",
            "password": "Pass123!",
            "first_name": "Bob",
            "last_name": "Jones"
        }
        
        # Act - Register first time
        await client.post("/api/v1/auth/register", json=payload)
        
        # Act - Register second time
        response = await client.post("/api/v1/auth/register", json=payload)
        
        # Assert - Should return 400 with user-friendly error
        assert response.status_code == 400
        error_msg = get_error_message(response.json())
        assert len(error_msg) > 0  # Error message exists
    
    async def test_register_with_weak_password_returns_422(self, client: AsyncClient):
        """Registration with weak password should be rejected."""
        # Arrange
        payload = {
            "email": "test@example.com",
            "password": "weak",  # Too short, no uppercase, no number
            "first_name": "Test",
            "last_name": "User"
        }
        
        # Act
        response = await client.post("/api/v1/auth/register", json=payload)
        
        # Assert
        assert response.status_code == 422
    
    async def test_login_endpoint_returns_tokens(self, client: AsyncClient):
        """User can login and receive JWT tokens."""
        # Arrange - Register user first
        register_payload = {
            "email": "login@example.com",
            "password": "Pass123!",
            "first_name": "Login",
            "last_name": "User"
        }
        await client.post("/api/v1/auth/register", json=register_payload)
        
        # Act - Login
        login_payload = {
            "email": "login@example.com",
            "password": "Pass123!"
        }
        response = await client.post("/api/v1/auth/login", json=login_payload)
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    async def test_login_with_invalid_credentials_returns_401(self, client: AsyncClient):
        """Login with wrong credentials should return 401."""
        # Arrange
        payload = {
            "email": "wrong@example.com",
            "password": "WrongPass123!"
        }
        
        # Act
        response = await client.post("/api/v1/auth/login", json=payload)
        
        # Assert - Should return 401 with user-friendly error
        assert response.status_code == 401
        error_msg = get_error_message(response.json())
        assert len(error_msg) > 0  # Error message exists
    
    async def test_logout_endpoint_blacklists_token(self, client: AsyncClient):
        """US-6.1: User can logout and token is blacklisted."""
        # Arrange - Register and login
        register_payload = {
            "email": "logout@example.com",
            "password": "Pass123!",
            "first_name": "Logout",
            "last_name": "User"
        }
        await client.post("/api/v1/auth/register", json=register_payload)
        
        login_response = await client.post("/api/v1/auth/login", json={
            "email": "logout@example.com",
            "password": "Pass123!"
        })
        access_token = login_response.json()["access_token"]
        
        # Act - Logout
        response = await client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        # Assert
        assert response.status_code == 200
        assert response.json()["message"] == "Successfully logged out"
    
    async def test_refresh_token_endpoint_returns_new_access_token(self, client: AsyncClient):
        """User can refresh access token using refresh token."""
        # Arrange - Register and login
        register_payload = {
            "email": "refresh@example.com",
            "password": "Pass123!",
            "first_name": "Refresh",
            "last_name": "User"
        }
        await client.post("/api/v1/auth/register", json=register_payload)
        
        login_response = await client.post("/api/v1/auth/login", json={
            "email": "refresh@example.com",
            "password": "Pass123!"
        })
        refresh_token = login_response.json()["refresh_token"]
        
        # Act - Refresh token
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
