"""
Account Schemas

Pydantic models for Account API
"""
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from typing import Optional

from app.models.account import AccountType


class AccountBase(BaseModel):
    """Base account schema"""
    name: str = Field(..., min_length=1, max_length=100, description="Account name")
    type: AccountType = Field(..., description="Account type")
    initial_balance: Decimal = Field(default=0, description="Initial balance")
    currency: str = Field(default="EUR", min_length=3, max_length=3, description="Currency code")


class AccountCreate(AccountBase):
    """Schema for creating an account"""
    pass


class AccountUpdate(BaseModel):
    """Schema for updating an account"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    type: Optional[AccountType] = None
    is_active: Optional[bool] = None


class AccountResponse(AccountBase):
    """Schema for account response"""
    id: str
    household_id: str
    is_active: bool
    current_balance: Decimal = Field(description="Current balance (initial + transactions)")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
