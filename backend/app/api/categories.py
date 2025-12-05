"""
Category API endpoints
"""
from typing import Annotated, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import CurrentUser
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.services.category_service import CategoryService
from app.models import CategoryType


router = APIRouter(prefix="/categories", tags=["categories"])


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_category(
    category_data: CategoryCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Create a new category for the current user's household.
    
    - **name**: Category name (required)
    - **type**: INCOME or EXPENSE (required)
    - **icon**: Emoji or icon identifier (optional)
    - **color**: Hex color code (optional)
    - **parent_id**: Parent category ID for subcategories (optional)
    """
    service = CategoryService()
    category = await service.create_category(
        db=db,
        household_id=current_user.household_id,
        category_data=category_data
    )
    
    return category


@router.get("", response_model=List[CategoryResponse])
async def list_categories(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    type: Optional[CategoryType] = Query(None, description="Filter by category type (INCOME or EXPENSE)"),
    parent_id: Optional[str] = Query(None, description="Filter by parent category ID")
):
    """
    List all categories for the current user's household.
    
    Query Parameters:
    - **type**: Filter by INCOME or EXPENSE
    - **parent_id**: Filter by parent category (to get subcategories)
    """
    service = CategoryService()
    categories = await service.list_categories(
        db=db,
        household_id=current_user.household_id,
        category_type=type,
        parent_id=parent_id
    )
    
    return categories


@router.get("/tree", response_model=List[dict])
async def get_category_tree(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    type: Optional[CategoryType] = Query(None, description="Filter by category type")
):
    """
    Get categories organized as a tree structure with children nested.
    
    Returns root categories with their subcategories nested recursively.
    """
    service = CategoryService()
    tree = await service.get_category_tree(
        db=db,
        household_id=current_user.household_id,
        category_type=type
    )
    
    return tree


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: str,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Get a specific category by ID.
    
    Only returns categories belonging to the current user's household.
    """
    service = CategoryService()
    category = await service.get_category_by_id(
        db=db,
        category_id=category_id,
        household_id=current_user.household_id
    )
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    return category


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    update_data: CategoryUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Update a category.
    
    Only fields provided in the request will be updated.
    Can only update categories belonging to the current user's household.
    """
    service = CategoryService()
    
    # Get existing category
    category = await service.get_category_by_id(
        db=db,
        category_id=category_id,
        household_id=current_user.household_id
    )
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Update category
    updated_category = await service.update_category(
        db=db,
        category=category,
        update_data=update_data
    )
    
    return updated_category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Delete a category.
    
    Can only delete categories belonging to the current user's household.
    Subcategories will be handled according to cascade rules.
    """
    service = CategoryService()
    
    # Get existing category
    category = await service.get_category_by_id(
        db=db,
        category_id=category_id,
        household_id=current_user.household_id
    )
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Delete category
    await service.delete_category(db=db, category=category)
    
    return None
