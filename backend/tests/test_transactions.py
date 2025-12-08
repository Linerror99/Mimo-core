"""
Transaction Service Tests (TDD)

Tests unitaires pour TransactionService
"""
import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction, TransactionType, TransactionState, RecurrenceFrequency
from app.services.transaction_service import TransactionService
from app.schemas.transaction import TransactionCreate, TransactionUpdate


pytestmark = pytest.mark.asyncio


class TestTransactionService:
    """Tests pour TransactionService"""
    
    # ===== CREATE Tests =====
    
    async def test_create_income_transaction(
        self, 
        db_session: AsyncSession, 
        test_household_id: str, 
        test_account_id: str,
        test_category_income_id: str
    ):
        """Test création transaction revenu"""
        service = TransactionService(db_session)
        
        transaction_data = TransactionCreate(
            description="Salaire mensuel",
            amount=Decimal("3000.00"),
            transaction_date=date.today(),
            type=TransactionType.INCOME,
            account_id=test_account_id,
            category_id=test_category_income_id,
            notes="Salaire du mois"
        )
        
        transaction = await service.create_transaction(
            household_id=test_household_id,
            transaction_data=transaction_data
        )
        
        assert transaction.id is not None
        assert transaction.description == "Salaire mensuel"
        assert transaction.amount == Decimal("3000.00")
        assert transaction.type == TransactionType.INCOME
        assert transaction.state == TransactionState.PENDING  # Sprint 5: today = PENDING
        assert transaction.recurrence_frequency == RecurrenceFrequency.NONE
        
    async def test_create_expense_transaction(
        self, 
        db_session: AsyncSession, 
        test_household_id: str, 
        test_account_id: str,
        test_category_expense_id: str
    ):
        """Test création transaction dépense"""
        service = TransactionService(db_session)
        
        transaction_data = TransactionCreate(
            description="Courses alimentaires",
            amount=Decimal("-150.50"),
            transaction_date=date.today(),
            type=TransactionType.EXPENSE,
            account_id=test_account_id,
            category_id=test_category_expense_id
        )
        
        transaction = await service.create_transaction(
            household_id=test_household_id,
            transaction_data=transaction_data
        )
        
        assert transaction.amount == Decimal("-150.50")
        assert transaction.type == TransactionType.EXPENSE
        assert transaction.state == TransactionState.PENDING  # Sprint 5: today = PENDING
        
    async def test_create_future_transaction_is_projected(
        self, 
        db_session: AsyncSession, 
        test_household_id: str, 
        test_account_id: str,
        test_category_income_id: str
    ):
        """Test transaction future = PROJECTED"""
        service = TransactionService(db_session)
        
        future_date = date.today() + timedelta(days=30)
        transaction_data = TransactionCreate(
            description="Salaire futur",
            amount=Decimal("3000.00"),
            transaction_date=future_date,
            type=TransactionType.INCOME,
            account_id=test_account_id,
            category_id=test_category_income_id
        )
        
        transaction = await service.create_transaction(
            household_id=test_household_id,
            transaction_data=transaction_data
        )
        
        assert transaction.state == TransactionState.PROJECTED
        
    async def test_create_transfer_transaction(
        self, 
        db_session: AsyncSession, 
        test_household_id: str, 
        test_account_id: str,
        test_account2_id: str
    ):
        """Test création virement entre comptes"""
        service = TransactionService(db_session)
        
        transaction_data = TransactionCreate(
            description="Virement épargne",
            amount=Decimal("500.00"),
            transaction_date=date.today(),
            type=TransactionType.TRANSFER,
            account_id=test_account_id,
            destination_account_id=test_account2_id
        )
        
        transaction = await service.create_transaction(
            household_id=test_household_id,
            transaction_data=transaction_data
        )
        
        assert transaction.type == TransactionType.TRANSFER
        assert transaction.destination_account_id == test_account2_id
        assert transaction.amount == Decimal("500.00")
        
    # ===== READ Tests =====
    
    async def test_get_transaction_by_id(
        self, 
        db_session: AsyncSession, 
        test_household_id: str,
        test_transaction: Transaction
    ):
        """Test récupération transaction par ID"""
        service = TransactionService(db_session)
        
        transaction = await service.get_transaction(
            transaction_id=test_transaction.id,
            household_id=test_household_id
        )
        
        assert transaction is not None
        assert transaction.id == test_transaction.id
        
    async def test_get_transaction_wrong_household_returns_none(
        self, 
        db_session: AsyncSession,
        test_transaction: Transaction
    ):
        """Test isolation household : transaction d'un autre foyer non accessible"""
        service = TransactionService(db_session)
        
        wrong_household_id = "wrong-household-id"
        transaction = await service.get_transaction(
            transaction_id=test_transaction.id,
            household_id=wrong_household_id
        )
        
        assert transaction is None
        
    async def test_list_transactions(
        self, 
        db_session: AsyncSession, 
        test_household_id: str,
        test_transaction: Transaction
    ):
        """Test liste des transactions"""
        service = TransactionService(db_session)
        
        transactions = await service.list_transactions(
            household_id=test_household_id
        )
        
        assert len(transactions) > 0
        assert any(t.id == test_transaction.id for t in transactions)
        
    async def test_list_transactions_filter_by_date_range(
        self, 
        db_session: AsyncSession, 
        test_household_id: str,
        test_account_id: str,
        test_category_income_id: str
    ):
        """Test filtre par plage de dates"""
        service = TransactionService(db_session)
        
        # Créer transactions à différentes dates
        await service.create_transaction(
            household_id=test_household_id,
            transaction_data=TransactionCreate(
                description="Transaction passée",
                amount=Decimal("100.00"),
                transaction_date=date.today() - timedelta(days=10),
                type=TransactionType.INCOME,
                account_id=test_account_id,
                category_id=test_category_income_id
            )
        )
        
        await service.create_transaction(
            household_id=test_household_id,
            transaction_data=TransactionCreate(
                description="Transaction récente",
                amount=Decimal("200.00"),
                transaction_date=date.today(),
                type=TransactionType.INCOME,
                account_id=test_account_id,
                category_id=test_category_income_id
            )
        )
        
        # Filtrer derniers 5 jours
        start_date = date.today() - timedelta(days=5)
        transactions = await service.list_transactions(
            household_id=test_household_id,
            start_date=start_date,
            end_date=date.today()
        )
        
        assert len(transactions) >= 1
        assert all(t.transaction_date >= start_date for t in transactions)
        
    async def test_list_transactions_filter_by_type(
        self, 
        db_session: AsyncSession, 
        test_household_id: str,
        test_account_id: str,
        test_category_income_id: str,
        test_category_expense_id: str
    ):
        """Test filtre par type"""
        service = TransactionService(db_session)
        
        # Créer revenus et dépenses
        await service.create_transaction(
            household_id=test_household_id,
            transaction_data=TransactionCreate(
                description="Revenu",
                amount=Decimal("1000.00"),
                transaction_date=date.today(),
                type=TransactionType.INCOME,
                account_id=test_account_id,
                category_id=test_category_income_id
            )
        )
        
        await service.create_transaction(
            household_id=test_household_id,
            transaction_data=TransactionCreate(
                description="Dépense",
                amount=Decimal("-50.00"),
                transaction_date=date.today(),
                type=TransactionType.EXPENSE,
                account_id=test_account_id,
                category_id=test_category_expense_id
            )
        )
        
        # Filtrer uniquement INCOME
        incomes = await service.list_transactions(
            household_id=test_household_id,
            transaction_type=TransactionType.INCOME
        )
        
        assert len(incomes) >= 1
        assert all(t.type == TransactionType.INCOME for t in incomes)
        
    # ===== UPDATE Tests =====
    
    async def test_update_transaction(
        self, 
        db_session: AsyncSession, 
        test_household_id: str,
        test_transaction: Transaction
    ):
        """Test mise à jour transaction"""
        service = TransactionService(db_session)
        
        update_data = TransactionUpdate(
            description="Description mise à jour",
            amount=Decimal("-200.00")
        )
        
        updated = await service.update_transaction(
            transaction_id=test_transaction.id,
            household_id=test_household_id,
            transaction_data=update_data
        )
        
        assert updated is not None
        assert updated.description == "Description mise à jour"
        assert updated.amount == Decimal("-200.00")
        
    # ===== SOFT DELETE Tests =====
    
    async def test_soft_delete_transaction(
        self, 
        db_session: AsyncSession, 
        test_household_id: str,
        test_transaction: Transaction
    ):
        """Test suppression douce (corbeille)"""
        service = TransactionService(db_session)
        
        deleted = await service.soft_delete_transaction(
            transaction_id=test_transaction.id,
            household_id=test_household_id
        )
        
        assert deleted is not None
        assert deleted.deleted_at is not None
        
        # Transaction n'apparaît plus dans liste normale
        transactions = await service.list_transactions(
            household_id=test_household_id,
            include_deleted=False
        )
        assert not any(t.id == test_transaction.id for t in transactions)
        
        # Mais apparaît avec include_deleted=True
        with_deleted = await service.list_transactions(
            household_id=test_household_id,
            include_deleted=True
        )
        assert any(t.id == test_transaction.id for t in with_deleted)
        
    async def test_restore_transaction(
        self, 
        db_session: AsyncSession, 
        test_household_id: str,
        test_transaction: Transaction
    ):
        """Test restauration depuis corbeille"""
        service = TransactionService(db_session)
        
        # Soft delete
        await service.soft_delete_transaction(
            transaction_id=test_transaction.id,
            household_id=test_household_id
        )
        
        # Restore
        restored = await service.restore_transaction(
            transaction_id=test_transaction.id,
            household_id=test_household_id
        )
        
        assert restored is not None
        assert restored.deleted_at is None
        
    async def test_permanent_delete_transaction(
        self, 
        db_session: AsyncSession, 
        test_household_id: str,
        test_transaction: Transaction
    ):
        """Test suppression permanente"""
        service = TransactionService(db_session)
        
        success = await service.permanent_delete_transaction(
            transaction_id=test_transaction.id,
            household_id=test_household_id
        )
        
        assert success is True
        
        # Transaction n'existe plus
        transaction = await service.get_transaction(
            transaction_id=test_transaction.id,
            household_id=test_household_id
        )
        assert transaction is None
    
    # ===== CANCEL Tests =====
    
    async def test_cancel_projected_transaction(
        self,
        db_session: AsyncSession,
        test_household_id: str,
        test_account_id: str,
        test_category_expense_id: str
    ):
        """Test annulation transaction projetée"""
        service = TransactionService(db_session)
        
        # Créer transaction future
        future_date = date.today() + timedelta(days=30)
        transaction_data = TransactionCreate(
            description="Abonnement Netflix",
            amount=Decimal("-15.99"),
            transaction_date=future_date,
            type=TransactionType.EXPENSE,
            account_id=test_account_id,
            category_id=test_category_expense_id
        )
        
        transaction = await service.create_transaction(
            household_id=test_household_id,
            transaction_data=transaction_data
        )
        
        assert transaction.state == TransactionState.PROJECTED
        
        # Annuler
        cancelled = await service.cancel_transaction(
            transaction_id=transaction.id,
            household_id=test_household_id,
            reason="Abonnement résilié"
        )
        
        assert cancelled.state == TransactionState.CANCELLED
        assert cancelled.notes == "Abonnement résilié"
    
    async def test_cancel_pending_transaction(
        self,
        db_session: AsyncSession,
        test_household_id: str,
        test_account_id: str,
        test_category_expense_id: str
    ):
        """Test annulation transaction en attente (aujourd'hui)"""
        service = TransactionService(db_session)
        
        transaction_data = TransactionCreate(
            description="Courses",
            amount=Decimal("-80.00"),
            transaction_date=date.today(),
            type=TransactionType.EXPENSE,
            account_id=test_account_id,
            category_id=test_category_expense_id
        )
        
        transaction = await service.create_transaction(
            household_id=test_household_id,
            transaction_data=transaction_data
        )
        
        assert transaction.state == TransactionState.PENDING
        
        # Annuler
        cancelled = await service.cancel_transaction(
            transaction_id=transaction.id,
            household_id=test_household_id,
            reason="Finalement pas fait"
        )
        
        assert cancelled.state == TransactionState.CANCELLED
    
    async def test_cannot_cancel_realized_transaction(
        self,
        db_session: AsyncSession,
        test_household_id: str,
        test_account_id: str,
        test_category_expense_id: str
    ):
        """Test erreur si annulation transaction réalisée (passée)"""
        service = TransactionService(db_session)
        
        # Créer transaction passée
        past_date = date.today() - timedelta(days=10)
        transaction_data = TransactionCreate(
            description="Courses passées",
            amount=Decimal("-100.00"),
            transaction_date=past_date,
            type=TransactionType.EXPENSE,
            account_id=test_account_id,
            category_id=test_category_expense_id
        )
        
        transaction = await service.create_transaction(
            household_id=test_household_id,
            transaction_data=transaction_data
        )
        
        assert transaction.state == TransactionState.REALIZED
        
        # Tenter annulation
        with pytest.raises(ValueError, match="réalisée ne peut pas être annulée"):
            await service.cancel_transaction(
                transaction_id=transaction.id,
                household_id=test_household_id,
                reason="Test"
            )
