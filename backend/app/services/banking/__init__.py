"""Open Banking services package."""
from app.config import settings
from app.services.banking.base import BankProvider
from app.services.banking.enable_banking import EnableBankingProvider
from app.services.banking.mock_provider import MockBankProvider


def get_bank_provider(provider_override: str | None = None) -> BankProvider:
    """Resolve active Open Banking provider based on configuration."""
    mode = (provider_override or settings.BANKING_PROVIDER or "auto").lower()
    if mode == "enable_banking":
        return EnableBankingProvider()
    if mode == "auto" and settings.ENABLE_BANKING_APP_ID:
        return EnableBankingProvider()
    return MockBankProvider()


__all__ = [
    "BankProvider",
    "EnableBankingProvider",
    "MockBankProvider",
    "get_bank_provider",
]
