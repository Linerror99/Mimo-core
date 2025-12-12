"""Authentication service with JWT token management."""
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import User

# Password hashing context avec rounds configurables
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=settings.BCRYPT_ROUNDS
)


class AuthService:
    """Service for authentication operations."""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a plain password."""
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def create_access_token(user_id: int, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token."""
        if expires_delta is None:
            expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

        expire = datetime.utcnow() + expires_delta
        to_encode = {
            "sub": str(user_id),
            "exp": expire,
            "type": "access"
        }

        encoded_jwt = jwt.encode(
            to_encode,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM
        )
        return encoded_jwt

    @staticmethod
    def create_refresh_token(user_id: int, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT refresh token."""
        if expires_delta is None:
            expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        expire = datetime.utcnow() + expires_delta
        to_encode = {
            "sub": str(user_id),
            "exp": expire,
            "type": "refresh"
        }

        encoded_jwt = jwt.encode(
            to_encode,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM
        )
        return encoded_jwt

    @staticmethod
    def decode_token(token: str) -> Optional[dict]:
        """Decode and validate a JWT token."""
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            return payload
        except JWTError:
            return None

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        """Get user by email."""
        result = await db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
        """Get user by ID."""
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[User]:
        """Authenticate a user with email and password."""
        user = await AuthService.get_user_by_email(db, email)

        if not user:
            return None

        if not AuthService.verify_password(password, user.password_hash):
            return None

        if not user.is_active:
            return None

        return user

    @staticmethod
    async def create_user(
        db: AsyncSession,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        household_id: Optional[int] = None
    ) -> User:
        """Create a new user."""
        hashed_password = AuthService.hash_password(password)

        user = User(
            email=email,
            password_hash=hashed_password,
            first_name=first_name,
            last_name=last_name,
            household_id=household_id
        )

        db.add(user)
        await db.commit()
        await db.refresh(user)

        return user


auth_service = AuthService()
