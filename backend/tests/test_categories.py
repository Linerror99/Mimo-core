"""
Tests for Category Endpoints

TDD approach for Category CRUD operations with tree structure
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category, CategoryType


@pytest.mark.asyncio
class TestCategoryEndpoints:
    """Test Category CRUD endpoints"""

    async def test_create_category_success(
        self,
        client: AsyncClient,
        test_user_token: str,
        test_user_household_id: str
    ):
        """Test creating a new root category"""
        payload = {
            "name": "Alimentation",
            "type": "EXPENSE",
            "icon": "🍔",
            "color": "#FF5733"
        }

        response = await client.post(
            "/api/v1/categories",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Alimentation"
        assert data["type"] == "EXPENSE"
        assert data["icon"] == "🍔"
        assert data["color"] == "#FF5733"
        assert data["household_id"] == test_user_household_id
        assert data["parent_id"] is None  # Root category
        assert "id" in data
        assert "created_at" in data

    async def test_create_subcategory_success(
        self,
        client: AsyncClient,
        test_user_token: str,
        test_user_household_id: str,
        db_session: AsyncSession
    ):
        """Test creating a subcategory under a parent"""
        # Create parent category
        parent = Category(
            household_id=test_user_household_id,
            name="Transport",
            type=CategoryType.EXPENSE,
            icon="🚗",
            color="#3498DB"
        )
        db_session.add(parent)
        await db_session.commit()
        await db_session.refresh(parent)

        # Create subcategory
        payload = {
            "name": "Essence",
            "type": "EXPENSE",
            "icon": "⛽",
            "color": "#E74C3C",
            "parent_id": parent.id
        }

        response = await client.post(
            "/api/v1/categories",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Essence"
        assert data["parent_id"] == parent.id

    async def test_create_category_unauthorized(self, client: AsyncClient):
        """Test creating category without authentication"""
        payload = {
            "name": "Test Category",
            "type": "EXPENSE"
        }

        response = await client.post("/api/v1/categories", json=payload)
        assert response.status_code == 403

    async def test_create_category_invalid_data(
        self,
        client: AsyncClient,
        test_user_token: str
    ):
        """Test creating category with invalid data"""
        payload = {
            "name": "",  # Empty name should fail
            "type": "EXPENSE"
        }

        response = await client.post(
            "/api/v1/categories",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 422

    async def test_list_categories(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str
    ):
        """Test listing all categories"""
        # Create test categories
        cat1 = Category(
            household_id=test_user_household_id,
            name="Revenus",
            type=CategoryType.INCOME,
            icon="💰",
            color="#27AE60"
        )
        cat2 = Category(
            household_id=test_user_household_id,
            name="Dépenses",
            type=CategoryType.EXPENSE,
            icon="💸",
            color="#E74C3C"
        )
        db_session.add_all([cat1, cat2])
        await db_session.commit()

        response = await client.get(
            "/api/v1/categories",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2
        assert any(cat["name"] == "Revenus" for cat in data)
        assert any(cat["name"] == "Dépenses" for cat in data)

    async def test_list_categories_by_type(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str
    ):
        """Test filtering categories by type"""
        # Create income and expense categories
        income = Category(
            household_id=test_user_household_id,
            name="Salaire",
            type=CategoryType.INCOME,
            icon="💵",
            color="#27AE60"
        )
        expense = Category(
            household_id=test_user_household_id,
            name="Loyer",
            type=CategoryType.EXPENSE,
            icon="🏠",
            color="#E74C3C"
        )
        db_session.add_all([income, expense])
        await db_session.commit()

        # Filter by INCOME
        response = await client.get(
            "/api/v1/categories?type=INCOME",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert all(cat["type"] == "INCOME" for cat in data)
        assert any(cat["name"] == "Salaire" for cat in data)

    async def test_get_category_by_id(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str
    ):
        """Test getting a specific category"""
        category = Category(
            household_id=test_user_household_id,
            name="Test Category",
            type=CategoryType.EXPENSE,
            icon="🎯",
            color="#9B59B6"
        )
        db_session.add(category)
        await db_session.commit()
        await db_session.refresh(category)

        response = await client.get(
            f"/api/v1/categories/{category.id}",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == category.id
        assert data["name"] == "Test Category"
        assert data["icon"] == "🎯"

    async def test_get_category_not_found(
        self,
        client: AsyncClient,
        test_user_token: str
    ):
        """Test getting non-existent category"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(
            f"/api/v1/categories/{fake_id}",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 404

    async def test_update_category(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str
    ):
        """Test updating a category"""
        category = Category(
            household_id=test_user_household_id,
            name="Old Name",
            type=CategoryType.EXPENSE,
            icon="❓",
            color="#000000"
        )
        db_session.add(category)
        await db_session.commit()
        await db_session.refresh(category)

        update_payload = {
            "name": "New Name",
            "icon": "✅",
            "color": "#FFFFFF"
        }

        response = await client.patch(
            f"/api/v1/categories/{category.id}",
            json=update_payload,
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Name"
        assert data["icon"] == "✅"
        assert data["color"] == "#FFFFFF"

    async def test_delete_category(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str
    ):
        """Test deleting a category"""
        category = Category(
            household_id=test_user_household_id,
            name="To Delete",
            type=CategoryType.EXPENSE,
            icon="🗑️",
            color="#95A5A6"
        )
        db_session.add(category)
        await db_session.commit()
        await db_session.refresh(category)

        response = await client.delete(
            f"/api/v1/categories/{category.id}",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 204

        # Verify category is deleted
        get_response = await client.get(
            f"/api/v1/categories/{category.id}",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert get_response.status_code == 404

    async def test_user_cannot_access_other_household_categories(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession
    ):
        """Test that users cannot access categories from other households"""
        # Create another user with different household
        other_user_data = {
            "email": "other2@example.com",
            "password": "OtherPassword123!",
            "first_name": "Other",
            "last_name": "User"
        }

        other_register = await client.post("/api/v1/auth/register", json=other_user_data)
        assert other_register.status_code == 201
        other_register.json()

        # Login as other user
        other_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "other2@example.com", "password": "OtherPassword123!"}
        )
        assert other_login.status_code == 200
        other_token = other_login.json()["access_token"]

        # Create category for other household
        other_category_data = {
            "name": "Other Category",
            "type": "EXPENSE",
            "icon": "🔒",
            "color": "#34495E"
        }

        create_response = await client.post(
            "/api/v1/categories",
            json=other_category_data,
            headers={"Authorization": f"Bearer {other_token}"}
        )
        assert create_response.status_code == 201
        other_category = create_response.json()
        other_category_id = other_category["id"]

        # Try to access other household's category with first user token
        response = await client.get(
            f"/api/v1/categories/{other_category_id}",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 404
