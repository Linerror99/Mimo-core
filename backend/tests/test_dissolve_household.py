"""
Tests unitaires pour la dissolution de household (Sprint 6 - US-1.3)

Teste le processus complet de dissolution :
- Validation (COUPLE + ACTIVE)
- Archivage household COUPLE
- Création 2 households INDIVIDUAL
- Répartition des comptes par original_owner_user_id
- Répartition des transactions (PERSONAL migre, SHARED RÉALISÉES restent, SHARED PROJETÉES annulées)
- Duplication des catégories
- Notifications
"""
import pytest
from decimal import Decimal
from datetime import date, datetime, timedelta

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
    Category,
    CategoryType,
    Notification,
    NotificationType,
)
from app.services.household_service import HouseholdService


class TestDissolveHousehold:
    """Tests pour la dissolution de household COUPLE."""

    @pytest.fixture
    async def couple_household_with_data(self, db_session):
        """Créer un household COUPLE avec comptes, transactions et catégories."""
        # Créer household COUPLE
        household = Household(
            id="h_couple",
            name="Alex & Sarah",
            type=HouseholdType.COUPLE,
            status=HouseholdStatus.ACTIVE,
        )
        db_session.add(household)
        
        # User 1
        user1 = User(
            id="user1",
            household_id=household.id,
            email="alex@test.com",
            password_hash="hashed",
            first_name="Alex",
            last_name="Dupont",
        )
        db_session.add(user1)
        
        # User 2
        user2 = User(
            id="user2",
            household_id=household.id,
            email="sarah@test.com",
            password_hash="hashed",
            first_name="Sarah",
            last_name="Martin",
        )
        db_session.add(user2)
        
        # Compte User 1 (1000€)
        acc1 = Account(
            id="acc1",
            household_id=household.id,
            name="Compte Alex",
            type=AccountType.CHECKING,
            initial_balance=Decimal("1000.00"),
            original_owner_user_id=user1.id,
        )
        db_session.add(acc1)
        
        # Compte User 2 (500€)
        acc2 = Account(
            id="acc2",
            household_id=household.id,
            name="Compte Sarah",
            type=AccountType.SAVINGS,
            initial_balance=Decimal("500.00"),
            original_owner_user_id=user2.id,
        )
        db_session.add(acc2)
        
        # Transactions PERSONAL user1
        tx_personal_u1 = Transaction(
            id="tx_p1",
            household_id=household.id,
            account_id=acc1.id,
            type=TransactionType.EXPENSE,
            amount=Decimal("-50.00"),
            transaction_date=date.today(),
            state=TransactionState.REALIZED,
            description="Essence Alex",
            recurrence_frequency=RecurrenceFrequency.NONE,
            owner_type=TransactionOwnerType.PERSONAL,
            owner_user_id=user1.id,
        )
        db_session.add(tx_personal_u1)
        
        # Transactions PERSONAL user2
        tx_personal_u2 = Transaction(
            id="tx_p2",
            household_id=household.id,
            account_id=acc2.id,
            type=TransactionType.INCOME,
            amount=Decimal("200.00"),
            transaction_date=date.today(),
            state=TransactionState.REALIZED,
            description="Freelance Sarah",
            recurrence_frequency=RecurrenceFrequency.NONE,
            owner_type=TransactionOwnerType.PERSONAL,
            owner_user_id=user2.id,
        )
        db_session.add(tx_personal_u2)
        
        # Transaction SHARED RÉALISÉE (reste dans archivé)
        tx_shared_realized = Transaction(
            id="tx_s1",
            household_id=household.id,
            account_id=acc1.id,
            type=TransactionType.EXPENSE,
            amount=Decimal("-100.00"),
            transaction_date=date.today(),
            state=TransactionState.REALIZED,
            description="Restaurant",
            recurrence_frequency=RecurrenceFrequency.NONE,
            owner_type=TransactionOwnerType.SHARED,
            owner_user_id=None,
        )
        db_session.add(tx_shared_realized)
        
        # Transaction SHARED PROJETÉE (doit être supprimée)
        tx_shared_projected = Transaction(
            id="tx_s2",
            household_id=household.id,
            account_id=acc1.id,
            type=TransactionType.EXPENSE,
            amount=Decimal("-200.00"),
            transaction_date=date.today() + timedelta(days=7),
            state=TransactionState.PROJECTED,
            description="Loyer futur",
            recurrence_frequency=RecurrenceFrequency.NONE,
            owner_type=TransactionOwnerType.SHARED,
            owner_user_id=None,
        )
        db_session.add(tx_shared_projected)
        
        # Catégories
        cat1 = Category(
            id="cat1",
            household_id=household.id,
            name="Courses",
            type=CategoryType.EXPENSE,
            color="#FF0000",
            icon="shopping",
        )
        db_session.add(cat1)
        
        cat2 = Category(
            id="cat2",
            household_id=household.id,
            name="Salaire",
            type=CategoryType.INCOME,
            color="#00FF00",
            icon="money",
        )
        db_session.add(cat2)
        
        await db_session.commit()
        await db_session.refresh(household)
        await db_session.refresh(user1)
        await db_session.refresh(user2)
        await db_session.refresh(acc1)
        await db_session.refresh(acc2)
        
        return household, user1, user2, acc1, acc2

    async def test_dissolve_household_success(self, db_session, couple_household_with_data):
        """Test: Dissolution complète d'un household COUPLE."""
        household, user1, user2, acc1, acc2 = couple_household_with_data
        
        service = HouseholdService(db_session)
        result = await service.dissolve_household(
            household_id=household.id,
            initiated_by_user_id=user1.id,
        )
        
        # Vérifier structure response
        assert "archived_household" in result
        assert "new_households" in result
        assert len(result["new_households"]) == 2
        
        # Vérifier household archivé
        await db_session.refresh(household)
        assert household.status == HouseholdStatus.ARCHIVED
        assert result["archived_household"]["id"] == household.id
        assert result["archived_household"]["status"] == "archived"
        
        # Vérifier création 2 nouveaux households
        new_h1_id = result["new_households"][0]["id"]
        new_h2_id = result["new_households"][1]["id"]
        
        from sqlalchemy import select
        stmt = select(Household).where(Household.id == new_h1_id)
        new_h1 = (await db_session.execute(stmt)).scalar_one()
        
        stmt = select(Household).where(Household.id == new_h2_id)
        new_h2 = (await db_session.execute(stmt)).scalar_one()
        
        assert new_h1.type == HouseholdType.INDIVIDUAL
        assert new_h1.status == HouseholdStatus.ACTIVE
        assert new_h2.type == HouseholdType.INDIVIDUAL
        assert new_h2.status == HouseholdStatus.ACTIVE
        
        # Vérifier users migrés
        await db_session.refresh(user1)
        await db_session.refresh(user2)
        
        assert user1.household_id in [new_h1_id, new_h2_id]
        assert user2.household_id in [new_h1_id, new_h2_id]
        assert user1.household_id != user2.household_id
        
        # Vérifier comptes répartis par original_owner_user_id
        await db_session.refresh(acc1)
        await db_session.refresh(acc2)
        
        assert acc1.household_id == user1.household_id, "Compte Alex doit migrer vers household d'Alex"
        assert acc2.household_id == user2.household_id, "Compte Sarah doit migrer vers household de Sarah"
        
        # Vérifier transactions PERSONAL migrées
        stmt = select(Transaction).where(Transaction.id == "tx_p1")
        tx_p1 = (await db_session.execute(stmt)).scalar_one()
        assert tx_p1.household_id == user1.household_id
        
        stmt = select(Transaction).where(Transaction.id == "tx_p2")
        tx_p2 = (await db_session.execute(stmt)).scalar_one()
        assert tx_p2.household_id == user2.household_id
        
        # Vérifier transaction SHARED RÉALISÉE reste dans archivé
        stmt = select(Transaction).where(Transaction.id == "tx_s1")
        tx_s1 = (await db_session.execute(stmt)).scalar_one()
        assert tx_s1.household_id == household.id, "SHARED RÉALISÉE reste dans household archivé"
        assert tx_s1.state == TransactionState.REALIZED
        
        # Vérifier transaction SHARED PROJETÉE supprimée
        stmt = select(Transaction).where(Transaction.id == "tx_s2")
        tx_s2 = (await db_session.execute(stmt)).scalar_one_or_none()
        assert tx_s2 is None, "SHARED PROJETÉE doit être supprimée"
        
        # Vérifier catégories dupliquées
        stmt = select(Category).where(Category.household_id == user1.household_id)
        cats_u1 = (await db_session.execute(stmt)).scalars().all()
        
        stmt = select(Category).where(Category.household_id == user2.household_id)
        cats_u2 = (await db_session.execute(stmt)).scalars().all()
        
        assert len(cats_u1) == 2, "User1 doit avoir 2 catégories"
        assert len(cats_u2) == 2, "User2 doit avoir 2 catégories"
        
        # Vérifier notifications créées
        stmt = select(Notification).where(Notification.user_id == user1.id)
        notifs_u1 = (await db_session.execute(stmt)).scalars().all()
        
        stmt = select(Notification).where(Notification.user_id == user2.id)
        notifs_u2 = (await db_session.execute(stmt)).scalars().all()
        
        assert any(n.type == NotificationType.HOUSEHOLD_DISSOLVED for n in notifs_u1)
        assert any(n.type == NotificationType.HOUSEHOLD_DISSOLVED for n in notifs_u2)

    async def test_dissolve_household_not_couple_fails(self, db_session):
        """Test: Erreur si household n'est pas COUPLE."""
        # Household INDIVIDUAL
        household = Household(
            id="h_individual",
            name="Solo",
            type=HouseholdType.INDIVIDUAL,
            status=HouseholdStatus.ACTIVE,
        )
        db_session.add(household)
        
        user = User(
            id="user",
            household_id=household.id,
            email="solo@test.com",
            password_hash="hashed",
            first_name="Solo",
            last_name="User",
        )
        db_session.add(user)
        
        await db_session.commit()
        
        service = HouseholdService(db_session)
        
        with pytest.raises(ValueError, match="Seuls les households COUPLE"):
            await service.dissolve_household(
                household_id=household.id,
                initiated_by_user_id=user.id,
            )

    async def test_dissolve_household_not_member_fails(self, db_session, couple_household_with_data):
        """Test: Erreur si user n'est pas membre du household."""
        household, user1, user2, _, _ = couple_household_with_data
        
        # Créer un autre household pour l'utilisateur externe
        other_household = Household(
            id="other_household",
            name="Other",
            type=HouseholdType.INDIVIDUAL,
            status=HouseholdStatus.ACTIVE,
        )
        db_session.add(other_household)
        
        # User externe
        external_user = User(
            id="external",
            household_id="other_household",
            email="external@test.com",
            password_hash="hashed",
            first_name="External",
            last_name="User",
        )
        db_session.add(external_user)
        await db_session.commit()
        
        service = HouseholdService(db_session)
        
        with pytest.raises(ValueError, match="Seul un membre du household"):
            await service.dissolve_household(
                household_id=household.id,
                initiated_by_user_id=external_user.id,
            )

    async def test_dissolve_household_not_active_fails(self, db_session, couple_household_with_data):
        """Test: Erreur si household n'est pas ACTIVE."""
        household, user1, _, _, _ = couple_household_with_data
        
        # Marquer comme archivé
        household.status = HouseholdStatus.ARCHIVED
        await db_session.commit()
        
        service = HouseholdService(db_session)
        
        with pytest.raises(ValueError, match="Seuls les households ACTIVE"):
            await service.dissolve_household(
                household_id=household.id,
                initiated_by_user_id=user1.id,
            )
