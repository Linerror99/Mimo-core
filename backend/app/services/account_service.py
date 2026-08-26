"""
Account Service

Business logic for account management
"""
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Account
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
    async def close_account(
        db: AsyncSession,
        account: Account
    ) -> Account:
        """
        Close an account (soft delete)

        Sets is_active to False and closed_at to current timestamp.
        Preserves all transaction history.
        """
        from datetime import datetime

        account.is_active = "false"
        account.closed_at = datetime.utcnow()

        await db.commit()
        await db.refresh(account)

        return account

    @staticmethod
    async def calculate_balance(
        db: AsyncSession,
        account_id: str
    ) -> Decimal:
        """Calculate current account balance (initial + realized transactions up to today, including incoming transfers)"""
        from datetime import date
        from app.models.transaction import Transaction, TransactionState, TransactionType

        account = await db.get(Account, account_id)
        if not account:
            return Decimal("0")

        today = date.today()

        # 1. Transactions où le compte est le compte principal (EXPENSE, INCOME, et compte source pour TRANSFER)
        outgoing_and_incomes_res = await db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0))
            .where(
                Transaction.account_id == account_id,
                Transaction.deleted_at.is_(None),
                Transaction.state == TransactionState.REALIZED,
                Transaction.transaction_date <= today
            )
        )
        outgoing_and_incomes = outgoing_and_incomes_res.scalar_one()

        # 2. Virements entrants où le compte est le compte de destination (destination_account_id)
        # Sur le compte destination, on crédite la valeur absolue du montant du virement
        incoming_transfers_res = await db.execute(
            select(func.coalesce(func.sum(func.abs(Transaction.amount)), 0))
            .where(
                Transaction.destination_account_id == account_id,
                Transaction.type == TransactionType.TRANSFER,
                Transaction.deleted_at.is_(None),
                Transaction.state == TransactionState.REALIZED,
                Transaction.transaction_date <= today
            )
        )
        incoming_transfers = incoming_transfers_res.scalar_one()

        # Balance = initial_balance + outgoing_and_incomes + incoming_transfers
        return account.initial_balance + Decimal(str(outgoing_and_incomes)) + Decimal(str(incoming_transfers))
