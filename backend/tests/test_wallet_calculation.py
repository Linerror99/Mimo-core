"""
Tests pour HouseholdService.calculate_wallets() (Sprint 6 Phase 5)

Teste le calcul des 3 portefeuilles pour un household COUPLE:
- Portefeuille Membre 1 (personal + shared/2)
- Portefeuille Membre 2 (personal + shared/2)
- Portefeuille Commun (shared transactions)
"""
import pytest
from decimal import Decimal
from datetime import date

from app.models import (
    Household,
    HouseholdType,
    HouseholdStatus,
    User,
    Account,
    AccountType,
    Transaction,
    TransactionType,
    TransactionState,
    TransactionOwnerType,
    RecurrenceFrequency,
)
from app.services.household_service import HouseholdService


class TestWalletCalculation:
    """Tests pour le calcul des 3 portefeuilles (mode COUPLE)."""

    @pytest.fixture
    async def couple_household(self, db_session):
        """Créer un household COUPLE avec 2 users."""
        household = Household(
            id="h_couple",
            name="Alex & Sarah",
            type=HouseholdType.COUPLE,
            status=HouseholdStatus.ACTIVE,
        )
        db_session.add(household)
        
        user1 = User(
            id="user1",
            household_id=household.id,
            email="alex@test.com",
            password_hash="hashed",
            first_name="Alex",
            last_name="Dupont",
        )
        db_session.add(user1)
        
        user2 = User(
            id="user2",
            household_id=household.id,
            email="sarah@test.com",
            password_hash="hashed",
            first_name="Sarah",
            last_name="Martin",
        )
        db_session.add(user2)
        
        await db_session.commit()
        await db_session.refresh(household)
        await db_session.refresh(user1)
        await db_session.refresh(user2)
        
        return household, user1, user2

    @pytest.fixture
    async def account(self, db_session, couple_household):
        """Créer un compte pour le household."""
        household, _, _ = couple_household
        
        account = Account(
            id="acc1",
            household_id=household.id,
            name="Compte Joint",
            initial_balance=Decimal("2000.00"),
            type=AccountType.CHECKING,
        )
        db_session.add(account)
        await db_session.commit()
        await db_session.refresh(account)
        
        return account

    async def test_calculate_wallets_empty(self, db_session, couple_household, account):
        """Test: Calcul wallets sans transactions (seulement balance compte)."""
        household, user1, user2 = couple_household
        service = HouseholdService(db_session)
        
        result = await service.calculate_wallets(household.id)
        
        # Total balance = balance du compte (2000€)
        assert result["total_balance"] == 2000.00
        
        # Chaque membre a: compte + 0 personal + 0 shared = 2000€
        assert result["members"][user1.id]["user_name"] == "Alex Dupont"
        assert result["members"][user1.id]["balance"] == 2000.00
        assert result["members"][user1.id]["personal_balance"] == 0.00
        assert result["members"][user1.id]["shared_contribution"] == 0.00
        
        assert result["members"][user2.id]["user_name"] == "Sarah Martin"
        assert result["members"][user2.id]["balance"] == 2000.00
        assert result["members"][user2.id]["personal_balance"] == 0.00
        assert result["members"][user2.id]["shared_contribution"] == 0.00
        
        # Shared wallet = 0€
        assert result["shared"]["balance"] == 0.00
        assert result["shared"]["split_per_person"] == 0.00

    async def test_calculate_wallets_personal_only(self, db_session, couple_household, account):
        """Test: Calcul avec transactions PERSONAL uniquement."""
        household, user1, user2 = couple_household
        
        # User1: -50€ (essence)
        tx1 = Transaction(
            id="tx1",
            household_id=household.id,
            account_id=account.id,
            type=TransactionType.EXPENSE,
            amount=Decimal("-50.00"),
            transaction_date=date.today(),
            state=TransactionState.REALIZED,
            description="Essence",
            recurrence_frequency=RecurrenceFrequency.NONE,
            owner_type=TransactionOwnerType.PERSONAL,
            owner_user_id=user1.id,
        )
        db_session.add(tx1)
        
        # User2: -100€ (shopping)
        tx2 = Transaction(
            id="tx2",
            household_id=household.id,
            account_id=account.id,
            type=TransactionType.EXPENSE,
            amount=Decimal("-100.00"),
            transaction_date=date.today(),
            state=TransactionState.REALIZED,
            description="Shopping",
            recurrence_frequency=RecurrenceFrequency.NONE,
            owner_type=TransactionOwnerType.PERSONAL,
            owner_user_id=user2.id,
        )
        db_session.add(tx2)
        
        await db_session.commit()
        
        service = HouseholdService(db_session)
        result = await service.calculate_wallets(household.id)
        
        # Total balance = 2000 - 50 - 100 = 1850€
        assert result["total_balance"] == 1850.00
        
        # User1: 2000 - 50 + 0 shared = 1950€
        assert result["members"][user1.id]["balance"] == 1950.00
        assert result["members"][user1.id]["personal_balance"] == -50.00
        assert result["members"][user1.id]["shared_contribution"] == 0.00
        
        # User2: 2000 - 100 + 0 shared = 1900€
        assert result["members"][user2.id]["balance"] == 1900.00
        assert result["members"][user2.id]["personal_balance"] == -100.00
        assert result["members"][user2.id]["shared_contribution"] == 0.00
        
        # Shared = 0€
        assert result["shared"]["balance"] == 0.00

    async def test_calculate_wallets_shared_only(self, db_session, couple_household, account):
        """Test: Calcul avec transactions SHARED uniquement (split 50/50)."""
        household, user1, user2 = couple_household
        
        # Loyer: -1200€ SHARED
        tx_loyer = Transaction(
            id="tx_loyer",
            household_id=household.id,
            account_id=account.id,
            type=TransactionType.EXPENSE,
            amount=Decimal("-1200.00"),
            transaction_date=date.today(),
            state=TransactionState.REALIZED,
            description="Loyer",
            recurrence_frequency=RecurrenceFrequency.NONE,
            owner_type=TransactionOwnerType.SHARED,
            owner_user_id=None,
        )
        db_session.add(tx_loyer)
        
        await db_session.commit()
        
        service = HouseholdService(db_session)
        result = await service.calculate_wallets(household.id)
        
        # Total balance = 2000 - 1200 = 800€
        assert result["total_balance"] == 800.00
        
        # Chaque user: 2000 + 0 personal + (-1200/2) = 2000 - 600 = 1400€
        assert result["members"][user1.id]["balance"] == 1400.00
        assert result["members"][user1.id]["personal_balance"] == 0.00
        assert result["members"][user1.id]["shared_contribution"] == -600.00
        
        assert result["members"][user2.id]["balance"] == 1400.00
        assert result["members"][user2.id]["personal_balance"] == 0.00
        assert result["members"][user2.id]["shared_contribution"] == -600.00
        
        # Shared wallet = -1200€ total, -600€ per person
        assert result["shared"]["balance"] == -1200.00
        assert result["shared"]["split_per_person"] == -600.00

    async def test_calculate_wallets_mixed(self, db_session, couple_household, account):
        """Test: Calcul avec transactions PERSONAL + SHARED mélangées."""
        household, user1, user2 = couple_household
        
        # User1 personal: -50€ essence
        tx1 = Transaction(
            id="tx1",
            household_id=household.id,
            account_id=account.id,
            type=TransactionType.EXPENSE,
            amount=Decimal("-50.00"),
            transaction_date=date.today(),
            state=TransactionState.REALIZED,
            description="Essence",
            recurrence_frequency=RecurrenceFrequency.NONE,
            owner_type=TransactionOwnerType.PERSONAL,
            owner_user_id=user1.id,
        )
        db_session.add(tx1)
        
        # User2 personal: +3000€ salaire
        tx2 = Transaction(
            id="tx2",
            household_id=household.id,
            account_id=account.id,
            type=TransactionType.INCOME,
            amount=Decimal("3000.00"),
            transaction_date=date.today(),
            state=TransactionState.REALIZED,
            description="Salaire Sarah",
            recurrence_frequency=RecurrenceFrequency.NONE,
            owner_type=TransactionOwnerType.PERSONAL,
            owner_user_id=user2.id,
        )
        db_session.add(tx2)
        
        # Shared: -1200€ loyer
        tx_shared = Transaction(
            id="tx_shared",
            household_id=household.id,
            account_id=account.id,
            type=TransactionType.EXPENSE,
            amount=Decimal("-1200.00"),
            transaction_date=date.today(),
            state=TransactionState.REALIZED,
            description="Loyer",
            recurrence_frequency=RecurrenceFrequency.NONE,
            owner_type=TransactionOwnerType.SHARED,
            owner_user_id=None,
        )
        db_session.add(tx_shared)
        
        await db_session.commit()
        
        service = HouseholdService(db_session)
        result = await service.calculate_wallets(household.id)
        
        # Total balance = 2000 - 50 + 3000 - 1200 = 3750€
        assert result["total_balance"] == 3750.00
        
        # User1: 2000 - 50 (personal) - 600 (shared/2) = 1350€
        assert result["members"][user1.id]["balance"] == 1350.00
        assert result["members"][user1.id]["personal_balance"] == -50.00
        assert result["members"][user1.id]["shared_contribution"] == -600.00
        
        # User2: 2000 + 3000 (personal) - 600 (shared/2) = 4400€
        assert result["members"][user2.id]["balance"] == 4400.00
        assert result["members"][user2.id]["personal_balance"] == 3000.00
        assert result["members"][user2.id]["shared_contribution"] == -600.00
        
        # Shared: -1200€ total, -600€ per person
        assert result["shared"]["balance"] == -1200.00
        assert result["shared"]["split_per_person"] == -600.00

    async def test_calculate_wallets_ignores_deleted(self, db_session, couple_household, account):
        """Test: Les transactions deleted_at != NULL sont ignorées."""
        from datetime import datetime
        
        household, user1, user2 = couple_household
        
        # Transaction active
        tx_active = Transaction(
            id="tx_active",
            household_id=household.id,
            account_id=account.id,
            type=TransactionType.EXPENSE,
            amount=Decimal("-100.00"),
            transaction_date=date.today(),
            state=TransactionState.REALIZED,
            description="Active",
            recurrence_frequency=RecurrenceFrequency.NONE,
            owner_type=TransactionOwnerType.PERSONAL,
            owner_user_id=user1.id,
        )
        db_session.add(tx_active)
        
        # Transaction supprimée (soft delete)
        tx_deleted = Transaction(
            id="tx_deleted",
            household_id=household.id,
            account_id=account.id,
            type=TransactionType.EXPENSE,
            amount=Decimal("-500.00"),
            transaction_date=date.today(),
            state=TransactionState.REALIZED,
            description="Deleted",
            recurrence_frequency=RecurrenceFrequency.NONE,
            owner_type=TransactionOwnerType.PERSONAL,
            owner_user_id=user1.id,
            deleted_at=datetime.utcnow(),  # Soft delete
        )
        db_session.add(tx_deleted)
        
        await db_session.commit()
        
        service = HouseholdService(db_session)
        result = await service.calculate_wallets(household.id)
        
        # Total: 2000 - 100 (ignore deleted -500) = 1900€
        assert result["total_balance"] == 1900.00
        
        # User1: 2000 - 100 = 1900€ (deleted ignored)
        assert result["members"][user1.id]["personal_balance"] == -100.00
        assert result["members"][user1.id]["balance"] == 1900.00

    async def test_calculate_wallets_not_couple_raises_error(self, db_session):
        """Test: Erreur si household n'est pas COUPLE."""
        # Household INDIVIDUAL
        household_individual = Household(
            id="h_individual",
            name="Solo",
            type=HouseholdType.INDIVIDUAL,
            status=HouseholdStatus.ACTIVE,
        )
        db_session.add(household_individual)
        await db_session.commit()
        
        service = HouseholdService(db_session)
        
        with pytest.raises(ValueError, match="only available for COUPLE households"):
            await service.calculate_wallets(household_individual.id)

    async def test_calculate_wallets_not_found_raises_error(self, db_session):
        """Test: Erreur si household n'existe pas."""
        service = HouseholdService(db_session)
        
        with pytest.raises(ValueError, match="Household not found"):
            await service.calculate_wallets("invalid_id")

    async def test_calculate_wallets_wrong_member_count_raises_error(self, db_session):
        """Test: Erreur si COUPLE household n'a pas exactement 2 membres."""
        # Créer COUPLE avec 1 seul membre
        household = Household(
            id="h_couple_1member",
            name="Incomplete Couple",
            type=HouseholdType.COUPLE,
            status=HouseholdStatus.ACTIVE,
        )
        db_session.add(household)
        
        user = User(
            id="user_solo",
            household_id=household.id,
            email="solo@test.com",
            password_hash="hashed",
            first_name="Solo",
            last_name="User",
        )
        db_session.add(user)
        await db_session.commit()
        
        service = HouseholdService(db_session)
        
        with pytest.raises(ValueError, match="must have exactly 2 members"):
            await service.calculate_wallets(household.id)
