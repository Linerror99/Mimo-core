"""
Account API Routes

CRUD endpoints for accounts
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse
from app.services.account_service import AccountService
from app.api.deps import get_current_user
from app.models import User

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    account_data: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new account"""
    if not current_user.household_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a household"
        )
    
    account = await AccountService.create_account(
        db=db,
        household_id=current_user.household_id,
        account_data=account_data
    )
    
    return account


@router.get("", response_model=List[AccountResponse])
async def list_accounts(
    include_inactive: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all accounts for current user's household"""
    if not current_user.household_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a household"
        )
    
    accounts = await AccountService.list_accounts(
        db=db,
        household_id=current_user.household_id,
        include_inactive=include_inactive
    )
    
    return accounts


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific account by ID"""
    if not current_user.household_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a household"
        )
    
    account = await AccountService.get_account_by_id(
        db=db,
        account_id=account_id,
        household_id=current_user.household_id
    )
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    return account


@router.patch("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: str,
    update_data: AccountUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update an account"""
    if not current_user.household_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a household"
        )
    
    account = await AccountService.get_account_by_id(
        db=db,
        account_id=account_id,
        household_id=current_user.household_id
    )
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    updated_account = await AccountService.update_account(
        db=db,
        account=account,
        update_data=update_data
    )
    
    return updated_account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an account"""
    if not current_user.household_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a household"
        )
    
    account = await AccountService.get_account_by_id(
        db=db,
        account_id=account_id,
        household_id=current_user.household_id
    )
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    await AccountService.delete_account(db=db, account=account)
    
    return None
