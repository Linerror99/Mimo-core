"""
Enable Banking Provider (DSP2 / PSD2)

Official REST API integration using short-lived RS256 JWT tokens signed with
the user's RSA private key registered in Enable Banking Control Panel.
"""
import base64
import hashlib
import logging
import time
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import List, Optional

import httpx
from jose import jwt

from app.config import settings
from app.services.banking.base import (
    AuthStartResult,
    BankInstitution,
    BankProvider,
    ExternalAccount,
    ExternalTransaction,
    SessionResult,
    mask_iban,
)

logger = logging.getLogger(__name__)


class EnableBankingProvider(BankProvider):
    """Enable Banking API client (https://api.enablebanking.com)."""

    provider_name = "enable_banking"

    def __init__(
        self,
        app_id: Optional[str] = None,
        private_key_pem: Optional[str] = None,
        api_url: Optional[str] = None,
    ):
        self.app_id = app_id or settings.ENABLE_BANKING_APP_ID
        self.api_url = (api_url or settings.ENABLE_BANKING_API_URL).rstrip("/")
        self._private_key_pem = private_key_pem or self._load_private_key()

    @staticmethod
    def _load_private_key() -> str:
        if settings.ENABLE_BANKING_PRIVATE_KEY_B64:
            raw = base64.b64decode(settings.ENABLE_BANKING_PRIVATE_KEY_B64).decode("utf-8")
            return raw.strip()
        if settings.ENABLE_BANKING_PRIVATE_KEY_PATH:
            key_path = Path(settings.ENABLE_BANKING_PRIVATE_KEY_PATH)
            if key_path.is_file():
                return key_path.read_text(encoding="utf-8").strip()
        raise ValueError(
            "Enable Banking private key not configured "
            "(set ENABLE_BANKING_PRIVATE_KEY_B64 or ENABLE_BANKING_PRIVATE_KEY_PATH)."
        )

    def _build_jwt(self) -> str:
        if not self.app_id:
            raise ValueError("ENABLE_BANKING_APP_ID is not configured.")
        now = int(time.time())
        payload = {
            "iss": "enablebanking.com",
            "aud": "api.enablebanking.com",
            "iat": now,
            "exp": now + 300,
        }
        headers = {"kid": self.app_id}
        return jwt.encode(payload, self._private_key_pem, algorithm="RS256", headers=headers)

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._build_jwt()}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def list_institutions(self, country: str = "FR") -> List[BankInstitution]:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(
                f"{self.api_url}/aspsps",
                params={"country": country.upper()},
                headers=self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()

        institutions: List[BankInstitution] = []
        for item in data.get("aspsps", []):
            name = item.get("name")
            if not name:
                continue
            institutions.append(
                BankInstitution(
                    name=name,
                    country=item.get("country", country.upper()),
                    logo=item.get("logo"),
                    bic=item.get("bic"),
                )
            )
        return institutions

    async def start_auth(
        self,
        institution_name: str,
        country: str,
        redirect_url: str,
        state: str,
        valid_days: int = 90,
    ) -> AuthStartResult:
        valid_until = (
            datetime.now(timezone.utc) + timedelta(days=valid_days)
        ).isoformat().replace("+00:00", "Z")

        body = {
            "access": {
                "balances": True,
                "transactions": True,
                "valid_until": valid_until,
            },
            "aspsp": {
                "name": institution_name,
                "country": country.upper(),
            },
            "psu_type": "personal",
            "redirect_url": redirect_url,
            "state": state,
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{self.api_url}/auth",
                json=body,
                headers=self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()
        return AuthStartResult(auth_url=data["url"])

    async def _fetch_account_balance(
        self, client: httpx.AsyncClient, account_uid: str
    ) -> Optional[Decimal]:
        try:
            resp = await client.get(
                f"{self.api_url}/accounts/{account_uid}/balances",
                headers=self._headers(),
            )
            if resp.status_code != 200:
                return None
            balances = resp.json().get("balances", [])
            if not balances:
                return None
            # Prefer closingBooked or interimAvailable
            preferred = next(
                (
                    b
                    for b in balances
                    if b.get("balance_type") in ("CLBD", "ITAV", "XPCD", "closingBooked")
                ),
                balances[0],
            )
            amt_str = preferred.get("balance_amount", {}).get("amount")
            return Decimal(str(amt_str)) if amt_str is not None else None
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Could not fetch balance for %s: %s", account_uid, exc)
            return None

    async def exchange_code(self, code: str) -> SessionResult:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                f"{self.api_url}/sessions",
                json={"code": code},
                headers=self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()

            session_id = data["session_id"]
            valid_until_raw = data.get("access", {}).get("valid_until")
            expires_at: Optional[datetime] = None
            if valid_until_raw:
                try:
                    expires_at = datetime.fromisoformat(
                        valid_until_raw.replace("Z", "+00:00")
                    ).replace(tzinfo=None)
                except ValueError:
                    expires_at = datetime.utcnow() + timedelta(days=90)
            else:
                expires_at = datetime.utcnow() + timedelta(days=90)

            accounts: List[ExternalAccount] = []
            for raw_acc in data.get("accounts", []):
                uid = raw_acc.get("uid") or raw_acc.get("account_id", {}).get("iban")
                if not uid:
                    continue
                iban = raw_acc.get("account_id", {}).get("iban")
                name = (
                    raw_acc.get("name")
                    or raw_acc.get("details")
                    or raw_acc.get("product")
                    or "Compte bancaire"
                )
                currency = raw_acc.get("currency") or "EUR"
                cash_type = (raw_acc.get("cash_account_type") or "").upper()
                acc_type = "SAVINGS" if cash_type in ("SVGS", "SAVINGS") else "CHECKING"
                balance = await self._fetch_account_balance(client, uid)
                accounts.append(
                    ExternalAccount(
                        external_account_id=uid,
                        name=name[:100],
                        iban_masked=mask_iban(iban),
                        currency=currency[:3],
                        balance=balance,
                        account_type=acc_type,
                    )
                )

        return SessionResult(
            session_id=session_id,
            consent_expires_at=expires_at,
            accounts=accounts,
        )

    async def fetch_transactions(
        self,
        session_id: str,
        external_account_id: str,
        date_from: Optional[date] = None,
    ) -> List[ExternalTransaction]:
        _ = session_id
        results: List[ExternalTransaction] = []
        continuation_key: Optional[str] = None

        async with httpx.AsyncClient(timeout=30.0) as client:
            for _page in range(20):  # Safety cap
                params: dict[str, str] = {"transaction_status": "BOOKED"}
                if date_from:
                    params["date_from"] = date_from.isoformat()
                if continuation_key:
                    params["continuation_key"] = continuation_key

                resp = await client.get(
                    f"{self.api_url}/accounts/{external_account_id}/transactions",
                    params=params,
                    headers=self._headers(),
                )
                resp.raise_for_status()
                data = resp.json()

                for raw in data.get("transactions", []):
                    parsed = self._parse_transaction(raw)
                    if parsed:
                        results.append(parsed)

                continuation_key = data.get("continuation_key")
                if not continuation_key:
                    break

        return results

    @staticmethod
    def _parse_transaction(raw: dict) -> Optional[ExternalTransaction]:
        status_str = (raw.get("status") or "BOOKED").upper()
        if status_str not in ("BOOKED", "PDNG"):
            return None
        if status_str != "BOOKED":
            return None

        amt_obj = raw.get("transaction_amount") or {}
        amt_raw = amt_obj.get("amount")
        if amt_raw is None:
            return None
        try:
            amount = Decimal(str(amt_raw))
        except InvalidOperation:
            return None
        if amount == 0:
            return None

        indicator = (raw.get("credit_debit_indicator") or "").upper()
        if indicator == "DBIT":
            amount = -abs(amount)
        elif indicator == "CRDT":
            amount = abs(amount)

        booking_str = raw.get("booking_date") or raw.get("value_date")
        if not booking_str:
            return None
        try:
            booking_dt = date.fromisoformat(booking_str[:10])
        except ValueError:
            return None

        remittance = raw.get("remittance_information") or []
        remittance_text = " ".join(str(x).strip() for x in remittance if x).strip()
        counterparty = (
            (raw.get("creditor") or {}).get("name")
            if amount < 0
            else (raw.get("debtor") or {}).get("name")
        )
        description = (counterparty or remittance_text or "Opération bancaire")[:255]
        if counterparty and remittance_text and counterparty.lower() not in remittance_text.lower():
            description = f"{counterparty} — {remittance_text}"[:255]

        ext_id = raw.get("entry_reference") or raw.get("transaction_id")
        if not ext_id:
            # Deterministic fallback fingerprint so deduplication still works
            sig = f"{booking_dt.isoformat()}|{amount}|{description}"
            ext_id = f"eb_{hashlib.sha256(sig.encode('utf-8')).hexdigest()[:32]}"

        return ExternalTransaction(
            external_transaction_id=str(ext_id),
            booking_date=booking_dt,
            amount=amount,
            currency=(amt_obj.get("currency") or "EUR")[:3],
            description=description,
            counterparty_name=counterparty,
            status="BOOKED",
        )
