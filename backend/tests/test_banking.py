"""Tests TDD complets pour l'intégration Open Banking (Phases 1 & 2)."""
from datetime import date, datetime, timedelta
from decimal import Decimal
from urllib.parse import parse_qs, urlparse

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Account,
    AccountType,
    BankConnection,
    Category,
    CategoryType,
    Transaction,
    TransactionState,
    TransactionType,
)
from app.services.banking.base import ExternalTransaction
from app.services.banking.mock_provider import MockBankProvider
from app.services.banking.sync_service import BankingSyncService


@pytest.mark.asyncio
class TestOpenBanking:
    """Vérifie tout le cycle Open Banking : connect, callback, link, exact sync, merge, unlink, sécurité."""

    async def test_full_connect_callback_link_and_idempotent_sync(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str,
        monkeypatch: pytest.MonkeyPatch,
    ):
        """Flow complet connect -> callback -> link existing account -> sync x2 = 0 doublon."""
        from app.config import settings
        monkeypatch.setattr(settings, "BANKING_PROVIDER", "mock")
        headers = {"Authorization": f"Bearer {test_user_token}"}

        # 1. Liste des institutions françaises
        inst_res = await client.get("/api/v1/banking/institutions?country=FR&search=Société", headers=headers)
        assert inst_res.status_code == 200
        insts = inst_res.json()
        assert any("Société Générale" in i["name"] for i in insts)

        # 2. Compte Mimo existant (ex. SG)
        sg_account = Account(
            household_id=test_user_household_id,
            name="SG",
            type=AccountType.CHECKING,
            initial_balance=Decimal("1000.00"),
        )
        db_session.add(sg_account)
        await db_session.commit()
        await db_session.refresh(sg_account)

        # 3. Démarrer la connexion
        connect_res = await client.post(
            "/api/v1/banking/connect",
            json={"institution_name": "Société Générale", "institution_country": "FR"},
            headers=headers,
        )
        assert connect_res.status_code == 201
        connect_data = connect_res.json()
        assert connect_data["provider"] == "mock"
        parsed = urlparse(connect_data["auth_url"])
        qs = parse_qs(parsed.query)
        code = qs["code"][0]
        state = qs["state"][0]

        # 4. Callback OAuth
        cb_res = await client.post(
            "/api/v1/banking/callback",
            json={"code": code, "state": state},
            headers=headers,
        )
        assert cb_res.status_code == 200
        cb_data = cb_res.json()
        assert cb_data["status"] == "ACTIVE"
        assert len(cb_data["discovered_accounts"]) >= 1
        ext_acc = cb_data["discovered_accounts"][0]

        # 5. Associer le compte bancaire au compte Mimo SG existant + 1re synchro
        link_res = await client.post(
            f"/api/v1/banking/connections/{cb_data['connection_id']}/link-accounts",
            json={
                "mappings": [
                    {
                        "external_account_id": ext_acc["external_account_id"],
                        "mimo_account_id": sg_account.id,
                        "iban_masked": ext_acc["iban_masked"],
                        "sync_from_date": (date.today() - timedelta(days=7)).isoformat(),
                        "sync_enabled": True,
                    }
                ],
                "run_initial_sync": True,
            },
            headers=headers,
        )
        assert link_res.status_code == 200
        first_sync = link_res.json()
        assert first_sync["imported"] == 2
        assert first_sync["skipped"] == 0

        # 6. Re-synchronisation manuelle immédiate -> strictement 0 doublon
        second_sync = (await client.post("/api/v1/banking/sync", headers=headers)).json()
        assert second_sync["imported"] == 0
        assert second_sync["skipped"] == 2

        # 7. Vérifier que le compte expose bien iban_masked et sync_enabled
        acc_detail = (await client.get(f"/api/v1/accounts/{sg_account.id}", headers=headers)).json()
        assert acc_detail["sync_enabled"] is True
        assert acc_detail["iban_masked"] == "FR76 •••• 4821"

    async def test_exact_amount_auto_match_and_no_match_on_different_amount(
        self,
        db_session: AsyncSession,
        test_user_household_id: str,
        test_user,
    ):
        """
        Règle métier stricte :
        - Montant EXACT au centime près (±3j) -> valide la transaction prévue en REALIZED
        - Montant différent même de 1 € -> crée une nouvelle transaction (pas d'auto-validation risquée)
        """
        today = date.today()
        account = Account(
            household_id=test_user_household_id,
            name="SG Exact",
            type=AccountType.CHECKING,
            initial_balance=Decimal("2000.00"),
            external_account_id="ext_exact_1",
            sync_enabled=True,
            sync_from_date=today - timedelta(days=10),
        )
        conn = BankConnection(
            household_id=test_user_household_id,
            user_id=test_user.id,
            provider="mock",
            institution_name="Société Générale",
            institution_country="FR",
            session_id="sess_exact",
            state_token="state_exact_token_123",
            status="ACTIVE",
            consent_expires_at=datetime.utcnow() + timedelta(days=60),
        )
        db_session.add(conn)
        await db_session.flush()
        account.bank_connection_id = conn.id
        db_session.add(account)

        # Catégorie Courses + historique pour tester l'auto-catégorisation
        cat_courses = Category(
            household_id=test_user_household_id,
            name="Courses",
            type=CategoryType.EXPENSE,
            color="#10b981",
        )
        db_session.add(cat_courses)
        await db_session.flush()

        past_tx = Transaction(
            household_id=test_user_household_id,
            account_id=account.id,
            category_id=cat_courses.id,
            description="Carrefour Market",
            amount=Decimal("-55.00"),
            transaction_date=today - timedelta(days=15),
            type=TransactionType.EXPENSE,
            state=TransactionState.REALIZED,
        )
        # Opération prévue avec montant EXACT (-39.99) à J+1
        planned_exact = Transaction(
            household_id=test_user_household_id,
            account_id=account.id,
            description="Abonnement Fibre",
            amount=Decimal("-39.99"),
            transaction_date=today + timedelta(days=1),
            type=TransactionType.EXPENSE,
            state=TransactionState.PROJECTED,
        )
        # Opération prévue salaire (2200.00) mais la banque verse 2250.00 -> NE DOIT PAS auto-matcher
        planned_salary = Transaction(
            household_id=test_user_household_id,
            account_id=account.id,
            description="Salaire CDI",
            amount=Decimal("2200.00"),
            transaction_date=today + timedelta(days=1),
            type=TransactionType.INCOME,
            state=TransactionState.PROJECTED,
        )
        db_session.add_all([past_tx, planned_exact, planned_salary])
        await db_session.commit()

        custom_bank_txs = [
            ExternalTransaction(
                external_transaction_id="eb_fibre_1",
                booking_date=today,
                amount=Decimal("-39.99"),
                description="ORANGE FIBRE",
            ),
            ExternalTransaction(
                external_transaction_id="eb_salary_1",
                booking_date=today,
                amount=Decimal("2250.00"),
                description="VIR SALAIRE CAPGEMINI",
            ),
            ExternalTransaction(
                external_transaction_id="eb_carrefour_1",
                booking_date=today,
                amount=Decimal("-18.40"),
                description="CARREFOUR MARKET PARIS",
                counterparty_name="Carrefour Market",
            ),
        ]
        service = BankingSyncService(db_session, provider=MockBankProvider(custom_transactions=custom_bank_txs))
        summary = await service.sync_connection(test_user_household_id, conn.id)

        assert summary.matched == 1  # Fibre (montant exact)
        assert summary.imported == 2  # Salaire (montant différent) + Carrefour (nouveau)

        await db_session.refresh(planned_exact)
        await db_session.refresh(planned_salary)
        assert planned_exact.state == TransactionState.REALIZED
        assert planned_exact.transaction_date == today
        assert planned_exact.external_transaction_id == "eb_fibre_1"
        assert planned_exact.import_source == "open_banking"

        # Salaire prévu est resté PROJECTED car 2250 != 2200
        assert planned_salary.state == TransactionState.PROJECTED
        assert planned_salary.external_transaction_id is None

        # Auto-catégorisation de Carrefour
        carrefour_res = await db_session.execute(
            select(Transaction).where(Transaction.external_transaction_id == "eb_carrefour_1")
        )
        carrefour_tx = carrefour_res.scalar_one()
        assert carrefour_tx.category_id == cat_courses.id

    async def test_manual_merge_imported_into_planned_and_unlink(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str,
    ):
        """
        Scénario utilisateur : salaire arrivé 1 jour avant avec un montant différent ->
        une transaction bancaire a été créée. L'utilisateur la fusionne dans sa transaction
        prévue : le montant et la date de la banque priment, la transaction passe REALIZED,
        le doublon est supprimé, et on peut ensuite délier si besoin.
        """
        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = date.today()

        account = Account(
            household_id=test_user_household_id,
            name="SG Merge",
            type=AccountType.CHECKING,
            initial_balance=Decimal("1000.00"),
        )
        db_session.add(account)
        await db_session.flush()

        planned_salary = Transaction(
            household_id=test_user_household_id,
            account_id=account.id,
            description="Salaire CDI",
            amount=Decimal("2200.00"),
            transaction_date=today + timedelta(days=1),
            type=TransactionType.INCOME,
            state=TransactionState.PROJECTED,
        )
        imported_salary = Transaction(
            household_id=test_user_household_id,
            account_id=account.id,
            description="VIR EMPLOYEUR",
            amount=Decimal("2245.50"),
            transaction_date=today,
            type=TransactionType.INCOME,
            state=TransactionState.REALIZED,
            external_transaction_id="eb_sal_nov",
            import_source="open_banking",
        )
        db_session.add_all([planned_salary, imported_salary])
        await db_session.commit()
        await db_session.refresh(planned_salary)
        await db_session.refresh(imported_salary)

        merge_res = await client.post(
            f"/api/v1/banking/transactions/{imported_salary.id}/merge",
            json={"target_transaction_id": planned_salary.id},
            headers=headers,
        )
        assert merge_res.status_code == 200
        merged = merge_res.json()
        assert merged["merged_transaction_id"] == planned_salary.id
        assert float(merged["amount"]) == pytest.approx(2245.50)
        assert merged["transaction_date"] == today.isoformat()
        assert merged["state"] == "REALIZED"
        assert merged["external_transaction_id"] == "eb_sal_nov"
        assert merged["import_source"] == "open_banking"

        # Le doublon importé a disparu
        dup_check = await client.get(f"/api/v1/transactions/{imported_salary.id}", headers=headers)
        assert dup_check.status_code == 404

        # Délier ensuite si l'utilisateur veut repasser en manuel
        unlink_res = await client.post(
            f"/api/v1/banking/transactions/{planned_salary.id}/unlink",
            headers=headers,
        )
        assert unlink_res.status_code == 200
        unlinked = unlink_res.json()
        assert unlinked["import_source"] == "manual"
        assert unlinked["external_transaction_id"] is None
