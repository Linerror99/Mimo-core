"""Symmetric encryption helpers for sensitive tokens stored at rest (Fernet / AES-128-CBC + HMAC-SHA256)."""

import base64
import hashlib
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

ENCRYPTED_PREFIX = "enc:v1:"


def _derive_fernet_key(raw_secret: str) -> bytes:
    """Derive a valid 32-byte URL-safe base64 Fernet key from an arbitrary secret."""
    digest = hashlib.sha256(raw_secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def _get_fernet() -> Fernet:
    """Build a Fernet instance using BANKING_ENCRYPTION_KEY or a derived key from JWT_SECRET_KEY."""
    configured = (settings.BANKING_ENCRYPTION_KEY or "").strip()
    if configured:
        try:
            return Fernet(configured.encode("utf-8"))
        except Exception:
            return Fernet(_derive_fernet_key(configured))
    return Fernet(_derive_fernet_key(f"mimo-banking-enc-v1:{settings.JWT_SECRET_KEY}"))


def is_encrypted(value: Optional[str]) -> bool:
    """Return True if value already carries the versioned encryption prefix."""
    return bool(value and value.startswith(ENCRYPTED_PREFIX))


def encrypt_secret(plaintext: str) -> str:
    """Encrypt a plaintext secret with Fernet and prefix it with `enc:v1:` (idempotent)."""
    if not plaintext:
        return plaintext
    if is_encrypted(plaintext):
        return plaintext
    token = _get_fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")
    return f"{ENCRYPTED_PREFIX}{token}"


def decrypt_secret(value: str) -> str:
    """
    Decrypt a secret stored at rest.

    Backward compatible: legacy plaintext values without the `enc:v1:` prefix
    are returned unchanged so existing active connections keep working seamlessly.
    """
    if not value:
        return value
    if not is_encrypted(value):
        return value
    raw_token = value[len(ENCRYPTED_PREFIX):].encode("utf-8")
    try:
        return _get_fernet().decrypt(raw_token).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Unable to decrypt stored banking secret (invalid key or corrupted token).") from exc
