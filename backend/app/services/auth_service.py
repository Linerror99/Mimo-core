"""
Authentication service (business logic)
"""
from datetime import datetime, timedelta, timezone
from typing import Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from jose import jwt
import redis.asyncio as redis

from app.models.user import User
from app.models.household import Household, HouseholdType
from app.schemas.auth import UserCreate, UserLogin, TokenResponse
from app.config import settings


# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
        # Decode token to get expiry
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        exp = payload.get("exp")
        
        if exp:
            # Calculate TTL (time until expiry)
            now = datetime.now(timezone.utc).timestamp()
            ttl = int(exp - now)
            
            if ttl > 0:
                # Store token in Redis blacklist
                await redis_client.setex(f"blacklist:{token}", ttl, "1")
    
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
