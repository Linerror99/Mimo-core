"""
Open Banking Schemas

Pydantic schemas for Enable Banking / Mock Open Banking endpoints.
"""
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class BankInstitutionResponse(BaseModel):
    name: str
    country: str = "FR"
    logo: Optional[str] = None
    bic: Optional[str] = None


class BankConnectRequest(BaseModel):
    institution_name: str = Field(..., min_length=1, max_length=150)
    institution_country: str = Field(default="FR", min_length=2, max_length=4)
    institution_logo: Optional[str] = None
    redirect_url: Optional[str] = None


class BankConnectResponse(BaseModel):
    connection_id: str
    auth_url: str
    state: str
    provider: str


class DiscoveredAccountSchema(BaseModel):
    external_account_id: str
    name: str
    iban_masked: Optional[str] = None
    currency: str = "EUR"
    balance: Optional[Decimal] = None
    account_type: str = "CHECKING"


class BankCallbackRequest(BaseModel):
    code: str = Field(..., min_length=1)
    state: str = Field(..., min_length=1)


class BankCallbackResponse(BaseModel):
    connection_id: str
    institution_name: str
    status: str
    consent_expires_at: Optional[datetime] = None
    discovered_accounts: List[DiscoveredAccountSchema] = []


class AccountLinkMapping(BaseModel):
    external_account_id: str
    mimo_account_id: Optional[str] = Field(
        None,
        description="ID d'un compte Mimo existant à relier. Si None, un nouveau compte est créé.",
    )
    new_account_name: Optional[str] = Field(None, max_length=100)
    new_account_type: Optional[str] = Field(default="CHECKING")
    iban_masked: Optional[str] = None
    currency: str = "EUR"
    initial_balance: Optional[Decimal] = None
    sync_from_date: Optional[date] = None
    sync_enabled: bool = True


class LinkAccountsRequest(BaseModel):
    mappings: List[AccountLinkMapping] = Field(..., min_length=1)
    run_initial_sync: bool = True


class BankConnectionAccountSummary(BaseModel):
    id: str
    name: str
    iban_masked: Optional[str] = None
    sync_enabled: bool = False
    sync_from_date: Optional[date] = None


class BankConnectionResponse(BaseModel):
    id: str
    provider: str
    institution_name: str
    institution_country: str
    institution_logo: Optional[str] = None
    status: str
    consent_expires_at: Optional[datetime] = None
    last_synced_at: Optional[datetime] = None
    last_error: Optional[str] = None
    days_until_expiry: Optional[int] = None
    linked_accounts: List[BankConnectionAccountSummary] = []
    discovered_accounts: List[DiscoveredAccountSchema] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SyncSummaryResponse(BaseModel):
    connections_synced: int = 0
    accounts_synced: int = 0
    imported: int = 0
    matched: int = 0
    skipped: int = 0
    errors: List[str] = []


class MergeTransactionRequest(BaseModel):
    target_transaction_id: str = Field(
        ...,
        description="ID de la transaction Mimo prévue/existante à fusionner avec l'opération bancaire importée.",
    )


class MergeTransactionResponse(BaseModel):
    merged_transaction_id: str
    removed_imported_id: str
    amount: Decimal
    transaction_date: date
    state: str
    type: Optional[str] = None
    external_transaction_id: Optional[str] = None
    destination_external_transaction_id: Optional[str] = None
    import_source: str


class UnlinkTransactionResponse(BaseModel):
    transaction_id: str
    import_source: str
    external_transaction_id: Optional[str] = None
    destination_external_transaction_id: Optional[str] = None
