"""
Tests pour les notifications créées lors de la création de transactions PENDING
"""
import pytest
from datetime import date
from sqlalchemy import select

from app.models.user import User
from app.models.household import Household
from app.models.account import Account, AccountType
from app.models.category import Category, CategoryType
from app.models.transaction import Transaction, TransactionType, TransactionState
from app.models.notification import Notification, NotificationType
from app.schemas.transaction import TransactionCreate
from app.services.transaction_service import TransactionService


@pytest.mark.asyncio
async def test_create_transaction_today_creates_notification(db_session):
    """Test que créer une transaction pour aujourd'hui crée des notifications PENDING"""
    # Créer un user
    user = User(
        email="test@example.com",
        first_name="Test",
        last_name="User",
        password_hash="hashedpass"
    )
    db_session.add(user)
    await db_session.commit()
    
    # Créer un household
    household = Household(
        name="Test Household"
    )
    db_session.add(household)
    await db_session.commit()
    
    # Ajouter le user au household
    user.household_id = household.id
    await db_session.commit()
    
    # Créer un account
    account = Account(
        household_id=household.id,
        name="Test Account",
        type=AccountType.CHECKING,
        initial_balance=1000.0
    )
    db_session.add(account)
    await db_session.commit()
    
    # Créer une catégorie
    category = Category(
        household_id=household.id,
        name="Test Category",
        type=CategoryType.EXPENSE
    )
    db_session.add(category)
    await db_session.commit()
    
    # Créer une transaction pour aujourd'hui
    service = TransactionService(db_session)
    transaction_data = TransactionCreate(
        account_id=account.id,
        category_id=category.id,
        description="Transaction du jour",
        amount=50.0,
        transaction_date=date.today(),
        type=TransactionType.EXPENSE
    )
    
    transaction = await service.create_transaction(
        household_id=household.id,
        transaction_data=transaction_data
    )
    
    # Vérifier que la transaction est PENDING
    assert transaction.state == TransactionState.PENDING
    
    # Vérifier qu'une notification a été créée pour l'utilisateur
    result = await db_session.execute(
        select(Notification).where(Notification.user_id == user.id)
    )
    notifications = result.scalars().all()
    
    assert len(notifications) == 1
    notification = notifications[0]
    assert notification.type == NotificationType.VALIDATION_REQUIRED
    assert notification.data["transaction_id"] == transaction.id
    assert notification.is_read is False
    assert "Transaction du jour" in notification.message


@pytest.mark.asyncio
async def test_create_transaction_past_no_notification(db_session):
    """Test que créer une transaction passée ne crée PAS de notification"""
    # Créer un user
    user = User(
        email="test2@example.com",
        first_name="Test2",
        last_name="User",
        password_hash="hashedpass"
    )
    db_session.add(user)
    await db_session.commit()
    
    # Créer un household
    household = Household(
        name="Test Household 2"
    )
    db_session.add(household)
    await db_session.commit()
    
    # Ajouter le user au household
    user.household_id = household.id
    await db_session.commit()
    
    # Créer un account
    account = Account(
        household_id=household.id,
        name="Test Account 2",
        type=AccountType.CHECKING,
        initial_balance=1000.0
    )
    db_session.add(account)
    await db_session.commit()
    
    # Créer une catégorie
    category = Category(
        household_id=household.id,
        name="Test Category 2",
        type=CategoryType.EXPENSE
    )
    db_session.add(category)
    await db_session.commit()
    
    # Créer une transaction dans le passé (hier)
    from datetime import timedelta
    yesterday = date.today() - timedelta(days=1)
    
    service = TransactionService(db_session)
    transaction_data = TransactionCreate(
        account_id=account.id,
        category_id=category.id,
        description="Transaction d'hier",
        amount=50.0,
        transaction_date=yesterday,
        type=TransactionType.EXPENSE
    )
    
    transaction = await service.create_transaction(
        household_id=household.id,
        transaction_data=transaction_data
    )
    
    # Vérifier que la transaction est REALIZED
    assert transaction.state == TransactionState.REALIZED
    
    # Vérifier qu'AUCUNE notification n'a été créée
    result = await db_session.execute(
        select(Notification).where(Notification.user_id == user.id)
    )
    notifications = result.scalars().all()
    
    assert len(notifications) == 0


