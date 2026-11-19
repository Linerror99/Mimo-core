"""Regression tests for backend audit fixes (Stage 2 & 3)."""
from datetime import date, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import DEFAULT_INSECURE_JWT_SECRET, Settings
from app.models import Account, AccountType, Goal, Household, Transaction, TransactionState, TransactionType, User
from app.services.goal_service import GoalService


@pytest.mark.asyncio
class TestAuditBackendFixes:
    """Verify every backend bug fix introduced by the audit plan."""

    async def test_transaction_persists_goal_id(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str,
    ):
        """POST /api/v1/transactions must persist goal_id when provided."""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        account = Account(
            household_id=test_user_household_id,
            name="Compte Courant",
            type=AccountType.CHECKING,
            initial_balance=Decimal("2000.00"),
        )
        db_session.add(account)
        await db_session.commit()
        await db_session.refresh(account)

        goal_res = await client.post(
            "/api/v1/goals",
            json={
                "name": "Fonds d'urgence",
                "target_amount": 5000.0,
                "goal_type": "personal",
            },
            headers=headers,
        )
        assert goal_res.status_code == 201
        goal_id = goal_res.json()["id"]

        response = await client.post(
            "/api/v1/transactions",
            json={
                "description": "Versement fonds urgence",
                "amount": -250.0,
                "transaction_date": (date.today() - timedelta(days=1)).isoformat(),
                "type": "EXPENSE",
                "account_id": account.id,
                "goal_id": goal_id,
            },
            headers=headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["goal_id"] == goal_id

        # Verify transaction appears in goal transactions
        goal_txs_res = await client.get(
            f"/api/v1/goals/{goal_id}/transactions",
            headers=headers,
        )
        assert goal_txs_res.status_code == 200
        goal_txs = goal_txs_res.json()
        assert any(tx["id"] == data["id"] for tx in goal_txs)

    async def test_safe_to_spend_does_not_double_count_today_realized_expense(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str,
    ):
        """A REALIZED expense dated today must be deducted once (not twice) in safe-to-spend."""
        account = Account(
            household_id=test_user_household_id,
            name="Courant STS",
            type=AccountType.CHECKING,
            initial_balance=Decimal("1000.00"),
        )
        db_session.add(account)
        await db_session.commit()
        await db_session.refresh(account)

        today = date.today()
        realized_today = Transaction(
            household_id=test_user_household_id,
            account_id=account.id,
            description="Courses du jour",
            amount=Decimal("-100.00"),
            transaction_date=today,
            type=TransactionType.EXPENSE,
            state=TransactionState.REALIZED,
        )
        pending_today = Transaction(
            household_id=test_user_household_id,
            account_id=account.id,
            description="Abonnement à valider",
            amount=Decimal("-50.00"),
            transaction_date=today,
            type=TransactionType.PENDING if hasattr(TransactionType, "PENDING") else TransactionType.EXPENSE,
            state=TransactionState.PENDING,
        )
        db_session.add_all([realized_today, pending_today])
        await db_session.commit()

        response = await client.get(
            "/api/v1/projections/safe-to-spend",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        # Initial 1000 - 100 realized = 900 current_balance
        # Committed = 50 (only pending_today, NOT realized_today)
        assert data["current_balance"] == 900.0
        assert data["committed_expenses"] == 50.0
        assert data["safe_to_spend"] == 850.0

    async def test_patch_user_profile_preserves_is_in_couple(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str,
    ):
        """PATCH /api/v1/users/me must keep is_in_couple=True when household has 2 members."""
        partner = User(
            email="partner-couple-check@example.com",
            password_hash="hashed",
            first_name="Partner",
            last_name="Two",
            household_id=test_user_household_id,
            is_active=True,
        )
        db_session.add(partner)
        await db_session.commit()

        response = await client.patch(
            "/api/v1/users/me",
            json={"first_name": "UpdatedName"},
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "UpdatedName"
        assert data["is_in_couple"] is True

    async def test_account_update_ignores_initial_balance(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str,
    ):
        """PATCH /api/v1/accounts/{id} must not allow modifying initial_balance."""
        account = Account(
            household_id=test_user_household_id,
            name="Compte Verrouillé",
            type=AccountType.CHECKING,
            initial_balance=Decimal("1200.00"),
        )
        db_session.add(account)
        await db_session.commit()
        await db_session.refresh(account)

        response = await client.patch(
            f"/api/v1/accounts/{account.id}",
            json={"name": "Compte Renommé", "initial_balance": 99999.0},
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Compte Renommé"
        assert float(data["initial_balance"]) == 1200.0

    async def test_personal_goal_available_balance_works_for_solo_and_owned_accounts(
        self,
        db_session: AsyncSession,
        test_user: User,
        test_user_household_id: str,
    ):
        """GoalService.get_available_balance must not return 0 when original_owner_user_id is NULL."""
        legacy_account = Account(
            household_id=test_user_household_id,
            original_owner_user_id=None,
            name="Legacy Solo Account",
            type=AccountType.CHECKING,
            initial_balance=Decimal("1500.00"),
        )
        db_session.add(legacy_account)
        await db_session.commit()

        service = GoalService(db_session)
        available = await service.get_available_balance(
            user_id=test_user.id,
            household_id=test_user_household_id,
            is_household_goal=False,
        )
        assert available == Decimal("1500.00")

    async def test_receipts_endpoint_requires_authentication(self, client: AsyncClient):
        """GET /uploads/receipts/{filename} must reject unauthenticated callers."""
        response = await client.get("/uploads/receipts/secret-receipt.pdf")
        assert response.status_code in (401, 403)

    async def test_uploads_endpoint_blocks_path_traversal(
        self,
        client: AsyncClient,
        test_user_token: str,
    ):
        """Path traversal attempts must be rejected."""
        response = await client.get(
            "/uploads/receipts/..%2F..%2Fetc%2Fpasswd",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code in (400, 404)

    def test_production_settings_reject_default_jwt_secret(self):
        """Settings must fail fast in production if JWT_SECRET_KEY is default."""
        with pytest.raises(ValidationError):
            Settings(
                ENVIRONMENT="production",
                JWT_SECRET_KEY=DEFAULT_INSECURE_JWT_SECRET,
            )

        prod_ok = Settings(
            ENVIRONMENT="production",
            DEBUG=True,
            JWT_SECRET_KEY="a-very-strong-production-secret-key-at-least-32-chars",
        )
        assert prod_ok.DEBUG is False

    async def test_project_timeline_bidirectional_sync_and_rollback_keeps_edits(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str,
    ):
        """Edits in Project <-> Timeline stay in sync, and rollback removes tx while keeping edits in Project."""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        account = Account(
            household_id=test_user_household_id,
            name="Courant Sync Projet",
            type=AccountType.CHECKING,
            initial_balance=Decimal("5000.00"),
        )
        db_session.add(account)
        await db_session.commit()
        await db_session.refresh(account)

        orig_date = (date.today() + timedelta(days=10)).isoformat()
        proj_res = await client.post(
            "/api/v1/projects",
            json={
                "name": "Vacances Japon",
                "items": [
                    {
                        "name": "Billets avion",
                        "amount": 1200.0,
                        "planned_date": orig_date,
                        "account_id": account.id,
                    }
                ],
            },
            headers=headers,
        )
        assert proj_res.status_code == 201
        project_id = proj_res.json()["id"]
        item_id = proj_res.json()["items"][0]["id"]

        # 1. Commit project -> creates linked transaction
        commit_res = await client.post(f"/api/v1/projects/{project_id}/commit", headers=headers)
        assert commit_res.status_code == 200
        detail_after_commit = (await client.get(f"/api/v1/projects/{project_id}", headers=headers)).json()
        tx_id = detail_after_commit["items"][0]["transaction_id"]
        assert tx_id is not None

        # 2. Edit from Project -> synced to Timeline transaction
        proj_edit_date = (date.today() + timedelta(days=15)).isoformat()
        upd_item_res = await client.put(
            f"/api/v1/projects/{project_id}/items/{item_id}",
            json={"amount": 1350.0, "planned_date": proj_edit_date},
            headers=headers,
        )
        assert upd_item_res.status_code == 200
        tx_after_proj_edit = (await client.get(f"/api/v1/transactions/{tx_id}", headers=headers)).json()
        assert float(tx_after_proj_edit["amount"]) == -1350.0
        assert tx_after_proj_edit["transaction_date"] == proj_edit_date

        # 3. Edit from Timeline -> synced back to Project item
        tl_edit_date = (date.today() + timedelta(days=20)).isoformat()
        upd_tx_res = await client.patch(
            f"/api/v1/transactions/{tx_id}",
            json={"amount": -1490.0, "transaction_date": tl_edit_date},
            headers=headers,
        )
        assert upd_tx_res.status_code == 200
        detail_after_tl_edit = (await client.get(f"/api/v1/projects/{project_id}", headers=headers)).json()
        assert float(detail_after_tl_edit["items"][0]["amount"]) == 1490.0
        assert detail_after_tl_edit["items"][0]["planned_date"] == tl_edit_date

        # 4. Rollback to simulation -> removes transaction, preserves latest edits in ProjectItem
        rb_res = await client.post(f"/api/v1/projects/{project_id}/rollback", headers=headers)
        assert rb_res.status_code == 200
        tx_after_rb = await client.get(f"/api/v1/transactions/{tx_id}", headers=headers)
        assert tx_after_rb.status_code == 404
        detail_after_rb = (await client.get(f"/api/v1/projects/{project_id}", headers=headers)).json()
        assert detail_after_rb["status"] == "DRAFT"
        assert detail_after_rb["items"][0]["transaction_id"] is None
        assert float(detail_after_rb["items"][0]["amount"]) == 1490.0
        assert detail_after_rb["items"][0]["planned_date"] == tl_edit_date

    async def test_edit_single_unvalidated_recurring_occurrence_only(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str,
    ):
        """Editing amount/date of one PROJECTED recurring occurrence must not alter sibling occurrences."""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        account = Account(
            household_id=test_user_household_id,
            name="Courant Récurrence",
            type=AccountType.CHECKING,
            initial_balance=Decimal("2000.00"),
        )
        db_session.add(account)
        await db_session.commit()
        await db_session.refresh(account)

        d1 = date.today() + timedelta(days=5)
        d2 = date.today() + timedelta(days=35)
        tx1 = Transaction(
            household_id=test_user_household_id,
            account_id=account.id,
            description="Loyer",
            amount=Decimal("-800.00"),
            transaction_date=d1,
            type=TransactionType.EXPENSE,
            state=TransactionState.PROJECTED,
        )
        tx2 = Transaction(
            household_id=test_user_household_id,
            account_id=account.id,
            description="Loyer",
            amount=Decimal("-800.00"),
            transaction_date=d2,
            type=TransactionType.EXPENSE,
            state=TransactionState.PROJECTED,
        )
        db_session.add_all([tx1, tx2])
        await db_session.commit()
        await db_session.refresh(tx1)
        await db_session.refresh(tx2)

        new_date = (date.today() + timedelta(days=8)).isoformat()
        res = await client.patch(
            f"/api/v1/transactions/{tx1.id}",
            json={"amount": -850.0, "transaction_date": new_date},
            headers=headers,
        )
        assert res.status_code == 200
        assert float(res.json()["amount"]) == -850.0
        assert res.json()["transaction_date"] == new_date

        # Second occurrence must remain untouched
        tx2_after = (await client.get(f"/api/v1/transactions/{tx2.id}", headers=headers)).json()
        assert float(tx2_after["amount"]) == -800.0
        assert tx2_after["transaction_date"] == d2.isoformat()
