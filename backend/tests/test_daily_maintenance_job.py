"""
Tests for DailyMaintenanceJob

Tests unitaires pour le job de maintenance quotidien.
"""
from datetime import date, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Transaction, TransactionState, TransactionType, User
from app.services.daily_maintenance_job import DailyMaintenanceJob


@pytest.mark.asyncio
async def test_mark_transactions_pending_today(
    db_session: AsyncSession,
    test_user,
    test_household,
    test_account
):
    """Test que les transactions d'aujourd'hui passent à PENDING"""
    today = date.today()

    # Créer 2 transactions PROJECTED pour aujourd'hui
    tx1 = Transaction(
        household_id=test_household.id,
        account_id=test_account.id,
        amount=-100.0,
        type=TransactionType.EXPENSE,
        transaction_date=today,
        state=TransactionState.PROJECTED,
        description="Transaction 1"
    )
    tx2 = Transaction(
        household_id=test_household.id,
        account_id=test_account.id,
        amount=-200.0,
        type=TransactionType.EXPENSE,
        transaction_date=today,
        state=TransactionState.PROJECTED,
        description="Transaction 2"
    )

    db_session.add(tx1)
    db_session.add(tx2)
    await db_session.commit()

    # Exécuter le job
    stats = await DailyMaintenanceJob.run(db=db_session)

    assert stats["transactions_marked_pending"] == 2
    assert stats["notifications_created"] == 2  # 1 pour chaque transaction, 1 membre

    # Vérifier que les transactions sont maintenant PENDING
    await db_session.refresh(tx1)
    await db_session.refresh(tx2)

    assert tx1.state == TransactionState.PENDING
    assert tx2.state == TransactionState.PENDING


@pytest.mark.asyncio
async def test_no_mark_if_not_today(
    db_session: AsyncSession,
    test_household,
    test_account
):
    """Test que les transactions futures ou passées ne sont pas marquées PENDING"""
    today = date.today()
    tomorrow = today + timedelta(days=1)
    yesterday = today - timedelta(days=1)

    # Transaction future
    tx_future = Transaction(
        household_id=test_household.id,
        account_id=test_account.id,
        amount=-100.0,
        type=TransactionType.EXPENSE,
        transaction_date=tomorrow,
        state=TransactionState.PROJECTED,
        description="Future"
    )

    # Transaction passée
    tx_past = Transaction(
        household_id=test_household.id,
        account_id=test_account.id,
        amount=-100.0,
        type=TransactionType.EXPENSE,
        transaction_date=yesterday,
        state=TransactionState.REALIZED,
        description="Past"
    )

    db_session.add(tx_future)
    db_session.add(tx_past)
    await db_session.commit()

    # Exécuter le job
    stats = await DailyMaintenanceJob.run(db=db_session)

    assert stats["transactions_marked_pending"] == 0

    # Vérifier que les états n'ont pas changé
    await db_session.refresh(tx_future)
    await db_session.refresh(tx_past)

    assert tx_future.state == TransactionState.PROJECTED
    assert tx_past.state == TransactionState.REALIZED


