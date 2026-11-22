"""Tests unitaires dédiés au client EnableBankingProvider (JWT RS256, filtrage UUID, parsing ISO 20022)."""
from datetime import date
from decimal import Decimal
import uuid

import httpx
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from jose import jwt

from app.services.banking.enable_banking import EnableBankingProvider


def _generate_ephemeral_rsa_pair() -> tuple[str, str]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    priv_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")
    pub_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")
    return priv_pem, pub_pem


class _FakeAsyncClient:
    """Client httpx minimaliste pour mocker les appels REST Enable Banking."""

    def __init__(self, handler):
        self._handler = handler

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def get(self, url, params=None, headers=None):
        return self._handler("GET", url, params=params, json=None, headers=headers)

    async def post(self, url, json=None, headers=None):
        return self._handler("POST", url, params=None, json=json, headers=headers)


class TestEnableBankingProvider:
    def test_build_jwt_signed_with_rs256_and_kid(self):
        priv_pem, pub_pem = _generate_ephemeral_rsa_pair()
        app_id = str(uuid.uuid4())
        provider = EnableBankingProvider(app_id=app_id, private_key_pem=priv_pem)

        token = provider._build_jwt()
        unverified_header = jwt.get_unverified_header(token)
        assert unverified_header["alg"] == "RS256"
        assert unverified_header["kid"] == app_id

        decoded = jwt.decode(
            token,
            pub_pem,
            algorithms=["RS256"],
            audience="api.enablebanking.com",
        )
        assert decoded["iss"] == "enablebanking.com"
        assert decoded["exp"] > decoded["iat"]

    @pytest.mark.asyncio
    async def test_exchange_code_filters_non_uuid_and_handles_null_account_id(
        self, monkeypatch: pytest.MonkeyPatch
    ):
        priv_pem, _ = _generate_ephemeral_rsa_pair()
        provider = EnableBankingProvider(app_id=str(uuid.uuid4()), private_key_pem=priv_pem)

        valid_uid_1 = str(uuid.uuid4())
        valid_uid_2 = str(uuid.uuid4())

        def handler(method, url, params=None, json=None, headers=None):
            req = httpx.Request(method, url)
            if method == "POST" and url.endswith("/sessions"):
                return httpx.Response(
                    200,
                    request=req,
                    json={
                        "session_id": "eb-session-real-123",
                        "access": {"valid_until": "2027-02-20T00:00:00Z"},
                        "accounts": [
                            {
                                "uid": valid_uid_1,
                                "name": "Compte Courant SG",
                                "currency": "EUR",
                                "cash_account_type": "CACC",
                                "account_id": {"iban": "FR7630003012340001234567890"},
                            },
                            {
                                "uid": valid_uid_2,
                                "name": "Livret Épargne",
                                "currency": "EUR",
                                "cash_account_type": "SVGS",
                                "account_id": None,  # Null explicite vu en prod/sandbox
                            },
                            {
                                # Carte différée / compte masqué SG sans UUID -> doit être ignoré
                                "uid": "************1145",
                                "name": "Carte Visa SG",
                                "currency": "EUR",
                            },
                            {
                                "name": "Compte sans UID",
                            },
                        ],
                    },
                )
            if method == "GET" and f"/accounts/{valid_uid_1}/balances" in url:
                return httpx.Response(
                    200,
                    request=req,
                    json={
                        "balances": [
                            {
                                "balance_type": "CLBD",
                                "balance_amount": {"amount": "1234.56", "currency": "EUR"},
                            }
                        ]
                    },
                )
            if method == "GET" and f"/accounts/{valid_uid_2}/balances" in url:
                return httpx.Response(200, request=req, json={"balances": []})
            raise AssertionError(f"Unexpected HTTP call: {method} {url}")

        monkeypatch.setattr(httpx, "AsyncClient", lambda timeout=25.0: _FakeAsyncClient(handler))

        result = await provider.exchange_code("oauth-code-123")
        assert result.session_id == "eb-session-real-123"
        assert len(result.accounts) == 2
        assert result.accounts[0].external_account_id == valid_uid_1
        assert result.accounts[0].iban_masked == "FR76 •••• 7890"
        assert result.accounts[0].balance == Decimal("1234.56")
        assert result.accounts[0].account_type == "CHECKING"

        assert result.accounts[1].external_account_id == valid_uid_2
        assert result.accounts[1].iban_masked is None
        assert result.accounts[1].account_type == "SAVINGS"

    @pytest.mark.asyncio
    async def test_fetch_transactions_uses_book_status_and_paginates(
        self, monkeypatch: pytest.MonkeyPatch
    ):
        priv_pem, _ = _generate_ephemeral_rsa_pair()
        provider = EnableBankingProvider(app_id=str(uuid.uuid4()), private_key_pem=priv_pem)
        account_uid = str(uuid.uuid4())
        seen_params = []

        def handler(method, url, params=None, json=None, headers=None):
            assert method == "GET"
            assert f"/accounts/{account_uid}/transactions" in url
            seen_params.append(dict(params or {}))
            if not params or "continuation_key" not in params:
                return httpx.Response(
                    200,
                    json={
                        "transactions": [
                            {
                                "entry_reference": "ref-debit-1",
                                "status": "BOOK",
                                "booking_date": "2026-11-20",
                                "credit_debit_indicator": "DBIT",
                                "transaction_amount": {"amount": "95.00", "currency": "EUR"},
                                "remittance_information": ["VIR INSTANTANE BNP"],
                            },
                            {
                                # En attente (PDNG) -> ignoré
                                "entry_reference": "ref-pending",
                                "status": "PDNG",
                                "booking_date": "2026-11-21",
                                "credit_debit_indicator": "DBIT",
                                "transaction_amount": {"amount": "12.00", "currency": "EUR"},
                            },
                        ],
                        "continuation_key": "page-2-token",
                    },
                )
            return httpx.Response(
                200,
                json={
                    "transactions": [
                        {
                            "entry_reference": "ref-credit-2",
                            "status": "BOOK",
                            "booking_date": "2026-11-20",
                            "credit_debit_indicator": "CRDT",
                            "transaction_amount": {"amount": "100.00", "currency": "EUR"},
                            "debtor": {"name": "M OZIAS"},
                            "remittance_information": ["WERO"],
                        },
                        {
                            # Montant 0 -> ignoré
                            "entry_reference": "ref-zero",
                            "status": "BOOK",
                            "booking_date": "2026-11-20",
                            "credit_debit_indicator": "DBIT",
                            "transaction_amount": {"amount": "0.00", "currency": "EUR"},
                        },
                    ]
                },
            )

        monkeypatch.setattr(httpx, "AsyncClient", lambda timeout=30.0: _FakeAsyncClient(handler))

        txs = await provider.fetch_transactions(
            session_id="unused",
            external_account_id=account_uid,
            date_from=date(2026, 11, 15),
        )

        assert len(seen_params) == 2
        assert seen_params[0]["transaction_status"] == "BOOK"
        assert seen_params[0]["date_from"] == "2026-11-15"
        assert seen_params[1]["continuation_key"] == "page-2-token"

        assert len(txs) == 2
        assert txs[0].external_transaction_id == "ref-debit-1"
        assert txs[0].amount == Decimal("-95.00")
        assert txs[1].external_transaction_id == "ref-credit-2"
        assert txs[1].amount == Decimal("100.00")
        assert txs[1].counterparty_name == "M OZIAS"
