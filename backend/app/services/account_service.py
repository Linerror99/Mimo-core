"""
Account Service

Business logic for account management
"""
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Account, AccountType
from app.schemas.account import AccountCreate, AccountUpdate


class AccountService:
    """Service for managing accounts"""
    
    @staticmethod
    async def create_account(
        db: AsyncSession,
        household_id: str,
        account_data: AccountCreate
    ) -> Account:
        """Create a new account"""
        account = Account(
            household_id=household_id,
            name=account_data.name,
            type=account_data.type,
            initial_balance=account_data.initial_balance,
            currency=account_data.currency
        )
        
        db.add(account)
        await db.commit()
        await db.refresh(account)
        
        return account
    
    @staticmethod
    async def get_account_by_id(
        db: AsyncSession,
        account_id: str,
        household_id: str
    ) -> Optional[Account]:
        """Get account by ID (only if belongs to household)"""
        result = await db.execute(
            select(Account).where(
                Account.id == account_id,
                Account.household_id == household_id
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def list_accounts(
        db: AsyncSession,
        household_id: str,
        include_inactive: bool = False
    ) -> List[Account]:
        """List all accounts for a household"""
        query = select(Account).where(Account.household_id == household_id)
        
        if not include_inactive:
            query = query.where(Account.is_active == "true")
        
        result = await db.execute(query.order_by(Account.created_at.desc()))
        return list(result.scalars().all())
    
    @staticmethod
    async def update_account(
        db: AsyncSession,
        account: Account,
        update_data: AccountUpdate
    ) -> Account:
        """Update an account"""
        update_dict = update_data.model_dump(exclude_unset=True)
        
        for field, value in update_dict.items():
            if field == "is_active":
                # Convert bool to enum string
                setattr(account, field, "true" if value else "false")
            else:
                setattr(account, field, value)
        
        await db.commit()
        await db.refresh(account)
        
        return account
    
    @staticmethod
    async def delete_account(
        db: AsyncSession,
        account: Account
    ) -> None:
        """
        Delete an account
        
        Note: Will CASCADE delete all associated transactions due to 
        ondelete="CASCADE" on Transaction.account_id foreign key
        """
        from app.models.transaction import Transaction
        
        # Compter les transactions actives (non supprimées) liées à ce compte
        result = await db.execute(
            select(func.count(Transaction.id))
            .where(
                Transaction.account_id == account.id,
                Transaction.deleted_at.is_(None)
            )
        )
        active_transactions_count = result.scalar_one()
        
        # Compter les transactions de destination (virements entrants)
        result = await db.execute(
            select(func.count(Transaction.id))
            .where(
                Transaction.destination_account_id == account.id,
                Transaction.deleted_at.is_(None)
            )
        )
        destination_transactions_count = result.scalar_one()
        
        total_transactions = active_transactions_count + destination_transactions_count
        
        if total_transactions > 0:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400,
                detail=f"Impossible de supprimer ce compte : {total_transactions} transaction(s) active(s) y sont associées. Supprimez d'abord les transactions."
            )
        
        await db.delete(account)
        await db.commit()
    
    @staticmethod
    async def calculate_balance(
        db: AsyncSession,
        account_id: str
    ) -> Decimal:
        """Calculate current account balance (initial + transactions sum)"""
        from app.models.transaction import Transaction
        from sqlalchemy import func
        
        account = await db.get(Account, account_id)
        if not account:
            return Decimal("0")
        
        # Calculer la somme des transactions non supprimées pour ce compte
        result = await db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0))
            .where(
                Transaction.account_id == account_id,
                Transaction.deleted_at.is_(None)
            )
        )
        transactions_sum = result.scalar_one()
        
        # Balance = initial_balance + somme transactions
        return account.initial_balance + Decimal(str(transactions_sum))
