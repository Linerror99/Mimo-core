"""
Authentication service (business logic)
"""
from datetime import datetime, timedelta, timezone
import secrets
from typing import Dict

import redis.asyncio as redis
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.household import Household, HouseholdType
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin
from app.services.email_service import EmailService

# Password hashing avec rounds configurables
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=settings.BCRYPT_ROUNDS
)

# Redis client for token blacklist
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


class AuthService:
    """Service for authentication operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def hash_password(self, password: str) -> str:
        """Hash a plain password."""
        return pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)

    def create_access_token(self, data: dict) -> str:
        """Create JWT access token (15min expiry)."""
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    def create_refresh_token(self, data: dict) -> str:
        """Create JWT refresh token (7 days expiry)."""
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    async def register(self, user_data: UserCreate) -> User:
        """
        Register a new user with INDIVIDUAL household.

        A household INDIVIDUAL is created automatically.
        It becomes COUPLE when another user accepts an invitation.

        Raises:
            ValueError: If email already exists
        """
        # Check if email already exists
        stmt = select(User).where(User.email == user_data.email)
        result = await self.db.execute(stmt)
        existing_user = result.scalar_one_or_none()

        if existing_user:
            raise ValueError("Email already registered")

        # Create INDIVIDUAL household
        household = Household(
            name=f"{user_data.first_name} {user_data.last_name}",
            type=HouseholdType.INDIVIDUAL
        )
        self.db.add(household)
        await self.db.flush()  # Get household ID

        # Create user
        hashed_password = self.hash_password(user_data.password)
        user = User(
            email=user_data.email,
            password_hash=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            household_id=household.id
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        return user

    async def login(self, login_data: UserLogin) -> Dict[str, str]:
        """
        Authenticate user and return JWT tokens.

        Raises:
            ValueError: If credentials are invalid
        """
        # Get user by email
        stmt = select(User).where(User.email == login_data.email)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user or not self.verify_password(login_data.password, user.password_hash):
            raise ValueError("Invalid credentials")

        # Create tokens
        token_data = {"sub": str(user.id), "email": user.email}
        access_token = self.create_access_token(token_data)
        refresh_token = self.create_refresh_token(token_data)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }

    async def logout(self, token: str) -> None:
        """
        Logout user by blacklisting the access token.
        Token is stored in Redis until expiry.
        """
        try:
            # Decode token to get expiry without failing if already expired
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                options={"verify_exp": False}
            )
            exp = payload.get("exp")

            if exp:
                # Calculate TTL (time until expiry)
                now = datetime.now(timezone.utc).timestamp()
                ttl = int(exp - now)

                if ttl > 0:
                    # Store token in Redis blacklist
                    await redis_client.setex(f"blacklist:{token}", ttl, "1")
        except Exception:
            pass

    async def is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted."""
        result = await redis_client.get(f"blacklist:{token}")
        return result is not None

    async def refresh_access_token(self, refresh_token: str) -> str:
        """
        Generate new access token from refresh token.

        Raises:
            ValueError: If refresh token is invalid
        """
        try:
            payload = jwt.decode(refresh_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])

            if payload.get("type") != "refresh":
                raise ValueError("Invalid token type")

            # Create new access token
            token_data = {"sub": payload["sub"], "email": payload["email"]}
            access_token = self.create_access_token(token_data)

            return access_token
        except Exception:
            raise ValueError("Invalid refresh token")

    async def forgot_password(self, email: str) -> dict:
        """
        Generate a secure 6-digit OTP code, save in Redis for 15 mins, and send by email.
        """
        email_clean = email.strip().lower()
        result = await self.db.execute(select(User).where(User.email == email_clean))
        user = result.scalar_one_or_none()

        if user:
            # Generate 6-digit numeric OTP
            code = f"{secrets.randbelow(900000) + 100000}"
            
            # Store in Redis for 15 minutes (900 seconds)
            await redis_client.setex(f"pwd_reset:{email_clean}", 900, code)
            await redis_client.delete(f"pwd_attempts:{email_clean}")

            # Send Email
            EmailService.send_password_reset_code(email_clean, code)

        return {
            "message": "Un code de validation à 6 chiffres a été envoyé par email si le compte existe.",
            "expires_in_minutes": 15
        }

    async def verify_reset_code(self, email: str, code: str) -> bool:
        """
        Verify if the 6-digit OTP code in Redis is valid for this email.
        """
        email_clean = email.strip().lower()
        code_clean = code.strip()

        attempts_key = f"pwd_attempts:{email_clean}"
        attempts = await redis_client.get(attempts_key)
        if attempts and int(attempts) >= 5:
            raise ValueError("Trop de tentatives infructueuses. Veuillez demander un nouveau code.")

        stored_code = await redis_client.get(f"pwd_reset:{email_clean}")
        if not stored_code or stored_code != code_clean:
            await redis_client.incr(attempts_key)
            await redis_client.expire(attempts_key, 900)
            raise ValueError("Code de validation invalide ou expiré.")

        return True

    async def reset_password(self, email: str, code: str, new_password: str) -> bool:
        """
        Verify the 6-digit OTP code and update user password.
        """
        email_clean = email.strip().lower()
        code_clean = code.strip()

        # Brute-force protection: max 5 attempts per code
        attempts_key = f"pwd_attempts:{email_clean}"
        attempts = await redis_client.get(attempts_key)
        if attempts and int(attempts) >= 5:
            raise ValueError("Trop de tentatives infructueuses. Veuillez demander un nouveau code.")

        stored_code = await redis_client.get(f"pwd_reset:{email_clean}")
        if not stored_code or stored_code != code_clean:
            await redis_client.incr(attempts_key)
            await redis_client.expire(attempts_key, 900)
            raise ValueError("Code de validation invalide ou expiré.")

        result = await self.db.execute(select(User).where(User.email == email_clean))
        user = result.scalar_one_or_none()
        if not user:
            raise ValueError("Utilisateur introuvable.")

        # Update password (use naive UTC datetime for PostgreSQL compatibility)
        user.password_hash = self.hash_password(new_password)
        user.updated_at = datetime.utcnow()

        # Clear reset code and attempts
        await redis_client.delete(f"pwd_reset:{email_clean}")
        await redis_client.delete(attempts_key)

        await self.db.commit()
        return True



