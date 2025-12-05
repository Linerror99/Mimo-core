"""
Tests pour RecurringTemplateService

Tests TDD pour service de gestion des templates récurrents.
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import RecurringTemplate, Frequency, Account, Category, Household, User
from app.services.recurring_template_service import RecurringTemplateService


@pytest.fixture
async def test_household(db_session: AsyncSession):
    """Fixture household de test"""
    household = Household(
        id="test-household-recurring",
        name="Test Household Recurring",
        type="individual"
    )
    db_session.add(household)
    await db_session.commit()
    await db_session.refresh(household)
    return household


@pytest.fixture
async def test_user(db_session: AsyncSession, test_household):
    """Fixture user de test"""
    user = User(
        id="test-user-recurring",
        email="recurring@test.com",
        first_name="Test",
        last_name="Recurring",
        hashed_password="hashed",
        household_id=test_household.id
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_account(db_session: AsyncSession, test_household):
    """Fixture compte de test"""
    account = Account(
        id="test-account-recurring",
        name="Compte Test Récurrent",
        type="CHECKING",
        initial_balance=Decimal("1000.00"),
        household_id=test_household.id,
        is_active="true"
    )
    db_session.add(account)
    await db_session.commit()
    await db_session.refresh(account)
    return account


@pytest.fixture
async def test_category(db_session: AsyncSession, test_household):
    """Fixture catégorie de test"""
    category = Category(
        id="test-category-recurring",
        name="Loyer",
        type="EXPENSE",
        household_id=test_household.id,
        color="#FF0000",
        icon="home"
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)
    return category


@pytest.mark.asyncio
class TestRecurringTemplateService:
    """Tests pour RecurringTemplateService"""

    async def test_create_monthly_template(
        self, db_session: AsyncSession, test_household, test_account, test_category
    ):
        """Test création template mensuel"""
        data = {
            "name": "Loyer mensuel",
            "amount": Decimal("1500.00"),
            "type": "EXPENSE",
            "description": "Loyer appartement",
            "frequency": "MONTHLY",
            "start_date": date(2025, 12, 1),
            "end_date": None,
            "day_of_month": 1,
            "account_id": test_account.id,
            "category_id": test_category.id,
        }
        
        template = await RecurringTemplateService.create_template(
            db=db_session,
            household_id=test_household.id,
            data=data
        )
        
        assert template.id is not None
        assert template.name == "Loyer mensuel"
        assert template.amount == Decimal("1500.00")
        assert template.frequency == Frequency.MONTHLY
        assert template.day_of_month == 1
        assert template.is_active == "true"

    async def test_create_weekly_template(
        self, db_session: AsyncSession, test_household, test_account
    ):
        """Test création template hebdomadaire"""
        data = {
            "name": "Courses hebdomadaires",
            "amount": Decimal("100.00"),
            "type": "EXPENSE",
            "frequency": "WEEKLY",
            "start_date": date(2025, 12, 1),
            "day_of_week": 6,  # Dimanche
            "account_id": test_account.id,
        }
        
        template = await RecurringTemplateService.create_template(
            db=db_session,
            household_id=test_household.id,
            data=data
        )
        
        assert template.frequency == Frequency.WEEKLY
        assert template.day_of_week == 6

    async def test_create_quarterly_template(
        self, db_session: AsyncSession, test_household, test_account
    ):
        """Test création template trimestriel"""
        data = {
            "name": "Prime trimestrielle",
            "amount": Decimal("3000.00"),
            "type": "INCOME",
            "frequency": "QUARTERLY",
            "start_date": date(2025, 12, 31),
            "day_of_month": 31,
            "account_id": test_account.id,
        }
        
        template = await RecurringTemplateService.create_template(
            db=db_session,
            household_id=test_household.id,
            data=data
        )
        
        assert template.frequency == Frequency.QUARTERLY
        assert template.type == "INCOME"

    async def test_create_yearly_template(
        self, db_session: AsyncSession, test_household, test_account
    ):
        """Test création template annuel"""
        data = {
            "name": "Assurance annuelle",
            "amount": Decimal("1200.00"),
            "type": "EXPENSE",
            "frequency": "YEARLY",
            "start_date": date(2025, 1, 1),
            "day_of_month": 1,
            "account_id": test_account.id,
        }
        
        template = await RecurringTemplateService.create_template(
            db=db_session,
            household_id=test_household.id,
            data=data
        )
        
        assert template.frequency == Frequency.YEARLY

    async def test_create_custom_template(
        self, db_session: AsyncSession, test_household, test_account
    ):
        """Test création template personnalisé (tous les X jours)"""
        data = {
            "name": "Paiement tous les 15 jours",
            "amount": Decimal("500.00"),
            "type": "EXPENSE",
            "frequency": "CUSTOM",
            "start_date": date(2025, 12, 1),
            "custom_days": 15,
            "account_id": test_account.id,
        }
        
        template = await RecurringTemplateService.create_template(
            db=db_session,
            household_id=test_household.id,
            data=data
        )
        
        assert template.frequency == Frequency.CUSTOM
        assert template.custom_days == 15

    async def test_get_template_by_id(
        self, db_session: AsyncSession, test_household, test_account
    ):
        """Test récupération template par ID"""
        data = {
            "name": "Test Get",
            "amount": Decimal("100.00"),
            "type": "EXPENSE",
            "frequency": "MONTHLY",
            "start_date": date(2025, 12, 1),
            "day_of_month": 1,
            "account_id": test_account.id,
        }
        
        created = await RecurringTemplateService.create_template(
            db=db_session, household_id=test_household.id, data=data
        )
        
        retrieved = await RecurringTemplateService.get_template(
            db=db_session, template_id=created.id, household_id=test_household.id
        )
        
        assert retrieved.id == created.id
        assert retrieved.name == "Test Get"

    async def test_get_all_templates(
        self, db_session: AsyncSession, test_household, test_account
    ):
        """Test récupération de tous les templates"""
        # Créer 3 templates
        for i in range(3):
            data = {
                "name": f"Template {i+1}",
                "amount": Decimal("100.00"),
                "type": "EXPENSE",
                "frequency": "MONTHLY",
                "start_date": date(2025, 12, 1),
                "day_of_month": 1,
                "account_id": test_account.id,
            }
            await RecurringTemplateService.create_template(
                db=db_session, household_id=test_household.id, data=data
            )
        
        templates = await RecurringTemplateService.get_all_templates(
            db=db_session, household_id=test_household.id
        )
        
        assert len(templates) >= 3

    async def test_get_active_templates_only(
        self, db_session: AsyncSession, test_household, test_account
    ):
        """Test récupération uniquement templates actifs"""
        # Créer 2 templates
        data1 = {
            "name": "Active Template",
            "amount": Decimal("100.00"),
            "type": "EXPENSE",
            "frequency": "MONTHLY",
            "start_date": date(2025, 12, 1),
            "day_of_month": 1,
            "account_id": test_account.id,
        }
        active = await RecurringTemplateService.create_template(
            db=db_session, household_id=test_household.id, data=data1
        )
        
        data2 = {
            "name": "Inactive Template",
            "amount": Decimal("200.00"),
            "type": "EXPENSE",
            "frequency": "MONTHLY",
            "start_date": date(2025, 12, 1),
            "day_of_month": 1,
            "account_id": test_account.id,
        }
        inactive = await RecurringTemplateService.create_template(
            db=db_session, household_id=test_household.id, data=data2
        )
        
        # Désactiver le second
        await RecurringTemplateService.update_template(
            db=db_session,
            template_id=inactive.id,
            household_id=test_household.id,
            data={"is_active": "false"}
        )
        
        # Récupérer uniquement actifs
        templates = await RecurringTemplateService.get_all_templates(
            db=db_session, household_id=test_household.id, include_inactive=False
        )
        
        template_names = [t.name for t in templates]
        assert "Active Template" in template_names
        assert "Inactive Template" not in template_names

    async def test_update_template(
        self, db_session: AsyncSession, test_household, test_account
    ):
        """Test mise à jour template"""
        data = {
            "name": "Original Name",
            "amount": Decimal("100.00"),
            "type": "EXPENSE",
            "frequency": "MONTHLY",
            "start_date": date(2025, 12, 1),
            "day_of_month": 1,
            "account_id": test_account.id,
        }
        
        template = await RecurringTemplateService.create_template(
            db=db_session, household_id=test_household.id, data=data
        )
        
        # Mettre à jour
        updated = await RecurringTemplateService.update_template(
            db=db_session,
            template_id=template.id,
            household_id=test_household.id,
            data={"name": "Updated Name", "amount": Decimal("200.00")}
        )
        
        assert updated.name == "Updated Name"
        assert updated.amount == Decimal("200.00")

    async def test_deactivate_template(
        self, db_session: AsyncSession, test_household, test_account
    ):
        """Test désactivation template"""
        data = {
            "name": "To Deactivate",
            "amount": Decimal("100.00"),
            "type": "EXPENSE",
            "frequency": "MONTHLY",
            "start_date": date(2025, 12, 1),
            "day_of_month": 1,
            "account_id": test_account.id,
        }
        
        template = await RecurringTemplateService.create_template(
            db=db_session, household_id=test_household.id, data=data
        )
        
        # Désactiver
        updated = await RecurringTemplateService.update_template(
            db=db_session,
            template_id=template.id,
            household_id=test_household.id,
            data={"is_active": "false"}
        )
        
        assert updated.is_active == "false"

    async def test_delete_template(
        self, db_session: AsyncSession, test_household, test_account
    ):
        """Test suppression template"""
        data = {
            "name": "To Delete",
            "amount": Decimal("100.00"),
            "type": "EXPENSE",
            "frequency": "MONTHLY",
            "start_date": date(2025, 12, 1),
            "day_of_month": 1,
            "account_id": test_account.id,
        }
        
        template = await RecurringTemplateService.create_template(
            db=db_session, household_id=test_household.id, data=data
        )
        
        # Supprimer
        await RecurringTemplateService.delete_template(
            db=db_session, template_id=template.id, household_id=test_household.id
        )
        
        # Vérifier qu'il n'existe plus
        deleted = await RecurringTemplateService.get_template(
            db=db_session, template_id=template.id, household_id=test_household.id
        )
        
        assert deleted is None

    async def test_household_isolation(
        self, db_session: AsyncSession, test_account
    ):
        """Test isolation entre households"""
        # Créer 2 households
        household1 = Household(id="household-1", name="H1", type="individual")
        household2 = Household(id="household-2", name="H2", type="individual")
        db_session.add_all([household1, household2])
        await db_session.commit()
        
        # Créer template pour household1
        data = {
            "name": "H1 Template",
            "amount": Decimal("100.00"),
            "type": "EXPENSE",
            "frequency": "MONTHLY",
            "start_date": date(2025, 12, 1),
            "day_of_month": 1,
            "account_id": test_account.id,
        }
        
        template = await RecurringTemplateService.create_template(
            db=db_session, household_id=household1.id, data=data
        )
        
        # Tenter de récupérer avec household2
        retrieved = await RecurringTemplateService.get_template(
            db=db_session, template_id=template.id, household_id=household2.id
        )
        
        assert retrieved is None  # Isolation : household2 ne voit pas template de household1
