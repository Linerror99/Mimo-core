"""Household schemas for request/response validation."""
from datetime import datetime
from pydantic import BaseModel, Field

from app.models import HouseholdType


class HouseholdCreate(BaseModel):
    """Schema for creating a household."""
    name: str = Field(..., min_length=1, max_length=100, description="Household name")
    type: HouseholdType = Field(..., description="Household type (INDIVIDUAL or COUPLE)")


class HouseholdUpdate(BaseModel):
    """Schema for updating a household."""
    name: str | None = Field(None, min_length=1, max_length=100, description="Household name")
    type: HouseholdType | None = Field(None, description="Household type (INDIVIDUAL or COUPLE)")


class HouseholdResponse(BaseModel):
    """Schema for household data in responses."""
    id: int
    name: str
    type: HouseholdType
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
