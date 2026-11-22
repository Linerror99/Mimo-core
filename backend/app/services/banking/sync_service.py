"""
Open Banking Sync & Reconciliation Service

Handles:
1. OAuth/DSP2 connect flow & callback session persistence
2. Mapping external bank accounts to existing or new Mimo accounts
3. Transaction sync with:
   - Strict deduplication by (account_id, external_transaction_id)
   - EXACT-amount auto-matching (zero tolerance!) against PENDING/PROJECTED Mimo transactions
     within a ±3 day window -> auto-validates to REALIZED + syncs linked ProjectItem / Goal
   - Creation of new REALIZED transactions with history-based auto-categorization
4. Manual reconciliation (`merge_imported_transaction`):
   - Links a bank-imported transaction to an already-planned Mimo transaction (e.g. Salary
     arriving early or with a slightly different amount), updates the planned transaction to
     bank's exact amount & date in REALIZED state, preserves recurring/project/goal links,
     and deletes the duplicate imported row so next sync never re-imports it.
5. Manual unlink (`unlink_bank_transaction`):
   - Detaches a transaction from Open Banking (`import_source = "manual"`, clears external ID).
6. Consent expiry alert notifications (<= 7 days).
"""
import json
import logging
import secrets
import uuid as uuid_lib
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.crypto import decrypt_secret, encrypt_secret, is_encrypted
from app.models.account import Account, AccountType
from app.models.bank_connection import BankConnection, BankConnectionStatus
from app.models.household import Household
from app.models.notification import Notification, NotificationType
from app.models.transaction import RecurrenceFrequency, Transaction, TransactionState, TransactionType
from app.schemas.account import AccountCreate
from app.schemas.banking import (
    AccountLinkMapping,
    BankCallbackResponse,
    BankConnectRequest,
    BankConnectResponse,
    BankConnectionAccountSummary,
    BankConnectionResponse,
    DiscoveredAccountSchema,
    MergeTransactionResponse,
    SyncSummaryResponse,
    UnlinkTransactionResponse,
)
from app.services.account_service import AccountService
from app.services.banking import BankProvider, get_bank_provider
from app.services.banking.base import ExternalTransaction
from app.services.transaction_service import TransactionService

logger = logging.getLogger(__name__)

AUTO_MATCH_DATE_WINDOW_DAYS = 3
CONSENT_WARNING_DAYS = 7


