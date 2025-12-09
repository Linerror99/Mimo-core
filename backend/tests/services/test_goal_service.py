"""
Tests pour GoalService (TDD)

Test des objectifs personnels ET de foyer.
"""
import pytest
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.goal import Goal
from app.models.user import User
from app.models.household import Household, HouseholdType
from app.services.goal_service import GoalService


class TestGoalService:
    """Tests pour le service Goal"""
    
    @pytest.fixture
    async def user(self, db_session: AsyncSession) -> User:
        """Crée un utilisateur de test"""
        household = Household(
            name="Test Household",
            type=HouseholdType.INDIVIDUAL
        )
        db_session.add(household)
        await db_session.flush()
        
        user = User(
            email="test@example.com",
            password_hash="hashed",
            first_name="Test",
            last_name="User",
            household_id=household.id
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user
    
    @pytest.fixture
    async def couple_household(self, db_session: AsyncSession) -> tuple[Household, User, User]:
        """Crée un foyer couple avec 2 users"""
        household = Household(
            name="Couple Household",
            type=HouseholdType.COUPLE
        )
        db_session.add(household)
        await db_session.flush()
        
        user1 = User(
            email="user1@example.com",
            password_hash="hashed",
            first_name="User",
            last_name="One",
            household_id=household.id
        )
        user2 = User(
            email="user2@example.com",
            password_hash="hashed",
            first_name="User",
            last_name="Two",
            household_id=household.id
        )
        db_session.add_all([user1, user2])
        await db_session.commit()
        await db_session.refresh(household)
        await db_session.refresh(user1)
        await db_session.refresh(user2)
        
        return household, user1, user2
    
    @pytest.mark.asyncio
    async def test_create_personal_goal(self, db_session: AsyncSession, user: User):
        """Test création objectif personnel"""
        service = GoalService(db_session)
        
        goal = await service.create_goal(
            user_id=user.id,
            household_id=None,
            created_by=user.id,
            name="Voyage à Paris",
            target_amount=2000.0,
            description="Économiser pour des vacances",
            target_date=date(2026, 6, 1)
        )
        
        assert goal.id is not None
        assert goal.user_id == user.id
        assert goal.household_id is None
        assert goal.name == "Voyage à Paris"
        assert goal.target_amount == Decimal("2000.00")
        assert goal.current_amount == Decimal("0")
        assert goal.is_personal is True
        assert goal.is_household is False
    
    @pytest.mark.asyncio
    async def test_create_household_goal(self, db_session: AsyncSession, couple_household):
        """Test création objectif de foyer"""
        household, user1, user2 = couple_household
        service = GoalService(db_session)
        
        goal = await service.create_goal(
            user_id=None,
            household_id=household.id,
            created_by=user1.id,
            name="Maison",
            target_amount=50000.0,
            description="Économiser pour acheter une maison"
        )
        
        assert goal.id is not None
        assert goal.household_id == household.id
        assert goal.user_id is None
        assert goal.name == "Maison"
        assert goal.target_amount == Decimal("50000.00")
        assert goal.is_personal is False
        assert goal.is_household is True
    
    @pytest.mark.asyncio
    async def test_create_goal_invalid_both_null(self, db_session: AsyncSession, user: User):
        """Test erreur si ni user_id ni household_id"""
        service = GoalService(db_session)
        
        with pytest.raises(ValueError, match="user_id ou household_id"):
            await service.create_goal(
                user_id=None,
                household_id=None,
                created_by=user.id,
                name="Invalid Goal",
                target_amount=1000.0
            )
    
    @pytest.mark.asyncio
    async def test_create_goal_invalid_both_set(self, db_session: AsyncSession, user: User):
        """Test erreur si user_id ET household_id fournis"""
        service = GoalService(db_session)
        
        with pytest.raises(ValueError, match="exclusivement"):
            await service.create_goal(
                user_id=user.id,
                household_id=user.household_id,
                created_by=user.id,
                name="Invalid Goal",
                target_amount=1000.0
            )
    
    @pytest.mark.asyncio
    async def test_create_goal_negative_amount(self, db_session: AsyncSession, user: User):
        """Test erreur si montant négatif"""
        service = GoalService(db_session)
        
        with pytest.raises(ValueError, match="positif"):
            await service.create_goal(
                user_id=user.id,
                household_id=None,
                created_by=user.id,
                name="Invalid",
                target_amount=-100.0
            )
    
    @pytest.mark.asyncio
    async def test_list_personal_goals(self, db_session: AsyncSession, user: User):
        """Test liste objectifs personnels"""
        service = GoalService(db_session)
        
        # Créer 2 objectifs personnels
        await service.create_goal(
            user_id=user.id,
            household_id=None,
            created_by=user.id,
            name="Goal 1",
            target_amount=1000.0
        )
        await service.create_goal(
            user_id=user.id,
            household_id=None,
            created_by=user.id,
            name="Goal 2",
            target_amount=2000.0
        )
        
        goals = await service.list_goals(user_id=user.id, household_id=None)
        
        assert len(goals) == 2
        assert all(g.user_id == user.id for g in goals)
        assert all(g.household_id is None for g in goals)
    
    @pytest.mark.asyncio
    async def test_list_household_goals(self, db_session: AsyncSession, couple_household):
        """Test liste objectifs de foyer"""
        household, user1, user2 = couple_household
        service = GoalService(db_session)
        
        # Créer 1 objectif de foyer
        await service.create_goal(
            user_id=None,
            household_id=household.id,
            created_by=user1.id,
            name="Household Goal",
            target_amount=5000.0
        )
        
        goals = await service.list_goals(user_id=None, household_id=household.id)
        
        assert len(goals) == 1
        assert goals[0].household_id == household.id
        assert goals[0].user_id is None
    
    @pytest.mark.asyncio
    async def test_update_goal(self, db_session: AsyncSession, user: User):
        """Test mise à jour objectif"""
        service = GoalService(db_session)
        
        goal = await service.create_goal(
            user_id=user.id,
            household_id=None,
            created_by=user.id,
            name="Original",
            target_amount=1000.0
        )
        
        updated = await service.update_goal(
            goal_id=goal.id,
            name="Updated Name",
            target_amount=1500.0,
            description="New description"
        )
        
        assert updated.name == "Updated Name"
        assert updated.target_amount == Decimal("1500.00")
        assert updated.description == "New description"
    
    @pytest.mark.asyncio
    async def test_delete_goal(self, db_session: AsyncSession, user: User):
        """Test suppression objectif"""
        service = GoalService(db_session)
        
        goal = await service.create_goal(
            user_id=user.id,
            household_id=None,
            created_by=user.id,
            name="To Delete",
            target_amount=1000.0
        )
        
        await service.delete_goal(goal.id)
        
        deleted_goal = await service.get_goal(goal.id)
        assert deleted_goal is None
    
    @pytest.mark.asyncio
    async def test_update_contribution(self, db_session: AsyncSession, user: User):
        """Test contribution manuelle"""
        service = GoalService(db_session)
        
        goal = await service.create_goal(
            user_id=user.id,
            household_id=None,
            created_by=user.id,
            name="Savings",
            target_amount=1000.0
        )
        
        # Ajouter 300€
        updated = await service.update_contribution(goal.id, 300.0)
        assert updated.current_amount == Decimal("300.00")
        
        # Ajouter 200€ supplémentaires
        updated = await service.update_contribution(goal.id, 200.0)
        assert updated.current_amount == Decimal("500.00")
    
    @pytest.mark.asyncio
    async def test_update_contribution_negative_not_allowed(self, db_session: AsyncSession, user: User):
        """Test erreur si contribution mène à montant négatif"""
        service = GoalService(db_session)
        
        goal = await service.create_goal(
            user_id=user.id,
            household_id=None,
            created_by=user.id,
            name="Savings",
            target_amount=1000.0
        )
        
        # Tenter de retirer 100€ alors que current_amount = 0
        with pytest.raises(ValueError, match="négatif"):
            await service.update_contribution(goal.id, -100.0)
    
    @pytest.mark.asyncio
    async def test_goal_progress_percentage(self, db_session: AsyncSession, user: User):
        """Test calcul pourcentage progression"""
        service = GoalService(db_session)
        
        goal = await service.create_goal(
            user_id=user.id,
            household_id=None,
            created_by=user.id,
            name="Test",
            target_amount=1000.0
        )
        
        # 0%
        assert goal.progress_percentage == 0.0
        
        # 30%
        await service.update_contribution(goal.id, 300.0)
        await db_session.refresh(goal)
        assert goal.progress_percentage == 30.0
        
        # 100%
        await service.update_contribution(goal.id, 700.0)
        await db_session.refresh(goal)
        assert goal.progress_percentage == 100.0
        
        # Plus de 100% (cappé à 100%)
        await service.update_contribution(goal.id, 500.0)
        await db_session.refresh(goal)
        assert goal.progress_percentage == 100.0  # Cap à 100%
    
    @pytest.mark.asyncio
    async def test_goal_is_completed(self, db_session: AsyncSession, user: User):
        """Test propriété is_completed"""
        service = GoalService(db_session)
        
        goal = await service.create_goal(
            user_id=user.id,
            household_id=None,
            created_by=user.id,
            name="Test",
            target_amount=1000.0
        )
        
        assert goal.is_completed is False
        
        await service.update_contribution(goal.id, 1000.0)
        await db_session.refresh(goal)
        assert goal.is_completed is True
        
        await service.update_contribution(goal.id, 500.0)
        await db_session.refresh(goal)
        assert goal.is_completed is True  # Toujours complété même si > target
