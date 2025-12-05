"""
User profile management API endpoints
"""
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.auth import UserResponse, UserUpdate, PasswordChange
from app.api.deps import CurrentUser
from app.services.auth_service import AuthService


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: CurrentUser):
    """
    Get current authenticated user profile.
    
    Requires: Bearer token in Authorization header
    """
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Update current user's profile information.
    
    - **first_name**: New first name (optional)
    - **last_name**: New last name (optional)
    
    Requires: Bearer token in Authorization header
    """
    # Update fields if provided
    if user_update.first_name is not None:
        current_user.first_name = user_update.first_name
    if user_update.last_name is not None:
        current_user.last_name = user_update.last_name
    
    await db.commit()
    await db.refresh(current_user)
    
    return current_user


@router.patch("/me/password")
async def change_password(
    password_data: PasswordChange,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Change current user's password.
    
    - **old_password**: Current password
    - **new_password**: New password (min 8 chars with uppercase, lowercase, number)
    
    Requires: Bearer token in Authorization header
    """
    auth_service = AuthService(db)
    
    # Verify old password
    if not auth_service.verify_password(password_data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Old password is incorrect"
        )
    
    # Hash and update new password
    current_user.password_hash = auth_service.hash_password(password_data.new_password)
    await db.commit()
    
    return {"message": "Password updated successfully"}