class BankingSyncService:
    """Orchestrates Open Banking connections, sync, exact auto-matching, and manual merge."""

    def __init__(self, db: AsyncSession, provider: Optional[BankProvider] = None):
        self.db = db
        self.provider = provider or get_bank_provider()

    async def list_institutions(self, country: str = "FR", search: Optional[str] = None):
        institutions = await self.provider.list_institutions(country=country)
        if search and search.strip():
            q = search.strip().lower()
            institutions = [i for i in institutions if q in i.name.lower()]
        return institutions

    async def start_connection(
        self,
        household_id: str,
        user_id: str,
        payload: BankConnectRequest,
    ) -> BankConnectResponse:
        state_token = secrets.token_urlsafe(32)
        redirect_url = payload.redirect_url or settings.BANKING_REDIRECT_URL

        auth_res = await self.provider.start_auth(
            institution_name=payload.institution_name,
            country=payload.institution_country,
            redirect_url=redirect_url,
            state=state_token,
            valid_days=90,
        )

        conn = BankConnection(
            household_id=household_id,
            user_id=user_id,
            provider=self.provider.provider_name,
            institution_name=payload.institution_name,
            institution_country=payload.institution_country.upper(),
            institution_logo=payload.institution_logo,
            state_token=state_token,
            status=BankConnectionStatus.PENDING.value,
        )
        self.db.add(conn)
        await self.db.commit()
        await self.db.refresh(conn)

        return BankConnectResponse(
            connection_id=conn.id,
            auth_url=auth_res.auth_url,
            state=state_token,
            provider=conn.provider,
        )

    async def complete_callback(
        self,
        household_id: str,
        code: str,
        state: str,
    ) -> BankCallbackResponse:
        res = await self.db.execute(
            select(BankConnection).where(
                BankConnection.state_token == state,
                BankConnection.household_id == household_id,
            )
        )
        conn = res.scalar_one_or_none()
        if not conn:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session de connexion bancaire introuvable ou expirée.",
            )

        # Idempotence : si le code OAuth a déjà été échangé (ex. double appel React StrictMode / refresh),
        # renvoyer directement les comptes découverts déjà enregistrés.
        if conn.status == BankConnectionStatus.ACTIVE.value and conn.session_id:
            cached: List[DiscoveredAccountSchema] = []
            if conn.discovered_accounts_json:
                try:
                    cached = [
                        DiscoveredAccountSchema(**item)
                        for item in json.loads(conn.discovered_accounts_json)
                    ]
                except Exception:
                    cached = []
            return BankCallbackResponse(
                connection_id=conn.id,
                institution_name=conn.institution_name,
                status=conn.status,
                consent_expires_at=conn.consent_expires_at,
                discovered_accounts=cached,
            )

        provider = self.provider
        try:
            session_res = await provider.exchange_code(code)
        except Exception as exc:
            conn.status = BankConnectionStatus.ERROR.value
            conn.last_error = str(exc)[:500]
            await self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Échec d'authentification bancaire : {exc}",
            )

        discovered = [
            DiscoveredAccountSchema(
                external_account_id=acc.external_account_id,
                name=acc.name,
                iban_masked=acc.iban_masked,
                currency=acc.currency,
                balance=acc.balance,
                account_type=acc.account_type,
            )
            for acc in session_res.accounts
        ]

        conn.session_id = encrypt_secret(session_res.session_id)
        conn.consent_expires_at = session_res.consent_expires_at
        conn.status = BankConnectionStatus.ACTIVE.value
        conn.last_error = None
        conn.discovered_accounts_json = json.dumps(
            [d.model_dump(mode="json") for d in discovered]
        )
        await self.db.commit()
        await self.db.refresh(conn)

        return BankCallbackResponse(
            connection_id=conn.id,
            institution_name=conn.institution_name,
            status=conn.status,
            consent_expires_at=conn.consent_expires_at,
            discovered_accounts=discovered,
        )

    async def link_accounts(
        self,
        household_id: str,
        user_id: str,
        connection_id: str,
        mappings: List[AccountLinkMapping],
        run_initial_sync: bool = True,
    ) -> SyncSummaryResponse:
        res = await self.db.execute(
            select(BankConnection).where(
                BankConnection.id == connection_id,
                BankConnection.household_id == household_id,
            )
        )
        conn = res.scalar_one_or_none()
        if not conn:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connexion bancaire introuvable.",
            )

        for m in mappings:
            if m.mimo_account_id:
                account = await AccountService.get_account_by_id(
                    self.db, m.mimo_account_id, household_id
                )
                if not account:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Compte Mimo {m.mimo_account_id} introuvable.",
                    )
                account.bank_connection_id = conn.id
                account.external_account_id = m.external_account_id
                if m.iban_masked:
                    account.iban_masked = m.iban_masked
                account.sync_enabled = m.sync_enabled
                account.sync_from_date = m.sync_from_date or date.today()
            else:
                acc_type_str = (m.new_account_type or "CHECKING").upper()
                try:
                    acc_type = AccountType(acc_type_str)
                except ValueError:
                    acc_type = AccountType.CHECKING
                account = await AccountService.create_account(
                    db=self.db,
                    household_id=household_id,
                    account_data=AccountCreate(
                        name=(m.new_account_name or conn.institution_name)[:100],
                        type=acc_type,
                        initial_balance=m.initial_balance or Decimal("0"),
                        currency=(m.currency or "EUR")[:3],
                    ),
                    owner_user_id=user_id,
                )
                account.bank_connection_id = conn.id
                account.external_account_id = m.external_account_id
                account.iban_masked = m.iban_masked
                account.sync_enabled = m.sync_enabled
                account.sync_from_date = m.sync_from_date or date.today()

        await self.db.commit()

        if run_initial_sync:
            return await self.sync_connection(household_id, conn.id)
        return SyncSummaryResponse(connections_synced=0, accounts_synced=len(mappings))

    async def list_connections(self, household_id: str) -> List[BankConnectionResponse]:
        res = await self.db.execute(
            select(BankConnection)
            .where(BankConnection.household_id == household_id)
            .order_by(BankConnection.created_at.desc())
        )
        connections = list(res.scalars().all())
        if not connections:
            return []

        conn_ids = [c.id for c in connections]
        acc_res = await self.db.execute(
            select(Account).where(Account.bank_connection_id.in_(conn_ids))
        )
        accounts_by_conn: dict[str, List[BankConnectionAccountSummary]] = {}
        for acc in acc_res.scalars().all():
            if not acc.bank_connection_id:
                continue
            accounts_by_conn.setdefault(acc.bank_connection_id, []).append(
                BankConnectionAccountSummary(
                    id=acc.id,
                    name=acc.name,
                    iban_masked=acc.iban_masked,
                    sync_enabled=bool(acc.sync_enabled),
                    sync_from_date=acc.sync_from_date,
                )
            )

        now = datetime.utcnow()
        output: List[BankConnectionResponse] = []
        for conn in connections:
            days_left: Optional[int] = None
            if conn.consent_expires_at:
                days_left = (conn.consent_expires_at - now).days
                if days_left < 0 and conn.status == BankConnectionStatus.ACTIVE.value:
                    conn.status = BankConnectionStatus.EXPIRED.value

            discovered: List[DiscoveredAccountSchema] = []
            if conn.discovered_accounts_json:
                try:
                    raw_list = json.loads(conn.discovered_accounts_json)
                    discovered = [DiscoveredAccountSchema(**item) for item in raw_list]
                except Exception:
                    discovered = []

            output.append(
                BankConnectionResponse(
                    id=conn.id,
                    provider=conn.provider,
                    institution_name=conn.institution_name,
                    institution_country=conn.institution_country,
                    institution_logo=conn.institution_logo,
                    status=conn.status,
                    consent_expires_at=conn.consent_expires_at,
                    last_synced_at=conn.last_synced_at,
                    last_error=conn.last_error,
                    days_until_expiry=days_left,
                    linked_accounts=accounts_by_conn.get(conn.id, []),
                    discovered_accounts=discovered,
                    created_at=conn.created_at,
                )
            )

        return output

    async def revoke_connection(self, household_id: str, connection_id: str) -> None:
        res = await self.db.execute(
            select(BankConnection).where(
                BankConnection.id == connection_id,
                BankConnection.household_id == household_id,
            )
        )
        conn = res.scalar_one_or_none()
        if not conn:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connexion bancaire introuvable.",
            )

        acc_res = await self.db.execute(
            select(Account).where(Account.bank_connection_id == conn.id)
        )
        for acc in acc_res.scalars().all():
            acc.bank_connection_id = None
            acc.external_account_id = None
            acc.sync_enabled = False

        await self.db.delete(conn)
        await self.db.commit()

    async def unlink_account(self, household_id: str, account_id: str) -> None:
        """Détache un compte Mimo individuel de sa synchronisation bancaire."""
        account = await AccountService.get_account_by_id(
            self.db, account_id, household_id
        )
        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Compte introuvable.",
            )
        conn_id = account.bank_connection_id
        account.bank_connection_id = None
        account.external_account_id = None
        account.sync_enabled = False
        if conn_id:
            conn = await self.db.get(BankConnection, conn_id)
            if conn:
                conn.last_error = None
        await self.db.commit()

    async def sync_connection(
        self,
        household_id: str,
        connection_id: str,
    ) -> SyncSummaryResponse:
        res = await self.db.execute(
            select(BankConnection).where(
                BankConnection.id == connection_id,
                BankConnection.household_id == household_id,
            )
        )
        conn = res.scalar_one_or_none()
        if not conn:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connexion bancaire introuvable.",
            )
        return await self._sync_single_connection(conn)

    async def sync_household(self, household_id: str) -> SyncSummaryResponse:
        res = await self.db.execute(
            select(BankConnection).where(
                BankConnection.household_id == household_id,
                BankConnection.status == BankConnectionStatus.ACTIVE.value,
            )
        )
        connections = list(res.scalars().all())
        return await self._sync_connections_batch(connections)

    async def sync_all_active_connections(self) -> SyncSummaryResponse:
        res = await self.db.execute(
            select(BankConnection).where(
                BankConnection.status == BankConnectionStatus.ACTIVE.value
            )
        )
        connections = list(res.scalars().all())
        return await self._sync_connections_batch(connections)

    async def _sync_connections_batch(
        self, connections: List[BankConnection]
    ) -> SyncSummaryResponse:
        total = SyncSummaryResponse()
        for conn in connections:
            part = await self._sync_single_connection(conn)
            total.connections_synced += part.connections_synced
            total.accounts_synced += part.accounts_synced
            total.imported += part.imported
            total.matched += part.matched
            total.skipped += part.skipped
            total.errors.extend(part.errors)
        return total

    async def _sync_single_connection(
        self, conn: BankConnection
    ) -> SyncSummaryResponse:
        summary = SyncSummaryResponse()
        if not conn.session_id:
            summary.errors.append(f"{conn.institution_name}: session non initialisée.")
            return summary

        plain_session_id = decrypt_secret(conn.session_id)
        if not is_encrypted(conn.session_id):
            # Migration silencieuse au repos : chiffre les anciens session_id en clair
            conn.session_id = encrypt_secret(plain_session_id)

        # Check consent expiration
        now = datetime.utcnow()
        if conn.consent_expires_at:
            days_left = (conn.consent_expires_at - now).days
            if days_left < 0:
                conn.status = BankConnectionStatus.EXPIRED.value
                conn.last_error = "Consentement bancaire expiré. Veuillez reconnecter votre banque."
                await self.db.commit()
                summary.errors.append(conn.last_error)
                return summary
            if days_left <= CONSENT_WARNING_DAYS:
                await self._notify_consent_expiring(conn, days_left)

        acc_res = await self.db.execute(
            select(Account).where(
                Account.bank_connection_id == conn.id,
                Account.sync_enabled.is_(True),
                Account.external_account_id.is_not(None),
            )
        )
        linked_accounts = list(acc_res.scalars().all())
        if not linked_accounts:
            return summary

        tx_service = TransactionService(self.db)
        category_hints = await self._load_category_hints(conn.household_id)

        for account in linked_accounts:
            # Si le compte a un identifiant non-UUID (ex. carte masquée ************1145) sur Enable Banking,
            # on le désactive proprement pour ne pas bloquer la synchro des autres comptes.
            if self.provider.provider_name == "enable_banking":
                try:
                    uuid_lib.UUID(str(account.external_account_id))
                except ValueError:
                    logger.warning(
                        "Disabling sync on account %s (%s): non-UUID external_account_id=%s",
                        account.id,
                        account.name,
                        account.external_account_id,
                    )
                    account.sync_enabled = False
                    account.external_account_id = None
                    account.bank_connection_id = None
                    continue

            try:
                external_txs = await self.provider.fetch_transactions(
                    session_id=plain_session_id,
                    external_account_id=account.external_account_id,
                    date_from=account.sync_from_date,
                )
            except Exception as exc:
                err_msg = f"{account.name}: {exc}"
                logger.warning("Bank sync error for %s: %s", account.id, exc)
                conn.last_error = err_msg[:500]
                summary.errors.append(err_msg)
                continue

            summary.accounts_synced += 1
            for ext_tx in external_txs:
                if account.sync_from_date and ext_tx.booking_date < account.sync_from_date:
                    summary.skipped += 1
                    continue
                outcome = await self._ingest_external_transaction(
                    account=account,
                    ext_tx=ext_tx,
                    tx_service=tx_service,
                    category_hints=category_hints,
                )
                if outcome == "skipped":
                    summary.skipped += 1
                elif outcome == "matched":
                    summary.matched += 1
                elif outcome == "imported":
                    summary.imported += 1

        conn.last_synced_at = datetime.utcnow()
        if not summary.errors:
            conn.last_error = None
        summary.connections_synced = 1
        await self.db.commit()
        return summary

    async def _ingest_external_transaction(
        self,
        account: Account,
        ext_tx: ExternalTransaction,
        tx_service: TransactionService,
        category_hints: dict[str, str],
    ) -> str:
        # 1. Strict deduplication by (account_id or destination_account_id, external_transaction_id)
        dup_res = await self.db.execute(
            select(Transaction.id).where(
                or_(
                    Transaction.account_id == account.id,
                    Transaction.destination_account_id == account.id,
                ),
                Transaction.external_transaction_id == ext_tx.external_transaction_id,
                Transaction.deleted_at.is_(None),
            )
        )
        if dup_res.scalar_one_or_none() is not None:
            return "skipped"

        tx_type = (
            TransactionType.INCOME if ext_tx.amount > 0 else TransactionType.EXPENSE
        )
        normalized_amount = TransactionService._normalize_amount_sign(
            tx_type, ext_tx.amount
        )

        # 2. Auto-matching EXACT au centime près (zero tolerance!) sur PENDING/PROJECTED (±3 jours)
        # Inclut les virements internes (TRANSFER sortant pour un débit, entrant pour un crédit)
        window_start = ext_tx.booking_date - timedelta(days=AUTO_MATCH_DATE_WINDOW_DAYS)
        window_end = ext_tx.booking_date + timedelta(days=AUTO_MATCH_DATE_WINDOW_DAYS)

        if tx_type == TransactionType.EXPENSE:
            account_and_type_filter = and_(
                Transaction.account_id == account.id,
                Transaction.type.in_([TransactionType.EXPENSE, TransactionType.TRANSFER]),
            )
        else:
            account_and_type_filter = or_(
                and_(
                    Transaction.account_id == account.id,
                    Transaction.type == TransactionType.INCOME,
                ),
                and_(
                    Transaction.destination_account_id == account.id,
                    Transaction.type == TransactionType.TRANSFER,
                ),
            )

        cand_res = await self.db.execute(
            select(Transaction).where(
                Transaction.household_id == account.household_id,
                account_and_type_filter,
                Transaction.deleted_at.is_(None),
                Transaction.external_transaction_id.is_(None),
                Transaction.state.in_([TransactionState.PENDING, TransactionState.PROJECTED]),
                Transaction.transaction_date >= window_start,
                Transaction.transaction_date <= window_end,
            )
        )
        candidates = list(cand_res.scalars().all())
        exact_matches = [
            c for c in candidates if abs(Decimal(str(c.amount))) == abs(normalized_amount)
        ]

        if exact_matches:
            # Pick the candidate closest in date to the bank booking_date
            exact_matches.sort(
                key=lambda c: abs((c.transaction_date - ext_tx.booking_date).days)
            )
            matched = exact_matches[0]
            matched.state = TransactionState.REALIZED
            matched.amount = TransactionService._normalize_amount_sign(
                matched.type, ext_tx.amount
            )
            matched.transaction_date = ext_tx.booking_date
            matched.external_transaction_id = ext_tx.external_transaction_id
            matched.import_source = "open_banking"
            await self.db.flush()
            await tx_service._sync_linked_project_item(matched)
            if matched.goal_id:
                await tx_service._sync_linked_goal_amount(matched.goal_id)
            return "matched"

        # 3. No exact match -> create a new REALIZED transaction with history-based category guess
        guessed_cat_id = self._guess_category_id(ext_tx, category_hints)
        new_tx = Transaction(
            household_id=account.household_id,
            account_id=account.id,
            category_id=guessed_cat_id,
            description=ext_tx.description[:255],
            amount=normalized_amount,
            transaction_date=ext_tx.booking_date,
            type=tx_type,
            state=TransactionState.REALIZED,
            recurrence_frequency=RecurrenceFrequency.NONE,
            external_transaction_id=ext_tx.external_transaction_id,
            import_source="open_banking",
        )
        self.db.add(new_tx)
        await self.db.flush()
        return "imported"

    async def merge_imported_transaction(
        self,
        household_id: str,
        imported_tx_id: str,
        target_tx_id: str,
    ) -> MergeTransactionResponse:
        """
        Fusionne une opération bancaire importée (`imported_tx_id`) dans une opération Mimo
        déjà prévue/existante (`target_tx_id`) :
        - Transfère `external_transaction_id` & `import_source="open_banking"` vers `target`
        - Applique le montant exact de la banque et la date exacte de la banque sur `target`
        - Passe `target` en `REALIZED` (tout en conservant ses liens récurrence / projet / objectif)
        - Supprime définitivement le doublon `imported_tx` pour éviter tout doublon futur
        """
        if imported_tx_id == target_tx_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossible de fusionner une transaction avec elle-même.",
            )

        tx_service = TransactionService(self.db)
        imported_tx = await tx_service.get_transaction(imported_tx_id, household_id)
        target_tx = await tx_service.get_transaction(target_tx_id, household_id)

        if not imported_tx or not target_tx:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction introuvable.",
            )

        if imported_tx.import_source != "open_banking" and not imported_tx.external_transaction_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La transaction source n'est pas issue d'une synchronisation bancaire.",
            )

        if target_tx.external_transaction_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La transaction cible est déjà liée à une opération bancaire.",
            )

        ext_id = imported_tx.external_transaction_id
        bank_date = imported_tx.transaction_date
        bank_account_id = imported_tx.account_id
        bank_amount = TransactionService._normalize_amount_sign(
            target_tx.type, Decimal(str(imported_tx.amount))
        )

        # Release unique index on imported_tx first, then delete imported_tx
        imported_tx.external_transaction_id = None
        await self.db.flush()
        await self.db.delete(imported_tx)
        await self.db.flush()

        # Apply bank ground-truth data onto the planned/existing transaction
        # Preserve source/destination accounts when merging into an incoming TRANSFER
        if (
            target_tx.type != TransactionType.TRANSFER
            or target_tx.destination_account_id != bank_account_id
        ):
            target_tx.account_id = bank_account_id
        target_tx.amount = bank_amount
        target_tx.transaction_date = bank_date
        target_tx.state = TransactionState.REALIZED
        target_tx.external_transaction_id = ext_id
        target_tx.import_source = "open_banking"

        await self.db.flush()
        await tx_service._sync_linked_project_item(target_tx)
        if target_tx.goal_id:
            await tx_service._sync_linked_goal_amount(target_tx.goal_id)

        await self.db.commit()
        await self.db.refresh(target_tx)

        return MergeTransactionResponse(
            merged_transaction_id=target_tx.id,
            removed_imported_id=imported_tx_id,
            amount=target_tx.amount,
            transaction_date=target_tx.transaction_date,
            state=target_tx.state.value,
            external_transaction_id=target_tx.external_transaction_id,
            import_source=target_tx.import_source,
        )

    async def unlink_bank_transaction(
        self,
        household_id: str,
        tx_id: str,
    ) -> UnlinkTransactionResponse:
        """Détache une transaction de sa provenance Open Banking."""
        tx_service = TransactionService(self.db)
        tx = await tx_service.get_transaction(tx_id, household_id)
        if not tx:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction introuvable.",
            )

        tx.external_transaction_id = None
        tx.import_source = "manual"
        await self.db.commit()
        await self.db.refresh(tx)

        return UnlinkTransactionResponse(
            transaction_id=tx.id,
            import_source=tx.import_source,
            external_transaction_id=tx.external_transaction_id,
        )

    async def _load_category_hints(self, household_id: str) -> dict[str, str]:
        """Builds a normalized keyword -> category_id map from past categorized transactions."""
        res = await self.db.execute(
            select(Transaction.description, Transaction.category_id)
            .where(
                Transaction.household_id == household_id,
                Transaction.category_id.is_not(None),
                Transaction.deleted_at.is_(None),
            )
            .order_by(Transaction.transaction_date.desc())
            .limit(400)
        )
        hints: dict[str, str] = {}
        for desc, cat_id in res.all():
            if not desc or not cat_id:
                continue
            key = desc.strip().lower()
            if len(key) >= 3 and key not in hints:
                hints[key] = cat_id
        return hints

    @staticmethod
    def _guess_category_id(
        ext_tx: ExternalTransaction, hints: dict[str, str]
    ) -> Optional[str]:
        candidates = [
            (ext_tx.counterparty_name or "").strip().lower(),
            (ext_tx.description or "").strip().lower(),
        ]
        for text in candidates:
            if not text:
                continue
            if text in hints:
                return hints[text]
            for known_desc, cat_id in hints.items():
                if len(known_desc) >= 4 and (known_desc in text or text in known_desc):
                    return cat_id
        return None

    async def _notify_consent_expiring(
        self, conn: BankConnection, days_left: int
    ) -> None:
        """Creates an expiry warning notification once per connection per 24h."""
        cutoff = datetime.utcnow() - timedelta(hours=24)
        existing = await self.db.execute(
            select(Notification.id).where(
                Notification.household_id == conn.household_id,
                Notification.user_id == conn.user_id,
                Notification.title.like(f"%{conn.institution_name}%"),
                Notification.created_at >= cutoff,
            )
        )
        if existing.scalar_one_or_none() is not None:
            return

        notif = Notification(
            user_id=conn.user_id,
            household_id=conn.household_id,
            type=NotificationType.ALERT,
            title=f"Renouvellement bancaire ({conn.institution_name})",
            message=(
                f"Votre consentement DSP2 pour {conn.institution_name} expire dans "
                f"{max(days_left, 0)} jour(s). Reconnectez votre banque depuis Comptes."
            ),
            action_url="/accounts",
        )
        self.db.add(notif)
        await self.db.flush()
