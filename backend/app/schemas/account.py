"""
Account Schemas

Pydantic models for Account API
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.models.account import AccountType


class AccountBase(BaseModel):
    """Base account schema"""
    name: str = Field(..., min_length=1, max_length=100, description="Account name")
    type: AccountType = Field(..., description="Account type")
    initial_balance: Decimal = Field(default=0, description="Initial balance")
    currency: str = Field(default="EUR", min_length=3, max_length=3, description="Currency code")
    logo_url: Optional[str] = Field(None, description="Bank logo (URL, preset identifier, or image)")


class AccountCreate(AccountBase):
    """Schema for creating an account"""
    pass


class AccountUpdate(BaseModel):
    """Schema for updating an account (initial_balance is immutable after creation)"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    type: Optional[AccountType] = None
    is_active: Optional[bool] = None
    logo_url: Optional[str] = None


class AccountResponse(AccountBase):
    """Schema for account response"""
    id: str
    household_id: str
    is_active: bool
    current_balance: Decimal = Field(description="Current balance (initial + transactions)")
    closed_at: Optional[datetime] = Field(None, description="Timestamp when account was closed")
    bank_connection_id: Optional[str] = Field(None, description="Linked Open Banking connection ID")
    external_account_id: Optional[str] = Field(None, description="External bank account UID")
    iban_masked: Optional[str] = Field(None, description="Masked IBAN")
    sync_enabled: bool = Field(default=False, description="Whether Open Banking sync is active")
    sync_from_date: Optional[date] = Field(None, description="Start date for bank transaction imports")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
