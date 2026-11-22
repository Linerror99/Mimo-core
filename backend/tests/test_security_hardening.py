"""Tests unitaires pour le durcissement sécurité (chiffrement au repos, verrouillage register, rate-limit auth, jobs/cron/admin)."""
import subprocess
from datetime import date, datetime, timedelta
from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.crypto import ENCRYPTED_PREFIX, decrypt_secret, encrypt_secret, is_encrypted
from app.core.security import RateLimitMiddleware
from app.models import Account, AccountType, BankConnection
from app.services.banking.mock_provider import MockBankProvider
from app.services.banking.sync_service import BankingSyncService


class TestBankingCrypto:
    """Chiffrement Fernet au repos des tokens Open Banking (bank_connections.session_id)."""

    def test_encrypt_decrypt_roundtrip_and_idempotency(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr(settings, "BANKING_ENCRYPTION_KEY", None)
        plain = "eb-session-uuid-1234-5678-90ab"

        encrypted = encrypt_secret(plain)
        assert encrypted.startswith(ENCRYPTED_PREFIX)
        assert plain not in encrypted
        assert is_encrypted(encrypted) is True

        # Idempotent si appelé deux fois
        assert encrypt_secret(encrypted) == encrypted
        assert decrypt_secret(encrypted) == plain

    def test_decrypt_legacy_plaintext_backward_compatible(self):
        legacy = "legacy-plain-session-id-from-before-hardening"
        assert is_encrypted(legacy) is False
        assert decrypt_secret(legacy) == legacy

    def test_decrypt_fails_with_wrong_key(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr(settings, "BANKING_ENCRYPTION_KEY", "first-strong-passphrase-123")
        encrypted = encrypt_secret("secret-session-value")

        monkeypatch.setattr(settings, "BANKING_ENCRYPTION_KEY", "second-different-passphrase-456")
        with pytest.raises(ValueError, match="Unable to decrypt"):
            decrypt_secret(encrypted)

    @pytest.mark.asyncio
    async def test_sync_migrates_legacy_plaintext_session_id_to_encrypted(
        self,
        db_session: AsyncSession,
        test_user_household_id: str,
        test_user,
    ):
        """Une connexion existante avec un session_id en clair fonctionne et est re-chiffrée à la volée."""
        conn = BankConnection(
            household_id=test_user_household_id,
            user_id=test_user.id,
            provider="mock",
            institution_name="Société Générale",
            institution_country="FR",
            session_id="legacy-unencrypted-session-id",
            state_token="state_legacy_crypto_123",
            status="ACTIVE",
            consent_expires_at=datetime.utcnow() + timedelta(days=45),
        )
        db_session.add(conn)
        await db_session.flush()

        acc = Account(
            household_id=test_user_household_id,
            name="SG Legacy",
            type=AccountType.CHECKING,
            initial_balance=Decimal("100.00"),
            bank_connection_id=conn.id,
            external_account_id="ext_legacy_1",
            sync_enabled=True,
            sync_from_date=date.today() - timedelta(days=3),
        )
        db_session.add(acc)
        await db_session.commit()

        service = BankingSyncService(db_session, provider=MockBankProvider(custom_transactions=[]))
        summary = await service.sync_connection(test_user_household_id, conn.id)

        assert summary.errors == []
        await db_session.refresh(conn)
        assert is_encrypted(conn.session_id) is True
        assert decrypt_secret(conn.session_id) == "legacy-unencrypted-session-id"


@pytest.mark.asyncio
class TestRegistrationLock:
    """Verrouillage des inscriptions publiques via ALLOW_PUBLIC_REGISTRATION."""

    async def test_registration_blocked_when_disabled(
        self,
        client: AsyncClient,
        monkeypatch: pytest.MonkeyPatch,
    ):
        monkeypatch.setattr(settings, "ALLOW_PUBLIC_REGISTRATION", False)

        status_res = await client.get("/api/v1/auth/registration-status")
        assert status_res.status_code == 200
        assert status_res.json() == {"allow_public_registration": False}

        reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "intruder@example.com",
                "password": "StrongPassword123",
                "first_name": "Intrus",
                "last_name": "Test",
            },
        )
        assert reg_res.status_code == 403
        body = reg_res.json()
        assert body.get("detail") or body.get("error")

    async def test_registration_status_enabled(
        self,
        client: AsyncClient,
        monkeypatch: pytest.MonkeyPatch,
    ):
        monkeypatch.setattr(settings, "ALLOW_PUBLIC_REGISTRATION", True)
        status_res = await client.get("/api/v1/auth/registration-status")
        assert status_res.status_code == 200
        assert status_res.json() == {"allow_public_registration": True}


