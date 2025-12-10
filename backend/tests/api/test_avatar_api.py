"""
Tests for Avatar API endpoints

Tests TDD pour les endpoints /api/v1/users/me/avatar
"""
import pytest
from httpx import AsyncClient
from io import BytesIO
from tests.helpers import get_error_message


@pytest.fixture
async def auth_data(client: AsyncClient):
    """Client authentifié avec headers"""
    # Register
    await client.post("/api/v1/auth/register", json={
        "email": "avatar.test@example.com",
        "password": "Pass123!",
        "first_name": "Avatar",
        "last_name": "Test"
    })
    
    # Login
    login_response = await client.post("/api/v1/auth/login", json={
        "email": "avatar.test@example.com",
        "password": "Pass123!"
    })
    token = login_response.json()["access_token"]
    
    return {"headers": {"Authorization": f"Bearer {token}"}}


@pytest.mark.asyncio
class TestAvatarAPI:
    """Tests des endpoints Avatar"""
    
    async def test_upload_avatar_success(self, client: AsyncClient, auth_data: dict):
        """Test upload avatar avec succès"""
        # Créer un faux fichier image
        fake_image = BytesIO(b"fake image content")
        fake_image.name = "avatar.jpg"
        
        response = await client.post(
            "/api/v1/users/me/avatar",
            headers=auth_data["headers"],
            files={"file": ("avatar.jpg", fake_image, "image/jpeg")}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["avatar_url"] is not None
        assert "/uploads/avatars/" in data["avatar_url"]
        assert ".jpg" in data["avatar_url"]
    
    async def test_upload_avatar_invalid_type(self, client: AsyncClient, auth_data: dict):
        """Test upload avatar avec type invalide"""
        fake_file = BytesIO(b"not an image")
        fake_file.name = "document.txt"
        
        response = await client.post(
            "/api/v1/users/me/avatar",
            headers=auth_data["headers"],
            files={"file": ("document.txt", fake_file, "text/plain")}
        )
        
        # Assert - Should return 400 with error message
        assert response.status_code == 400
        error_msg = get_error_message(response.json())
        assert len(error_msg) > 0  # Error message exists
    
    async def test_delete_avatar_success(self, client: AsyncClient, auth_data: dict):
        """Test suppression avatar avec succès"""
        # D'abord uploader un avatar
        fake_image = BytesIO(b"fake image content")
        fake_image.name = "avatar.jpg"
        
        await client.post(
            "/api/v1/users/me/avatar",
            headers=auth_data["headers"],
            files={"file": ("avatar.jpg", fake_image, "image/jpeg")}
        )
        
        # Puis le supprimer
        response = await client.delete(
            "/api/v1/users/me/avatar",
            headers=auth_data["headers"]
        )
        
        assert response.status_code == 204
    
    async def test_delete_avatar_when_none(self, client: AsyncClient, auth_data: dict):
        """Test suppression avatar quand il n'y en a pas"""
        response = await client.delete(
            "/api/v1/users/me/avatar",
            headers=auth_data["headers"]
        )
        
        # Devrait réussir même si pas d'avatar (idempotent)
        assert response.status_code in [204, 404]
