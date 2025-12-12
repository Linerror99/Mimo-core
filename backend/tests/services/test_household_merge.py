"""Tests pour HouseholdService.merge_households (Sprint 6 - Mode Couple)."""
from datetime import date

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Account,
    AccountType,
    Category,
    CategoryType,
    Household,
    HouseholdStatus,
    HouseholdType,
    Transaction,
    TransactionState,
    TransactionType,
    User,
)
from app.services.household_service import HouseholdService


@pytest.fixture
async def user1_with_data(db_session: AsyncSession) -> tuple[User, Household, Account]:
    """Créer user1 avec household, account et transactions."""
    # Household
    household = Household(
        id="household1_id",
        name="User One's Household",
        type=HouseholdType.INDIVIDUAL,
        status=HouseholdStatus.ACTIVE,
    )
    db_session.add(household)

    # User
    user = User(
        id="user1_id",
        email="user1@test.com",
        password_hash="hashed",
        first_name="User",
        last_name="One",
        household_id=household.id,
    )
    db_session.add(user)

    # Account
    account = Account(
        id="account1_id",
        household_id=household.id,
        name="User1 Checking",
        type=AccountType.CHECKING,
        initial_balance=1000.0,
    )
    db_session.add(account)

    # Category
    category = Category(
        id="category1_id",
        household_id=household.id,
        name="Groceries",
        type=CategoryType.EXPENSE,
    )
    db_session.add(category)

    # Transaction
    transaction = Transaction(
        id="transaction1_id",
        household_id=household.id,
        account_id=account.id,
        category_id=category.id,
        type=TransactionType.EXPENSE,
        amount=-50.0,
        transaction_date=date.today(),
        state=TransactionState.REALIZED,
        description="Test transaction user1",
    )
    db_session.add(transaction)

    await db_session.commit()
    await db_session.refresh(user)
    await db_session.refresh(household)
    await db_session.refresh(account)

    return user, household, account


@pytest.fixture
async def user2_with_data(db_session: AsyncSession) -> tuple[User, Household, Account]:
    """Créer user2 avec household, account et transactions."""
    # Household
    household = Household(
        id="household2_id",
        name="User Two's Household",
        type=HouseholdType.INDIVIDUAL,
        status=HouseholdStatus.ACTIVE,
    )
    db_session.add(household)

    # User
    user = User(
        id="user2_id",
        email="user2@test.com",
        password_hash="hashed",
        first_name="User",
        last_name="Two",
        household_id=household.id,
    )
    db_session.add(user)

    # Account
    account = Account(
        id="account2_id",
        household_id=household.id,
        name="User2 Savings",
        type=AccountType.SAVINGS,
        initial_balance=2000.0,
    )
    db_session.add(account)

    # Category
    category = Category(
        id="category2_id",
        household_id=household.id,
        name="Salary",
        type=CategoryType.INCOME,
    )
    db_session.add(category)

    # Transaction
    transaction = Transaction(
        id="transaction2_id",
        household_id=household.id,
        account_id=account.id,
        category_id=category.id,
        type=TransactionType.INCOME,
        amount=3000.0,
        transaction_date=date.today(),
        state=TransactionState.REALIZED,
        description="Test transaction user2",
    )
    db_session.add(transaction)

    await db_session.commit()
    await db_session.refresh(user)
    await db_session.refresh(household)
    await db_session.refresh(account)

    return user, household, account


