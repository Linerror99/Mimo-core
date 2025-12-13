"""
Category Schemas

Pydantic models for Category API
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.category import CategoryType


class CategoryBase(BaseModel):
    """Base category schema"""
    name: str = Field(..., min_length=1, max_length=100, description="Category name")
    type: CategoryType = Field(..., description="Category type (INCOME or EXPENSE)")
    icon: Optional[str] = Field(None, max_length=50, description="Icon emoji or name")
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$", description="Hex color code")
    parent_id: Optional[str] = Field(None, description="Parent category ID for subcategories")


class CategoryCreate(CategoryBase):
    """Schema for creating a category"""
    pass


class CategoryUpdate(BaseModel):
    """Schema for updating a category"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    icon: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    parent_id: Optional[str] = None


class CategoryResponse(CategoryBase):
    """Schema for category response"""
    id: str
    household_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
