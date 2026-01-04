"""Tests unitaires pour Sprint 5: TransactionService - Validation & Report

Tests des méthodes du service sans appel API (pas de Redis, pas de dépendances HTTP).
"""

from datetime import date, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction, TransactionState, TransactionType
from app.services.transaction_service import TransactionService


@pytest.mark.asyncio
async def test_list_pending_transactions_service(
    db_session: AsyncSession,
    test_household,
    test_account
):
    """Test récupération des transactions PENDING pour un household"""
    service = TransactionService(db_session)
    today = date.today()

    tx_pending1 = Transaction(
        household_id=test_household.id,
        account_id=test_account.id,
        amount=-100.0,
        type=TransactionType.EXPENSE,
        transaction_date=today,
        state=TransactionState.PENDING,
        description="Pending 1"
    )
    tx_pending2 = Transaction(
        household_id=test_household.id,
        account_id=test_account.id,
        amount=-200.0,
        type=TransactionType.EXPENSE,
        transaction_date=today,
        state=TransactionState.PENDING,
        description="Pending 2"
    )
    tx_realized = Transaction(
        household_id=test_household.id,
        account_id=test_account.id,
        amount=-50.0,
        type=TransactionType.EXPENSE,
        transaction_date=today,
        state=TransactionState.REALIZED,
        description="Realized"
    )

    db_session.add(tx_pending1)
    db_session.add(tx_pending2)
    db_session.add(tx_realized)
    await db_session.commit()

    # Récupérer les transactions PENDING
    pending_txs = await service.list_pending_transactions(test_household.id)

    assert len(pending_txs) == 2
    descriptions = {tx.description for tx in pending_txs}
    assert "Pending 1" in descriptions
    assert "Pending 2" in descriptions


@pytest.mark.asyncio
async def test_validate_transaction_service(
    db_session: AsyncSession,
    test_household,
    test_account
):
    """Test service method validate_transaction"""
    service = TransactionService(db_session)
    today = date.today()

    tx = Transaction(
        household_id=test_household.id,
        account_id=test_account.id,
        amount=-100.0,
        type=TransactionType.EXPENSE,
        transaction_date=today,
        state=TransactionState.PENDING,
        description="To validate"
    )
    db_session.add(tx)
    await db_session.commit()
    tx_id = tx.id

    # Valider la transaction
    validated = await service.validate_transaction(tx_id, test_household.id)

    assert validated is not None
    assert validated.id == tx_id
    assert validated.state == TransactionState.REALIZED


@pytest.mark.asyncio
async def test_validate_transaction_with_new_amount(
    db_session: AsyncSession,
    test_household,
    test_account
):
    """Test validate_transaction avec modification du montant"""
    service = TransactionService(db_session)
    today = date.today()

    tx = Transaction(
        household_id=test_household.id,
        account_id=test_account.id,
        amount=-100.0,
        type=TransactionType.EXPENSE,
        transaction_date=today,
        state=TransactionState.PENDING,
        description="To validate with new amount"
    )
    db_session.add(tx)
    await db_session.commit()
    tx_id = tx.id

    # Valider avec nouveau montant
    validated = await service.validate_transaction(
        tx_id,
        test_household.id,
        new_amount=-150.0
    )

    assert validated is not None
    assert validated.amount == -150.0
    assert validated.state == TransactionState.REALIZED


@pytest.mark.asyncio
async def test_postpone_transaction_service(
    db_session: AsyncSession,
    test_household,
    test_account
):
    """Test service method postpone_transaction

    Comportement attendu : une transaction reportée passe à PROJECTED
    car elle a maintenant une date future.
    """
    service = TransactionService(db_session)
    today = date.today()

    tx = Transaction(
        household_id=test_household.id,
        account_id=test_account.id,
        amount=-100.0,
        type=TransactionType.EXPENSE,
        transaction_date=today,
        state=TransactionState.PENDING,
        description="To postpone"
    )
    db_session.add(tx)
    await db_session.commit()
    tx_id = tx.id

    # Reporter la transaction
    new_date = today + timedelta(days=7)
    postponed = await service.postpone_transaction(tx_id, test_household.id, new_date)

    assert postponed is not None
    assert postponed.transaction_date == new_date
    # Comme la date est future, l'état devient PROJECTED
    assert postponed.state == TransactionState.PROJECTED