@pytest.mark.asyncio
class TestHouseholdMerge:
    """Tests pour la fusion de households."""

    async def test_merge_households_success(
        self,
        db_session: AsyncSession,
        user1_with_data: tuple[User, Household, Account],
        user2_with_data: tuple[User, Household, Account],
    ):
        """Test: fusionner deux households INDIVIDUAL en COUPLE."""
        user1, household1, account1 = user1_with_data
        user2, household2, account2 = user2_with_data

        service = HouseholdService(db_session)

        # Fusionner
        new_household = await service.merge_households(
            household1_id=household1.id,
            household2_id=household2.id,
            new_household_name="Our Couple Household",
        )

        # Vérifier le nouveau household
        assert new_household.id is not None
        assert new_household.name == "Our Couple Household"
        assert new_household.type == HouseholdType.COUPLE
        assert new_household.status == HouseholdStatus.ACTIVE

        # Vérifier que les users ont été déplacés
        await db_session.refresh(user1)
        await db_session.refresh(user2)
        assert user1.household_id == new_household.id
        assert user2.household_id == new_household.id

        # Vérifier que les accounts ont été déplacés
        await db_session.refresh(account1)
        await db_session.refresh(account2)
        assert account1.household_id == new_household.id
        assert account2.household_id == new_household.id

        # Vérifier que les transactions ont été déplacées
        stmt = select(Transaction).where(Transaction.household_id == new_household.id)
        transactions = (await db_session.execute(stmt)).scalars().all()
        assert len(transactions) == 2

        # Vérifier que les categories ont été déplacées
        stmt = select(Category).where(Category.household_id == new_household.id)
        categories = (await db_session.execute(stmt)).scalars().all()
        assert len(categories) == 2

        # Vérifier que les anciens households sont marqués MERGED_INTO_COUPLE
        await db_session.refresh(household1)
        await db_session.refresh(household2)
        assert household1.status == HouseholdStatus.MERGED_INTO_COUPLE
        assert household2.status == HouseholdStatus.MERGED_INTO_COUPLE
        assert household1.merged_into_household_id == new_household.id
        assert household2.merged_into_household_id == new_household.id
        assert household1.archived_at is not None
        assert household2.archived_at is not None

    async def test_merge_households_not_individual_fails(
        self,
        db_session: AsyncSession,
        user1_with_data: tuple[User, Household, Account],
    ):
        """Test: impossible de fusionner si un household n'est pas INDIVIDUAL."""
        user1, household1, _ = user1_with_data

        # Créer un household COUPLE
        household_couple = Household(
            id="household_couple_id",
            name="Already Couple",
            type=HouseholdType.COUPLE,
            status=HouseholdStatus.ACTIVE,
        )
        db_session.add(household_couple)
        await db_session.commit()

        service = HouseholdService(db_session)

        with pytest.raises(ValueError, match="INDIVIDUAL"):
            await service.merge_households(
                household1_id=household1.id,
                household2_id=household_couple.id,
                new_household_name="Should Fail",
            )

    async def test_merge_households_not_active_fails(
        self,
        db_session: AsyncSession,
        user1_with_data: tuple[User, Household, Account],
        user2_with_data: tuple[User, Household, Account],
    ):
        """Test: impossible de fusionner si un household n'est pas ACTIVE."""
        user1, household1, _ = user1_with_data
        user2, household2, _ = user2_with_data

        # Marquer household2 comme ARCHIVED
        household2.status = HouseholdStatus.ARCHIVED
        await db_session.commit()

        service = HouseholdService(db_session)

        with pytest.raises(ValueError, match="ACTIVE"):
            await service.merge_households(
                household1_id=household1.id,
                household2_id=household2.id,
                new_household_name="Should Fail",
            )

    async def test_merge_households_same_household_fails(
        self,
        db_session: AsyncSession,
        user1_with_data: tuple[User, Household, Account],
    ):
        """Test: impossible de fusionner un household avec lui-même."""
        _, household1, _ = user1_with_data

        service = HouseholdService(db_session)

        with pytest.raises(ValueError, match="même household"):
            await service.merge_households(
                household1_id=household1.id,
                household2_id=household1.id,
                new_household_name="Should Fail",
            )

    async def test_merge_households_transaction_owner_migration(
        self,
        db_session: AsyncSession,
        user1_with_data: tuple[User, Household, Account],
        user2_with_data: tuple[User, Household, Account],
    ):
        """Test: les transactions migrent avec owner_type=PERSONAL et owner_user_id."""
        user1, household1, account1 = user1_with_data
        user2, household2, account2 = user2_with_data

        service = HouseholdService(db_session)

        # Fusionner
        new_household = await service.merge_households(
            household1_id=household1.id,
            household2_id=household2.id,
            new_household_name="Our Couple Household",
        )

        # Vérifier que les transactions ont owner_type=PERSONAL et owner_user_id rempli
        stmt = select(Transaction).where(Transaction.household_id == new_household.id)
        transactions = (await db_session.execute(stmt)).scalars().all()

        for transaction in transactions:
            from app.models import TransactionOwnerType
            assert transaction.owner_type == TransactionOwnerType.PERSONAL
            assert transaction.owner_user_id in [user1.id, user2.id]

            # Vérifier que owner_user_id correspond au household d'origine
            if transaction.id == "transaction1_id":
                assert transaction.owner_user_id == user1.id
            elif transaction.id == "transaction2_id":
                assert transaction.owner_user_id == user2.id

    async def test_merge_households_categories_deduplication(
        self,
        db_session: AsyncSession,
        user1_with_data: tuple[User, Household, Account],
        user2_with_data: tuple[User, Household, Account],
    ):
        """Test: les catégories avec le même nom sont fusionnées (dédupliquées)."""
        user1, household1, account1 = user1_with_data
        user2, household2, account2 = user2_with_data

        # Ajouter une catégorie "Groceries" dans household2 aussi
        category_duplicate = Category(
            id="category2_duplicate_id",
            household_id=household2.id,
            name="Groceries",  # Même nom que dans household1
            type=CategoryType.EXPENSE,
        )
        db_session.add(category_duplicate)
        await db_session.commit()

        service = HouseholdService(db_session)

        # Fusionner
        new_household = await service.merge_households(
            household1_id=household1.id,
            household2_id=household2.id,
            new_household_name="Our Couple Household",
        )

        # Vérifier qu'il n'y a qu'une seule catégorie "Groceries"
        stmt = select(Category).where(
            Category.household_id == new_household.id,
            Category.name == "Groceries",
        )
        categories = (await db_session.execute(stmt)).scalars().all()
        assert len(categories) == 1

    async def test_merge_households_creates_notifications(
        self,
        db_session: AsyncSession,
        user1_with_data: tuple[User, Household, Account],
        user2_with_data: tuple[User, Household, Account],
    ):
        """Test: des notifications sont créées pour les 2 utilisateurs après la fusion."""
        user1, household1, _ = user1_with_data
        user2, household2, _ = user2_with_data

        service = HouseholdService(db_session)

        # Fusionner
        await service.merge_households(
            household1_id=household1.id,
            household2_id=household2.id,
            new_household_name="Our Couple Household",
        )

        # Vérifier que des notifications ont été créées pour les 2 users
        from app.models import Notification
        stmt = select(Notification).where(Notification.user_id == user1.id)
        notifications_user1 = (await db_session.execute(stmt)).scalars().all()
        assert len(notifications_user1) >= 1

        stmt = select(Notification).where(Notification.user_id == user2.id)
        notifications_user2 = (await db_session.execute(stmt)).scalars().all()
        assert len(notifications_user2) >= 1
