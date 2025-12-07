import pytest
import asyncio
from typing import AsyncGenerator, Generator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch

from app.main import app
from app.database import Base, get_db
from app.config import settings

# Utilise la même DB mais avec isolation par test (drop/create tables)
TEST_DATABASE_URL = settings.DATABASE_URL.replace(
    "postgresql://", "postgresql+asyncpg://"
)

# Engine de test
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    poolclass=NullPool,
    echo=False,
)

# Session factory de test
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function", autouse=True)
def mock_redis():
    """Mock Redis client pour tous les tests."""
    mock = AsyncMock()
    # Mock des méthodes Redis utilisées dans auth_service
    mock.get = AsyncMock(return_value=None)  # Token pas blacklisté par défaut
    mock.setex = AsyncMock(return_value=True)
    
    with patch("app.services.auth_service.redis_client", mock):
        yield mock


@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for each test."""
    # Créer les tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Créer une session
    async with TestSessionLocal() as session:
        yield session
    
    # Nettoyer après le test
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client with overridden database dependency."""
    
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def test_user_token(client: AsyncClient, db_session: AsyncSession) -> str:
    """Create a test user and return authentication token."""
    # Register a test user
    register_data = {
        "email": "test@example.com",
        "password": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User"
    }
    
    register_response = await client.post("/api/v1/auth/register", json=register_data)
    assert register_response.status_code == 201
    
    # Login to get token
    login_data = {
        "email": "test@example.com",
        "password": "TestPassword123!"
    }
    
    login_response = await client.post("/api/v1/auth/login", json=login_data)
    assert login_response.status_code == 200
    
    token_data = login_response.json()
    return token_data["access_token"]


@pytest.fixture(scope="function")
async def test_user_household_id(client: AsyncClient, test_user_token: str) -> str:
    """Get the household ID of the test user."""
    response = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 200
    
    user_data = response.json()
    return user_data["household_id"]


@pytest.fixture(scope="function")
async def test_household_id(db_session: AsyncSession) -> str:
    """Create a test household and return its ID."""
    from app.models.household import Household, HouseholdType
    
    household = Household(
        name="Test Household",
        type=HouseholdType.INDIVIDUAL
    )
    db_session.add(household)
    await db_session.commit()
    await db_session.refresh(household)
    
    return household.id


@pytest.fixture(scope="function")
async def test_account_id(db_session: AsyncSession, test_household_id: str) -> str:
    """Create a test account and return its ID."""
    from app.models.account import Account, AccountType
    from decimal import Decimal
    
    account = Account(
        household_id=test_household_id,
        name="Test Account",
        type=AccountType.CHECKING,
        initial_balance=Decimal("1000.00"),
        currency="EUR",
        is_active="true"
    )
    db_session.add(account)
    await db_session.commit()
    await db_session.refresh(account)
    
    return account.id


@pytest.fixture(scope="function")
async def test_account2_id(db_session: AsyncSession, test_household_id: str) -> str:
    """Create a second test account for transfer tests."""
    from app.models.account import Account, AccountType
    from decimal import Decimal
    
    account = Account(
        household_id=test_household_id,
        name="Test Account 2",
        type=AccountType.SAVINGS,
        initial_balance=Decimal("500.00"),
        currency="EUR",
        is_active="true"
    )
    db_session.add(account)
    await db_session.commit()
    await db_session.refresh(account)
    
    return account.id


@pytest.fixture(scope="function")
async def test_category_income_id(db_session: AsyncSession, test_household_id: str) -> str:
    """Create a test income category and return its ID."""
    from app.models.category import Category, CategoryType
    
    category = Category(
        household_id=test_household_id,
        name="Test Income",
        type=CategoryType.INCOME,
        icon="💰",
        color="#00FF00"
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)
    
    return category.id


@pytest.fixture(scope="function")
async def test_category_expense_id(db_session: AsyncSession, test_household_id: str) -> str:
    """Create a test expense category and return its ID."""
    from app.models.category import Category, CategoryType
    
    category = Category(
        household_id=test_household_id,
        name="Test Expense",
        type=CategoryType.EXPENSE,
        icon="🛒",
        color="#FF0000"
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)
    
    return category.id


@pytest.fixture(scope="function")
async def test_transaction(
    db_session: AsyncSession, 
    test_household_id: str,
    test_account_id: str,
    test_category_expense_id: str
):
    """Create a test transaction."""
    from app.models.transaction import Transaction, TransactionType, RecurrenceFrequency
    from datetime import date
    from decimal import Decimal
    
    transaction = Transaction(
        household_id=test_household_id,
        account_id=test_account_id,
        category_id=test_category_expense_id,
        description="Test Transaction",
        amount=Decimal("-100.00"),
        transaction_date=date.today(),
        type=TransactionType.EXPENSE,
        recurrence_frequency=RecurrenceFrequency.NONE
    )
    db_session.add(transaction)
    await db_session.commit()
    await db_session.refresh(transaction)
    
    return transaction


@pytest.fixture(scope="function")
async def test_user(db_session: AsyncSession, test_household_id: str):
    """Create a test user object."""
    from app.models.user import User
    
    user = User(
        first_name="Test",
        last_name="User",
        email="testuser@example.com",
        password_hash="hashed_password",
        household_id=test_household_id
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    return user


@pytest.fixture(scope="function")
async def test_household(db_session: AsyncSession, test_household_id: str):
    """Get test household object."""
    from sqlalchemy import select
    from app.models.household import Household
    
    result = await db_session.execute(
        select(Household).where(Household.id == test_household_id)
    )
    return result.scalar_one()


@pytest.fixture(scope="function")
async def test_account(db_session: AsyncSession, test_account_id: str):
    """Get test account object."""
    from sqlalchemy import select
    from app.models.account import Account
    
    result = await db_session.execute(
        select(Account).where(Account.id == test_account_id)
    )
    return result.scalar_one()


@pytest.fixture(scope="function")
async def test_user_headers(test_user_token: str) -> dict:
    """Get authorization headers for test user."""
    return {"Authorization": f"Bearer {test_user_token}"}

