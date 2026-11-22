"""
Open Banking Provider Interface

Defines the abstract contract implemented by EnableBankingProvider and MockBankProvider
(and future providers like Powens or Bridge API).
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional


@dataclass
class BankInstitution:
    name: str
    country: str = "FR"
    logo: Optional[str] = None
    bic: Optional[str] = None


@dataclass
class AuthStartResult:
    auth_url: str


@dataclass
class ExternalAccount:
    external_account_id: str
    name: str
    iban_masked: Optional[str] = None
    currency: str = "EUR"
    balance: Optional[Decimal] = None
    account_type: str = "CHECKING"


@dataclass
class SessionResult:
    session_id: str
    consent_expires_at: Optional[datetime] = None
    accounts: List[ExternalAccount] = field(default_factory=list)


@dataclass
class ExternalTransaction:
    external_transaction_id: str
    booking_date: date
    amount: Decimal  # Signed: positive for credit/income, negative for debit/expense
    currency: str = "EUR"
    description: str = "Opération bancaire"
    counterparty_name: Optional[str] = None
    status: str = "BOOKED"


def mask_iban(iban: Optional[str]) -> Optional[str]:
    """Mask IBAN to keep only country prefix and last 4 digits (e.g. FR76 •••• 1234)."""
    if not iban:
        return None
    clean = iban.replace(" ", "").strip().upper()
    if len(clean) <= 8:
        return clean
    return f"{clean[:4]} •••• {clean[-4:]}"


class BankProvider(ABC):
    """Abstract interface for Open Banking aggregators."""

    provider_name: str = "base"

    @abstractmethod
    async def list_institutions(self, country: str = "FR") -> List[BankInstitution]:
        """List supported banks for a given ISO country code."""

    @abstractmethod
    async def start_auth(
        self,
        institution_name: str,
        country: str,
        redirect_url: str,
        state: str,
        valid_days: int = 90,
    ) -> AuthStartResult:
        """Initiate bank OAuth/DSP2 consent flow and return hosted redirect URL."""

    @abstractmethod
    async def exchange_code(self, code: str) -> SessionResult:
        """Exchange authorization code for a persistent read-only session and accounts."""

    @abstractmethod
    async def fetch_transactions(
        self,
        session_id: str,
        external_account_id: str,
        date_from: Optional[date] = None,
    ) -> List[ExternalTransaction]:
        """Fetch booked transactions for an external account since date_from."""