@pytest.mark.asyncio
async def test_create_transaction_future_no_notification(db_session):
    """Test que créer une transaction future ne crée PAS de notification"""
    # Créer un user
    user = User(
        email="test3@example.com",
        first_name="Test3",
        last_name="User",
        password_hash="hashedpass"
    )
    db_session.add(user)
    await db_session.commit()
    
    # Créer un household
    household = Household(
        name="Test Household 3"
    )
    db_session.add(household)
    await db_session.commit()
    
    # Ajouter le user au household
    user.household_id = household.id
    await db_session.commit()
    
    # Créer un account
    account = Account(
        household_id=household.id,
        name="Test Account 3",
        type=AccountType.CHECKING,
        initial_balance=1000.0
    )
    db_session.add(account)
    await db_session.commit()
    
    # Créer une catégorie
    category = Category(
        household_id=household.id,
        name="Test Category 3",
        type=CategoryType.EXPENSE
    )
    db_session.add(category)
    await db_session.commit()
    
    # Créer une transaction dans le futur (demain)
    from datetime import timedelta
    tomorrow = date.today() + timedelta(days=1)
    
    service = TransactionService(db_session)
    transaction_data = TransactionCreate(
        account_id=account.id,
        category_id=category.id,
        description="Transaction de demain",
        amount=50.0,
        transaction_date=tomorrow,
        type=TransactionType.EXPENSE
    )
    
    transaction = await service.create_transaction(
        household_id=household.id,
        transaction_data=transaction_data
    )
    
    # Vérifier que la transaction est PROJECTED
    assert transaction.state == TransactionState.PROJECTED
    
    # Vérifier qu'AUCUNE notification n'a été créée
    result = await db_session.execute(
        select(Notification).where(Notification.user_id == user.id)
    )
    notifications = result.scalars().all()
    
    assert len(notifications) == 0


@pytest.mark.asyncio
async def test_create_transaction_today_multiple_members(db_session):
    """Test que créer une transaction PENDING crée une notification par membre du foyer"""
    # Créer deux users
    user1 = User(
        email="user1@example.com",
        first_name="User",
        last_name="One",
        password_hash="hashedpass"
    )
    user2 = User(
        email="user2@example.com",
        first_name="User",
        last_name="Two",
        password_hash="hashedpass"
    )
    db_session.add_all([user1, user2])
    await db_session.commit()
    
    # Créer un household
    household = Household(
        name="Multi Member Household"
    )
    db_session.add(household)
    await db_session.commit()
    
    # Ajouter les deux users au household
    user1.household_id = household.id
    user2.household_id = household.id
    await db_session.commit()
    
    # Créer un account
    account = Account(
        household_id=household.id,
        name="Shared Account",
        type=AccountType.CHECKING,
        initial_balance=1000.0
    )
    db_session.add(account)
    await db_session.commit()
    
    # Créer une catégorie
    category = Category(
        household_id=household.id,
        name="Shared Category",
        type=CategoryType.EXPENSE
    )
    db_session.add(category)
    await db_session.commit()
    
    # Créer une transaction pour aujourd'hui
    service = TransactionService(db_session)
    transaction_data = TransactionCreate(
        account_id=account.id,
        category_id=category.id,
        description="Transaction partagée",
        amount=100.0,
        transaction_date=date.today(),
        type=TransactionType.EXPENSE
    )
    
    transaction = await service.create_transaction(
        household_id=household.id,
        transaction_data=transaction_data
    )
    
    # Vérifier que la transaction est PENDING
    assert transaction.state == TransactionState.PENDING
    
    # Vérifier qu'une notification a été créée pour CHAQUE membre
    result = await db_session.execute(select(Notification))
    all_notifications = result.scalars().all()
    
    assert len(all_notifications) == 2
    
    # Vérifier user1
    result = await db_session.execute(
        select(Notification).where(Notification.user_id == user1.id)
    )
    user1_notifications = result.scalars().all()
    assert len(user1_notifications) == 1
    assert user1_notifications[0].data["transaction_id"] == transaction.id
    
    # Vérifier user2
    result = await db_session.execute(
        select(Notification).where(Notification.user_id == user2.id)
    )
    user2_notifications = result.scalars().all()
    assert len(user2_notifications) == 1
    assert user2_notifications[0].data["transaction_id"] == transaction.id
