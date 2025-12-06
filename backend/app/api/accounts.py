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
    
    # Ajouter le current_balance
    current_balance = await AccountService.calculate_balance(db=db, account_id=account.id)
    account_dict = {
        "id": account.id,
        "household_id": account.household_id,
        "name": account.name,
        "type": account.type,
        "initial_balance": account.initial_balance,
        "currency": account.currency,
        "is_active": account.is_active == "true",
        "current_balance": current_balance,
        "closed_at": account.closed_at,
        "created_at": account.created_at,
        "updated_at": account.updated_at
    }
    
    return account_dict


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
    
    # Ajouter le current_balance pour chaque compte
    accounts_with_balance = []
    for account in accounts:
        current_balance = await AccountService.calculate_balance(db=db, account_id=account.id)
        account_dict = {
            "id": account.id,
            "household_id": account.household_id,
            "name": account.name,
            "type": account.type,
            "initial_balance": account.initial_balance,
            "currency": account.currency,
            "is_active": account.is_active == "true",
            "current_balance": current_balance,
            "closed_at": account.closed_at,
            "created_at": account.created_at,
            "updated_at": account.updated_at
        }
        accounts_with_balance.append(account_dict)
    
    return accounts_with_balance


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
    
    # Ajouter le current_balance
    current_balance = await AccountService.calculate_balance(db=db, account_id=account.id)
    account_dict = {
        "id": account.id,
        "household_id": account.household_id,
        "name": account.name,
        "type": account.type,
        "initial_balance": account.initial_balance,
        "currency": account.currency,
        "is_active": account.is_active == "true",
        "current_balance": current_balance,
        "closed_at": account.closed_at,
        "created_at": account.created_at,
        "updated_at": account.updated_at
    }
    
    return account_dict


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
    
    # Ajouter le current_balance
    current_balance = await AccountService.calculate_balance(db=db, account_id=updated_account.id)
    account_dict = {
        "id": updated_account.id,
        "household_id": updated_account.household_id,
        "name": updated_account.name,
        "type": updated_account.type,
        "initial_balance": updated_account.initial_balance,
        "currency": updated_account.currency,
        "is_active": updated_account.is_active == "true",
        "current_balance": current_balance,
        "created_at": updated_account.created_at,
        "updated_at": updated_account.updated_at
    }
    
    return account_dict


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Close an account (soft delete)
    
    Sets is_active=false and closed_at=now(). Preserves transaction history.
    """
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
    
    await AccountService.close_account(db=db, account=account)
    
    return None


@router.get("/balance/total")
async def get_total_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Récupérer le solde total du household (tous comptes actifs).
    Solde = solde initial + toutes transactions réalisées jusqu'à aujourd'hui.
    """
    if not current_user.household_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a household"
        )
    
    # Récupérer tous les comptes actifs
    accounts = await AccountService.list_accounts(
        db=db,
        household_id=current_user.household_id,
        include_inactive=False
    )
    
    # Calculer le solde total
    total_balance = 0.0
    accounts_detail = []
    
    for account in accounts:
        balance = await AccountService.calculate_balance(db=db, account_id=account.id)
        total_balance += float(balance)
        accounts_detail.append({
            "id": account.id,
            "name": account.name,
            "type": account.type,
            "initial_balance": float(account.initial_balance),
            "current_balance": float(balance)
        })
    
    return {
        "total_balance": total_balance,
        "accounts_count": len(accounts),
        "accounts": accounts_detail
    }
