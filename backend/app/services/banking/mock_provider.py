"""
Mock Open Banking Provider

Deterministic local/test provider allowing full end-to-end testing of the
Open Banking flow (connect, callback, account mapping, exact-amount sync,
manual merge & unlink) without requiring external credentials.
"""
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from urllib.parse import urlencode

from app.services.banking.base import (
    AuthStartResult,
    BankInstitution,
    BankProvider,
    ExternalAccount,
    ExternalTransaction,
    SessionResult,
)

FRENCH_MOCK_BANKS: List[BankInstitution] = [
    BankInstitution(name="Société Générale", country="FR", bic="SOGEFRPP"),
    BankInstitution(name="BoursoBank", country="FR", bic="BOUSFRPP"),
    BankInstitution(name="Crédit Agricole", country="FR", bic="AGRIFRPP"),
    BankInstitution(name="BNP Paribas", country="FR", bic="BNPAFRPP"),
    BankInstitution(name="Revolut", country="FR", bic="REVOFRP2"),
    BankInstitution(name="Qonto", country="FR", bic="QNTOFRP1"),
    BankInstitution(name="LCL", country="FR", bic="CRLYFRPP"),
    BankInstitution(name="Caisse d'Épargne", country="FR", bic="CEPAFRPP"),
    BankInstitution(name="Banque Populaire", country="FR", bic="CCBPFRPP"),
    BankInstitution(name="Crédit Mutuel", country="FR", bic="CMCIFR2A"),
    BankInstitution(name="N26", country="FR", bic="NTSBDEB1"),
    BankInstitution(name="La Banque Postale", country="FR", bic="PSSTFRPP"),
]


class MockBankProvider(BankProvider):
    """Deterministic Open Banking provider for local dev & automated tests."""

    provider_name = "mock"

    def __init__(self, custom_transactions: Optional[List[ExternalTransaction]] = None):
        self._custom_transactions = custom_transactions

    async def list_institutions(self, country: str = "FR") -> List[BankInstitution]:
        c = country.upper()
        return [b for b in FRENCH_MOCK_BANKS if b.country == c] or FRENCH_MOCK_BANKS

    async def start_auth(
        self,
        institution_name: str,
        country: str,
        redirect_url: str,
        state: str,
        valid_days: int = 90,
    ) -> AuthStartResult:
        _ = (institution_name, country, valid_days)
        qs = urlencode({"code": f"mock_code_{state[:12]}", "state": state})
        sep = "&" if "?" in redirect_url else "?"
        return AuthStartResult(auth_url=f"{redirect_url}{sep}{qs}")

    async def exchange_code(self, code: str) -> SessionResult:
        suffix = code[-8:] if len(code) >= 8 else code
        return SessionResult(
            session_id=f"mock_session_{suffix}",
            consent_expires_at=datetime.utcnow() + timedelta(days=90),
            accounts=[
                ExternalAccount(
                    external_account_id=f"mock_acc_checking_{suffix}",
                    name="Compte Courant Principal",
                    iban_masked="FR76 •••• 4821",
                    currency="EUR",
                    balance=Decimal("2450.00"),
                    account_type="CHECKING",
                ),
                ExternalAccount(
                    external_account_id=f"mock_acc_savings_{suffix}",
                    name="Livret A",
                    iban_masked="FR76 •••• 9104",
                    currency="EUR",
                    balance=Decimal("6200.00"),
                    account_type="SAVINGS",
                ),
            ],
        )

    async def fetch_transactions(
        self,
        session_id: str,
        external_account_id: str,
        date_from: Optional[date] = None,
    ) -> List[ExternalTransaction]:
        _ = session_id
        today = date.today()
        txs = (
            list(self._custom_transactions)
            if self._custom_transactions is not None
            else [
                ExternalTransaction(
                    external_transaction_id=f"mock_tx_{external_account_id}_1",
                    booking_date=today - timedelta(days=1),
                    amount=Decimal("-42.50"),
                    currency="EUR",
                    description="CARREFOUR MARKET PARIS",
                    counterparty_name="Carrefour Market",
                    status="BOOKED",
                ),
                ExternalTransaction(
                    external_transaction_id=f"mock_tx_{external_account_id}_2",
                    booking_date=today - timedelta(days=2),
                    amount=Decimal("-13.99"),
                    currency="EUR",
                    description="NETFLIX.COM",
                    counterparty_name="Netflix",
                    status="BOOKED",
                ),
            ]
        )
        if date_from:
            txs = [t for t in txs if t.booking_date >= date_from]
        return txs