class TestAuthRateLimiting:
    """Rate-limiting anti brute-force dédié aux routes d'authentification sensibles."""

    def test_auth_endpoints_rate_limited_strictly(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr(RateLimitMiddleware, "_get_redis", lambda self: None)
        mini_app = FastAPI()

        @mini_app.post("/api/v1/auth/login")
        async def fake_login():
            return {"ok": True}

        @mini_app.post("/api/v1/auth/forgot-password")
        async def fake_forgot():
            return {"ok": True}

        @mini_app.get("/api/v1/accounts")
        async def fake_accounts():
            return []

        mini_app.add_middleware(
            RateLimitMiddleware,
            requests_per_minute=100,
            burst_limit=50,
            auth_requests_per_window=3,
            auth_window_seconds=60,
        )

        tc = TestClient(mini_app)

        headers = {"X-Forwarded-For": "203.0.113.42"}

        # 3 tentatives autorisées, la 4e bloquée avec 429
        for _ in range(3):
            resp = tc.post("/api/v1/auth/login", headers=headers)
            assert resp.status_code == 200

        blocked = tc.post("/api/v1/auth/login", headers=headers)
        assert blocked.status_code == 429
        assert blocked.headers.get("Retry-After") == "60"
        assert "tentatives" in blocked.json()["error"].lower()

        # Une route non-auth reste accessible
        ok_accounts = tc.get("/api/v1/accounts", headers=headers)
        assert ok_accounts.status_code == 200

        # Une autre IP n'est pas bloquée
        other_ip = tc.post("/api/v1/auth/login", headers={"X-Forwarded-For": "198.51.100.7"})
        assert other_ip.status_code == 200


@pytest.mark.asyncio
class TestCronJobsAndAdminSecurity:
    """Sécurisation des endpoints cron, jobs et admin (constant-time + pas de fuite DB URL)."""

    async def test_cron_sync_requires_valid_secret(
        self,
        client: AsyncClient,
        monkeypatch: pytest.MonkeyPatch,
    ):
        monkeypatch.setattr(settings, "CRON_SYNC_SECRET", "super-secret-cron-token")

        res_missing = await client.post("/api/v1/banking/cron-sync")
        assert res_missing.status_code == 403

        res_wrong = await client.post(
            "/api/v1/banking/cron-sync",
            headers={"X-Cron-Secret": "wrong-token"},
        )
        assert res_wrong.status_code == 403

        res_ok = await client.post(
            "/api/v1/banking/cron-sync",
            headers={"X-Cron-Secret": "super-secret-cron-token"},
        )
        assert res_ok.status_code == 200

    async def test_jobs_preview_requires_token_in_production(
        self,
        client: AsyncClient,
        monkeypatch: pytest.MonkeyPatch,
    ):
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("JOB_TOKEN", "prod-job-secret-xyz")

        res_no_token = await client.get("/api/v1/jobs/daily-maintenance/preview")
        assert res_no_token.status_code == 403

        res_bad_token = await client.get(
            "/api/v1/jobs/daily-maintenance/preview",
            headers={"X-Job-Token": "bad"},
        )
        assert res_bad_token.status_code == 403

        res_valid = await client.get(
            "/api/v1/jobs/daily-maintenance/preview",
            headers={"X-Job-Token": "prod-job-secret-xyz"},
        )
        assert res_valid.status_code == 200

    async def test_admin_migrate_never_leaks_database_url(
        self,
        client: AsyncClient,
        monkeypatch: pytest.MonkeyPatch,
    ):
        monkeypatch.setenv("ADMIN_TOKEN", "admin-secret-test")
        monkeypatch.setenv(
            "DATABASE_URL",
            "postgresql://mimo_user:SUPER_SECRET_DB_PWD@10.0.0.1:5432/mimo_db",
        )

        fake_proc = MagicMock(returncode=0, stdout="OK", stderr="")
        monkeypatch.setattr(subprocess, "run", lambda *a, **kw: fake_proc)

        res_bad = await client.post(
            "/api/v1/admin/migrate",
            headers={"X-Admin-Token": "wrong"},
        )
        assert res_bad.status_code == 401

        res_ok = await client.post(
            "/api/v1/admin/migrate",
            headers={"X-Admin-Token": "admin-secret-test"},
        )
        assert res_ok.status_code == 200
        output = res_ok.json().get("output", "")
        assert "SUPER_SECRET_DB_PWD" not in output
        assert "[REDACTED]" in output
