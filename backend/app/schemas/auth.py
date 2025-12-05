"""Authentication schemas for request/response validation."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


class UserCreate(BaseModel):
    """Schema for user registration."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=100, description="User password (min 8 characters)")
    first_name: str = Field(..., min_length=1, max_length=50, description="User first name")
    last_name: str = Field(..., min_length=1, max_length=50, description="User last name")
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """
        Password must contain:
        - At least 8 characters
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one number
        """
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        return v


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class UserResponse(BaseModel):
    """Schema for user data in responses."""
    id: str
    email: str
    first_name: str
    last_name: str
    is_active: bool
    household_id: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Schema for JWT token response."""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    user: UserResponse = Field(..., description="User information")


class TokenRefresh(BaseModel):
    """Schema for token refresh request."""
    refresh_token: str = Field(..., description="Refresh token to exchange for new access token")


class UserUpdate(BaseModel):
    """Schema for updating user info."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)


class PasswordChange(BaseModel):
    """Schema for changing password."""
    old_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, max_length=100, description="New password")
    
    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Same validation as UserCreate password."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        return v
