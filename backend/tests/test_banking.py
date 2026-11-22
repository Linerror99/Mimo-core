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

    async def test_merge_bank_expense_into_existing_transfer_preserves_transfer(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str,
    ):
        """
        Fusion d'un débit bancaire (-95 € EXPENSE) dans un virement interne manuel déjà REALIZED
        (SG -> BNP) : conserve type=TRANSFER et destination_account_id, met à jour la date et
        rattache external_transaction_id sans doublon.
        """
        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = date.today()

        sg = Account(
            household_id=test_user_household_id,
            name="SG",
            type=AccountType.CHECKING,
            initial_balance=Decimal("500.00"),
        )
        bnp = Account(
            household_id=test_user_household_id,
            name="BNP",
            type=AccountType.CHECKING,
            initial_balance=Decimal("200.00"),
        )
        db_session.add_all([sg, bnp])
        await db_session.flush()

        manual_transfer = Transaction(
            household_id=test_user_household_id,
            account_id=sg.id,
            destination_account_id=bnp.id,
            description="Virement SG -BNP",
            amount=Decimal("-95.00"),
            transaction_date=today - timedelta(days=1),
            type=TransactionType.TRANSFER,
            state=TransactionState.REALIZED,
        )
        imported_debit = Transaction(
            household_id=test_user_household_id,
            account_id=sg.id,
            description="000001 VIR INSTANTANE EMIS LOGITEL",
            amount=Decimal("-95.00"),
            transaction_date=today,
            type=TransactionType.EXPENSE,
            state=TransactionState.REALIZED,
            external_transaction_id="eb_vir_bnp_95",
            import_source="open_banking",
        )
        db_session.add_all([manual_transfer, imported_debit])
        await db_session.commit()
        await db_session.refresh(manual_transfer)
        await db_session.refresh(imported_debit)

        merge_res = await client.post(
            f"/api/v1/banking/transactions/{imported_debit.id}/merge",
            json={"target_transaction_id": manual_transfer.id},
            headers=headers,
        )
        assert merge_res.status_code == 200
        merged = merge_res.json()
        assert merged["merged_transaction_id"] == manual_transfer.id
        assert float(merged["amount"]) == pytest.approx(-95.00)
        assert merged["external_transaction_id"] == "eb_vir_bnp_95"

        await db_session.refresh(manual_transfer)
        assert manual_transfer.type == TransactionType.TRANSFER
        assert manual_transfer.account_id == sg.id
        assert manual_transfer.destination_account_id == bnp.id
        assert manual_transfer.transaction_date == today

    async def test_auto_match_projected_transfer_and_unlink_single_account(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str,
        test_user,
    ):
        """
        Vérifie :
        1. L'auto-matching exact d'un débit bancaire sur un virement interne PROJECTED (TRANSFER)
        2. La déliaison unitaire d'un compte synchronisé via POST /api/v1/banking/accounts/{id}/unlink
        """
        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = date.today()

        conn = BankConnection(
            household_id=test_user_household_id,
            user_id=test_user.id,
            provider="mock",
            institution_name="Société Générale",
            institution_country="FR",
            session_id="sess_transfer_match",
            state_token="state_transfer_match_123",
            status="ACTIVE",
            consent_expires_at=datetime.utcnow() + timedelta(days=60),
        )
        db_session.add(conn)
        await db_session.flush()

        sg = Account(
            household_id=test_user_household_id,
            name="SG Transfer Match",
            type=AccountType.CHECKING,
            initial_balance=Decimal("1000.00"),
            bank_connection_id=conn.id,
            external_account_id="ext_sg_tr_1",
            sync_enabled=True,
            sync_from_date=today - timedelta(days=5),
        )
        livret = Account(
            household_id=test_user_household_id,
            name="Livret A",
            type=AccountType.SAVINGS,
            initial_balance=Decimal("500.00"),
        )
        db_session.add_all([sg, livret])
        await db_session.flush()

        planned_transfer = Transaction(
            household_id=test_user_household_id,
            account_id=sg.id,
            destination_account_id=livret.id,
            description="Épargne mensuelle",
            amount=Decimal("-150.00"),
            transaction_date=today + timedelta(days=1),
            type=TransactionType.TRANSFER,
            state=TransactionState.PROJECTED,
        )
        db_session.add(planned_transfer)
        await db_session.commit()

        custom_bank_txs = [
            ExternalTransaction(
                external_transaction_id="eb_tr_epargne_150",
                booking_date=today,
                amount=Decimal("-150.00"),
                description="VIR VERS LIVRET A",
            )
        ]
        service = BankingSyncService(
            db_session,
            provider=MockBankProvider(custom_transactions=custom_bank_txs),
        )
        summary = await service.sync_connection(test_user_household_id, conn.id)
        assert summary.matched == 1
        assert summary.imported == 0

        await db_session.refresh(planned_transfer)
        assert planned_transfer.state == TransactionState.REALIZED
        assert planned_transfer.type == TransactionType.TRANSFER
        assert planned_transfer.destination_account_id == livret.id
        assert planned_transfer.external_transaction_id == "eb_tr_epargne_150"

        # Délier uniquement le compte SG (la connexion bancaire reste intacte)
        unlink_acc_res = await client.post(
            f"/api/v1/banking/accounts/{sg.id}/unlink",
            headers=headers,
        )
        assert unlink_acc_res.status_code == 204

        await db_session.refresh(sg)
        assert sg.sync_enabled is False
        assert sg.bank_connection_id is None
        assert sg.external_account_id is None

    async def test_two_legged_interbank_transfer_merge_and_zero_duplicates(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str,
        test_user,
    ):
        """
        Scénario SG -> BNP avec les 2 banques connectées :
        1. Un virement manuel SG -> BNP (95€) existe.
        2. On fusionne le débit SG (-95€ le 19) -> remplit external_transaction_id (1/2).
        3. On fusionne le crédit BNP (+95€ le 20) dans le MÊME virement -> remplit
           destination_external_transaction_id (2/2) sans écraser la date source (19).
        4. Une re-synchro SG + BNP skippe les 2 écritures (0 doublon à vie).
        """
        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = date.today()
        yesterday = today - timedelta(days=1)

        conn_sg = BankConnection(
            household_id=test_user_household_id,
            user_id=test_user.id,
            provider="mock",
            institution_name="Société Générale",
            institution_country="FR",
            session_id="sess_2leg_sg",
            state_token="state_2leg_sg",
            status="ACTIVE",
            consent_expires_at=datetime.utcnow() + timedelta(days=60),
        )
        conn_bnp = BankConnection(
            household_id=test_user_household_id,
            user_id=test_user.id,
            provider="mock",
            institution_name="BNP Paribas",
            institution_country="FR",
            session_id="sess_2leg_bnp",
            state_token="state_2leg_bnp",
            status="ACTIVE",
            consent_expires_at=datetime.utcnow() + timedelta(days=60),
        )
        db_session.add_all([conn_sg, conn_bnp])
        await db_session.flush()

        sg = Account(
            household_id=test_user_household_id,
            name="SG 2-Leg",
            type=AccountType.CHECKING,
            initial_balance=Decimal("500.00"),
            bank_connection_id=conn_sg.id,
            external_account_id="ext_2leg_sg",
            sync_enabled=True,
            sync_from_date=today - timedelta(days=5),
        )
        bnp = Account(
            household_id=test_user_household_id,
            name="BNP 2-Leg",
            type=AccountType.CHECKING,
            initial_balance=Decimal("200.00"),
            bank_connection_id=conn_bnp.id,
            external_account_id="ext_2leg_bnp",
            sync_enabled=True,
            sync_from_date=today - timedelta(days=5),
        )
        db_session.add_all([sg, bnp])
        await db_session.flush()

        manual_transfer = Transaction(
            household_id=test_user_household_id,
            account_id=sg.id,
            destination_account_id=bnp.id,
            description="Virement SG -> BNP",
            amount=Decimal("-95.00"),
            transaction_date=yesterday,
            type=TransactionType.TRANSFER,
            state=TransactionState.REALIZED,
        )
        sg_debit = Transaction(
            household_id=test_user_household_id,
            account_id=sg.id,
            description="VIR EMIS VERS BNP",
            amount=Decimal("-95.00"),
            transaction_date=yesterday,
            type=TransactionType.EXPENSE,
            state=TransactionState.REALIZED,
            external_transaction_id="sg_tx_95",
            import_source="open_banking",
        )
        bnp_credit = Transaction(
            household_id=test_user_household_id,
            account_id=bnp.id,
            description="VIR RECU DE SG",
            amount=Decimal("95.00"),
            transaction_date=today,
            type=TransactionType.INCOME,
            state=TransactionState.REALIZED,
            external_transaction_id="bnp_tx_95",
            import_source="open_banking",
        )
        db_session.add_all([manual_transfer, sg_debit, bnp_credit])
        await db_session.commit()

        # Fusion jambe 1 (SG source)
        m1 = await client.post(
            f"/api/v1/banking/transactions/{sg_debit.id}/merge",
            json={"target_transaction_id": manual_transfer.id},
            headers=headers,
        )
        assert m1.status_code == 200
        assert m1.json()["external_transaction_id"] == "sg_tx_95"
        assert m1.json()["destination_external_transaction_id"] is None

        # Fusion jambe 2 (BNP destination) sur le MÊME virement
        m2 = await client.post(
            f"/api/v1/banking/transactions/{bnp_credit.id}/merge",
            json={"target_transaction_id": manual_transfer.id},
            headers=headers,
        )
        assert m2.status_code == 200
        m2_data = m2.json()
        assert m2_data["external_transaction_id"] == "sg_tx_95"
        assert m2_data["destination_external_transaction_id"] == "bnp_tx_95"
        # La date source (yesterday) est conservée malgré le crédit BNP à today
        assert m2_data["transaction_date"] == yesterday.isoformat()

        # Re-synchro SG et BNP -> 0 doublon des deux côtés
        sg_service = BankingSyncService(
            db_session,
            provider=MockBankProvider(
                custom_transactions=[
                    ExternalTransaction(
                        external_transaction_id="sg_tx_95",
                        booking_date=yesterday,
                        amount=Decimal("-95.00"),
                        description="VIR EMIS VERS BNP",
                    )
                ]
            ),
        )
        sg_res = await sg_service.sync_connection(test_user_household_id, conn_sg.id)
        assert sg_res.imported == 0
        assert sg_res.skipped == 1

        bnp_service = BankingSyncService(
            db_session,
            provider=MockBankProvider(
                custom_transactions=[
                    ExternalTransaction(
                        external_transaction_id="bnp_tx_95",
                        booking_date=today,
                        amount=Decimal("95.00"),
                        description="VIR RECU DE SG",
                    )
                ]
            ),
        )
        bnp_res = await bnp_service.sync_connection(test_user_household_id, conn_bnp.id)
        assert bnp_res.imported == 0
        assert bnp_res.skipped == 1

    async def test_merge_two_opposite_bank_txs_converts_to_transfer_and_auto_interbank_sync(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session: AsyncSession,
        test_user_household_id: str,
        test_user,
    ):
        """
        Vérifie :
        1. Fusion manuelle d'un débit bancaire SG (-80€) avec un crédit bancaire BNP (+80€)
           -> convertit en 1 seul TRANSFER SG -> BNP avec les 2 external IDs.
        2. Auto-conversion lors de la synchro BNP (+120€) quand le débit SG (-120€) existe déjà à ±3j.
        """
        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = date.today()

        conn_bnp = BankConnection(
            household_id=test_user_household_id,
            user_id=test_user.id,
            provider="mock",
            institution_name="BNP Paribas",
            institution_country="FR",
            session_id="sess_auto_bnp",
            state_token="state_auto_bnp",
            status="ACTIVE",
            consent_expires_at=datetime.utcnow() + timedelta(days=60),
        )
        db_session.add(conn_bnp)
        await db_session.flush()

        sg = Account(
            household_id=test_user_household_id,
            name="SG Auto",
            type=AccountType.CHECKING,
            initial_balance=Decimal("500.00"),
        )
        bnp = Account(
            household_id=test_user_household_id,
            name="BNP Auto",
            type=AccountType.CHECKING,
            initial_balance=Decimal("200.00"),
            bank_connection_id=conn_bnp.id,
            external_account_id="ext_auto_bnp",
            sync_enabled=True,
            sync_from_date=today - timedelta(days=5),
        )
        db_session.add_all([sg, bnp])
        await db_session.flush()

        # Cas 1 : Fusion manuelle de 2 opérations bancaires opposées -> 1 TRANSFER 2/2
        sg_80 = Transaction(
            household_id=test_user_household_id,
            account_id=sg.id,
            description="VIR SG -> BNP 80",
            amount=Decimal("-80.00"),
            transaction_date=today - timedelta(days=1),
            type=TransactionType.EXPENSE,
            state=TransactionState.REALIZED,
            external_transaction_id="sg_80_id",
            import_source="open_banking",
        )
        bnp_80 = Transaction(
            household_id=test_user_household_id,
            account_id=bnp.id,
            description="VIR RECU SG 80",
            amount=Decimal("80.00"),
            transaction_date=today,
            type=TransactionType.INCOME,
            state=TransactionState.REALIZED,
            external_transaction_id="bnp_80_id",
            import_source="open_banking",
        )
        # Cas 2 : Débit SG -120€ déjà présent avant la synchro BNP (+120€)
        sg_120 = Transaction(
            household_id=test_user_household_id,
            account_id=sg.id,
            description="VIR SG -> BNP 120",
            amount=Decimal("-120.00"),
            transaction_date=today - timedelta(days=1),
            type=TransactionType.EXPENSE,
            state=TransactionState.REALIZED,
            external_transaction_id="sg_120_id",
            import_source="open_banking",
        )
        db_session.add_all([sg_80, bnp_80, sg_120])
        await db_session.commit()

        merge_res = await client.post(
            f"/api/v1/banking/transactions/{bnp_80.id}/merge",
            json={"target_transaction_id": sg_80.id},
            headers=headers,
        )
        assert merge_res.status_code == 200
        merged = merge_res.json()
        assert merged["type"] == "TRANSFER"
        assert merged["external_transaction_id"] == "sg_80_id"
        assert merged["destination_external_transaction_id"] == "bnp_80_id"

        await db_session.refresh(sg_80)
        assert sg_80.account_id == sg.id
        assert sg_80.destination_account_id == bnp.id

        # Auto-détection lors de la synchro BNP (+120€)
        bnp_service = BankingSyncService(
            db_session,
            provider=MockBankProvider(
                custom_transactions=[
                    ExternalTransaction(
                        external_transaction_id="bnp_120_id",
                        booking_date=today,
                        amount=Decimal("120.00"),
                        description="VIR RECU DE SG 120",
                    )
                ]
            ),
        )
        summary = await bnp_service.sync_connection(test_user_household_id, conn_bnp.id)
        assert summary.matched == 1
        assert summary.imported == 0

        await db_session.refresh(sg_120)
        assert sg_120.type == TransactionType.TRANSFER
        assert sg_120.account_id == sg.id
        assert sg_120.destination_account_id == bnp.id
        assert sg_120.external_transaction_id == "sg_120_id"
        assert sg_120.destination_external_transaction_id == "bnp_120_id"
