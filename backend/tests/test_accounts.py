"""
Tests for Account Endpoints

TDD approach for Account CRUD operations
"""
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Account, AccountType


@pytest.mark.asyncio
class TestAccountEndpoints:
    """Test Account CRUD endpoints"""

    async def test_create_account_success(
        self,
        client: AsyncClient,
        test_user_token: str,
        test_user_household_id: str
    ):
        """Test creating a new account"""
        payload = {
            "name": "Boursorama Courant",
            "type": "CHECKING",
            "initial_balance": 1500.50,
            "currency": "EUR"
        }

        response = await client.post(
            "/api/v1/accounts",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Boursorama Courant"
        assert data["type"] == "CHECKING"
        assert float(data["initial_balance"]) == 1500.50
        assert data["currency"] == "EUR"
        assert data["household_id"] == test_user_household_id
        assert data["is_active"] is True
        assert "id" in data
        assert "created_at" in data

    async def test_create_account_unauthorized(self, client: AsyncClient):
        """Test creating account without authentication"""
        payload = {
            "name": "Test Account",
            "type": "CHECKING"
        }

        response = await client.post("/api/v1/accounts", json=payload)
        assert response.status_code == 403  # FastAPI returns 403 for missing auth

    async def test_create_account_invalid_data(
        self,
        client: AsyncClient,
        test_user_token: str
    ):
        """Test creating account with invalid data"""
        payload = {
            "name": "",  # Empty name should fail
            "type": "CHECKING"
        }

        response = await client.post(
            "/api/v1/accounts",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 422

    async def test_list_accounts(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str
    ):
        """Test listing all accounts"""
        # Create test accounts
        account1 = Account(
            household_id=test_user_household_id,
            name="Compte 1",
            type=AccountType.CHECKING,
            initial_balance=Decimal("1000.00")
        )
        account2 = Account(
            household_id=test_user_household_id,
            name="Compte 2",
            type=AccountType.SAVINGS,
            initial_balance=Decimal("5000.00")
        )
        db_session.add_all([account1, account2])
        await db_session.commit()

        response = await client.get(
            "/api/v1/accounts",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2
        assert any(acc["name"] == "Compte 1" for acc in data)
        assert any(acc["name"] == "Compte 2" for acc in data)

    async def test_get_account_by_id(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str
    ):
        """Test getting a specific account"""
        account = Account(
            household_id=test_user_household_id,
            name="Test Account",
            type=AccountType.CHECKING,
            initial_balance=Decimal("2000.00")
        )
        db_session.add(account)
        await db_session.commit()
        await db_session.refresh(account)

        response = await client.get(
            f"/api/v1/accounts/{account.id}",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == account.id
        assert data["name"] == "Test Account"
        assert float(data["initial_balance"]) == 2000.00

    async def test_get_account_not_found(
        self,
        client: AsyncClient,
        test_user_token: str
    ):
        """Test getting non-existent account"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(
            f"/api/v1/accounts/{fake_id}",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 404

    async def test_update_account(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str
    ):
        """Test updating an account"""
        account = Account(
            household_id=test_user_household_id,
            name="Old Name",
            type=AccountType.CHECKING,
            initial_balance=Decimal("1000.00")
        )
        db_session.add(account)
        await db_session.commit()
        await db_session.refresh(account)

        update_payload = {
            "name": "New Name",
            "type": "SAVINGS"
        }

        response = await client.patch(
            f"/api/v1/accounts/{account.id}",
            json=update_payload,
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Name"
        assert data["type"] == "SAVINGS"

    async def test_delete_account(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str
    ):
        """Test deleting an account"""
        account = Account(
            household_id=test_user_household_id,
            name="To Delete",
            type=AccountType.CHECKING,
            initial_balance=Decimal("500.00")
        )
        db_session.add(account)
        await db_session.commit()
        await db_session.refresh(account)

        response = await client.delete(
            f"/api/v1/accounts/{account.id}",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 204

        # Verify account is soft deleted (closed)
        get_response = await client.get(
            f"/api/v1/accounts/{account.id}",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        # Account still exists but is_active=false
        assert get_response.status_code == 200
        account_data = get_response.json()
        assert not account_data["is_active"] or account_data["is_active"] == "false"
        assert account_data["closed_at"] is not None

    async def test_user_cannot_access_other_household_accounts(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession
    ):
        """Test that users cannot access accounts from other households"""
        # Create another user with different household
        other_user_data = {
            "email": "other@example.com",
            "password": "OtherPassword123!",
            "first_name": "Other",
            "last_name": "User"
        }

        other_register = await client.post("/api/v1/auth/register", json=other_user_data)
        assert other_register.status_code == 201
        other_user = other_register.json()
        other_user["household_id"]

        # Login as other user to create an account
        other_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "other@example.com", "password": "OtherPassword123!"}
        )
        assert other_login.status_code == 200
        other_token = other_login.json()["access_token"]

        # Create account for other household
        other_account_data = {
            "name": "Other Account",
            "type": "CHECKING",
            "initial_balance": 1000.00
        }

        create_response = await client.post(
            "/api/v1/accounts",
            json=other_account_data,
            headers={"Authorization": f"Bearer {other_token}"}
        )
        assert create_response.status_code == 201
        other_account = create_response.json()
        other_account_id = other_account["id"]

        # Try to access other household's account with first user token
        response = await client.get(
            f"/api/v1/accounts/{other_account_id}",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 404  # Should not find it