@pytest.mark.asyncio
async def test_cleanup_old_deleted_transactions(
    db_session: AsyncSession,
    test_household,
    test_account
):
    """Test que les transactions supprimées il y a >30 jours sont nettoyées"""
    today = datetime.utcnow()
    old_date = today - timedelta(days=35)
    recent_date = today - timedelta(days=10)

    # Transaction supprimée il y a 35 jours
    tx_old = Transaction(
        household_id=test_household.id,
        account_id=test_account.id,
        amount=-100.0,
        type=TransactionType.EXPENSE,
        transaction_date=date.today(),
        state=TransactionState.REALIZED,
        description="Old deleted",
        deleted_at=old_date
    )

    # Transaction supprimée il y a 10 jours
    tx_recent = Transaction(
        household_id=test_household.id,
        account_id=test_account.id,
        amount=-100.0,
        type=TransactionType.EXPENSE,
        transaction_date=date.today(),
        state=TransactionState.REALIZED,
        description="Recent deleted",
        deleted_at=recent_date
    )

    db_session.add(tx_old)
    db_session.add(tx_recent)
    await db_session.commit()

    old_id = tx_old.id
    recent_id = tx_recent.id

    # Exécuter le job
    stats = await DailyMaintenanceJob.run(db=db_session)

    assert stats["transactions_cleaned"] == 1

    # Vérifier que seule la vieille transaction a été supprimée
    from sqlalchemy import select
    result = await db_session.execute(
        select(Transaction).where(Transaction.id == old_id)
    )
    assert result.scalar_one_or_none() is None

    result = await db_session.execute(
        select(Transaction).where(Transaction.id == recent_id)
    )
    assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_preview_pending_transactions(
    db_session: AsyncSession,
    test_household,
    test_account
):
    """Test de la prévisualisation sans modification"""
    today = date.today()

    # Créer 3 transactions PROJECTED pour aujourd'hui
    for i in range(3):
        tx = Transaction(
            household_id=test_household.id,
            account_id=test_account.id,
            amount=-100.0 * (i + 1),
            type=TransactionType.EXPENSE,
            transaction_date=today,
            state=TransactionState.PROJECTED,
            description=f"Transaction {i}"
        )
        db_session.add(tx)

    await db_session.commit()

    # Prévisualiser
    preview = await DailyMaintenanceJob.preview_pending_transactions(db=db_session)

    assert preview["total_count"] == 3
    assert len(preview["preview"]) == 3
    assert preview["date"] == today.isoformat()

    # Vérifier que les transactions sont toujours PROJECTED
    from sqlalchemy import select
    result = await db_session.execute(
        select(Transaction).where(Transaction.transaction_date == today)
    )
    transactions = result.scalars().all()

    assert all(t.state == TransactionState.PROJECTED for t in transactions)


@pytest.mark.asyncio
async def test_notifications_created_for_all_household_members(
    db_session: AsyncSession,
    test_household,
    test_account,
    test_user  # Ajouter le premier user
):
    """Test que chaque membre du foyer reçoit une notification"""
    # Créer un deuxième utilisateur dans le foyer
    user2 = User(
        first_name="Sarah",
        last_name="Dupont",
        email="sarah@test.com",
        password_hash="hashed",
        household_id=test_household.id
    )
    db_session.add(user2)
    await db_session.commit()

    # Créer une transaction PROJECTED pour aujourd'hui
    today = date.today()
    tx = Transaction(
        household_id=test_household.id,
        account_id=test_account.id,
        amount=-100.0,
        type=TransactionType.EXPENSE,
        transaction_date=today,
        state=TransactionState.PROJECTED,
        description="Test transaction"
    )
    db_session.add(tx)
    await db_session.commit()

    # Exécuter le job
    stats = await DailyMaintenanceJob.run(db=db_session)

    # 2 notifications : 1 pour chaque membre
    assert stats["notifications_created"] == 2

    # Vérifier que les notifications existent
    from sqlalchemy import select

    from app.models import Notification
    result = await db_session.execute(
        select(Notification).where(Notification.household_id == test_household.id)
    )
    notifications = result.scalars().all()

    assert len(notifications) == 2
    user_ids = {n.user_id for n in notifications}
    assert len(user_ids) == 2  # 2 utilisateurs différents


@pytest.mark.asyncio
async def test_ignore_deleted_transactions(
    db_session: AsyncSession,
    test_household,
    test_account
):
    """Test que les transactions supprimées ne sont pas marquées PENDING"""
    today = date.today()

    # Transaction supprimée (deleted_at rempli)
    tx = Transaction(
        household_id=test_household.id,
        account_id=test_account.id,
        amount=-100.0,
        type=TransactionType.EXPENSE,
        transaction_date=today,
        state=TransactionState.PROJECTED,
        description="Deleted transaction",
        deleted_at=datetime.utcnow()
    )
    db_session.add(tx)
    await db_session.commit()

    # Exécuter le job
    stats = await DailyMaintenanceJob.run(db=db_session)

    assert stats["transactions_marked_pending"] == 0

    # Vérifier que l'état n'a pas changé
    await db_session.refresh(tx)
    assert tx.state == TransactionState.PROJECTED

