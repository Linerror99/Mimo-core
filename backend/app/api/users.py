"""
User profile management API endpoints
"""
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.auth import UserResponse, UserUpdate, PasswordChange
from app.api.deps import CurrentUser
from app.services.auth_service import AuthService
from app.services.storage_service import StorageService


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Get current authenticated user profile with is_in_couple status.
    
    Requires: Bearer token in Authorization header
    """
    from app.models import Household, User
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    
    # Calculate is_in_couple by loading household with members
    is_in_couple = False
    if current_user.household_id:
        stmt = select(Household).where(
            Household.id == current_user.household_id
        ).options(selectinload(Household.members))
        result = await db.execute(stmt)
        household = result.scalar_one_or_none()
        if household and len(household.members) >= 2:
            is_in_couple = True
    
    # Return user with calculated field
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        is_active=current_user.is_active,
        household_id=current_user.household_id,
        avatar_url=current_user.avatar_url,
        created_at=current_user.created_at,
        is_in_couple=is_in_couple
    )


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


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...)
):
    """
    Upload or update user avatar
    
    - **file**: Image file (JPEG, PNG, JPG, WEBP)
    - **Max size**: 5MB
    
    Returns updated user profile with new avatar URL.
    
    Requires: Bearer token in Authorization header
    """
    storage_service = StorageService()
    
    try:
        # Upload avatar (supprime l'ancien si existe)
        if current_user.avatar_url:
            await storage_service.delete_avatar(current_user.avatar_url)
        
        avatar_url = await storage_service.upload_avatar(file, current_user.id)
        
        # Mettre à jour l'utilisateur
        current_user.avatar_url = avatar_url
        await db.commit()
        await db.refresh(current_user)
        
        return current_user
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'upload de l'avatar: {str(e)}"
        )


@router.delete("/me/avatar", status_code=status.HTTP_204_NO_CONTENT)
async def delete_avatar(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Delete user avatar
    
    Removes avatar file and clears avatar_url in database.
    
    Requires: Bearer token in Authorization header
    """
    if not current_user.avatar_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun avatar à supprimer"
        )
    
    storage_service = StorageService()
    
    try:
        # Supprimer le fichier
        storage_service.delete_avatar(current_user.avatar_url)
        
        # Mettre à jour l'utilisateur
        current_user.avatar_url = None
        await db.commit()
        
        return None
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la suppression de l'avatar: {str(e)}"
        )
