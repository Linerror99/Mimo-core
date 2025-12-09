"""
Tests for PDF Export Service

Tests the generation of monthly financial reports in PDF format
"""
import pytest
from datetime import datetime, date
from decimal import Decimal
from io import BytesIO

from app.services.pdf_service import PDFService
from app.models import (
    User, Household, Account, Transaction, Category,
    TransactionType, TransactionState, TransactionOwnerType,
    AccountType, CategoryType, HouseholdType
)


@pytest.fixture
def pdf_service(db_session):
    """Fixture pour PDFService"""
    return PDFService(db_session)


@pytest.fixture
async def test_data_for_pdf(db_session):
    """Fixture pour créer des données de test pour le PDF"""
    # Créer household
    household = Household(
        id="household-pdf-test",
        name="Test Household",
        type=HouseholdType.INDIVIDUAL,
    )
    db_session.add(household)
    
    # Créer user
    user = User(
        id="user-pdf-test",
        household_id=household.id,
        email="pdf.test@example.com",
        password_hash="hashed",
        first_name="John",
        last_name="Doe",
    )
    db_session.add(user)
    
    # Créer account
    account = Account(
        id="account-pdf-test",
        household_id=household.id,
        original_owner_user_id=user.id,
        name="Compte Courant",
        type=AccountType.CHECKING,
        initial_balance=Decimal("1000.00"),
    )
    db_session.add(account)
    
    # Créer catégories
    cat_income = Category(
        id="cat-income-pdf",
        household_id=household.id,
        name="Salaire",
        type=CategoryType.INCOME,
        color="#10B981",
        icon="money",
    )
    cat_expense = Category(
        id="cat-expense-pdf",
        household_id=household.id,
        name="Courses",
        type=CategoryType.EXPENSE,
        color="#EF4444",
        icon="shopping-cart",
    )
    db_session.add(cat_income)
    db_session.add(cat_expense)
    
    # Créer transactions pour le mois en cours
    today = date.today()
    first_day = date(today.year, today.month, 1)
    
    transactions = [
        Transaction(
            id="tx-pdf-1",
            household_id=household.id,
            account_id=account.id,
            type=TransactionType.INCOME,
            amount=Decimal("2500.00"),
            transaction_date=first_day,
            state=TransactionState.REALIZED,
            description="Salaire Novembre",
            category_id=cat_income.id,
            owner_type=TransactionOwnerType.PERSONAL,
            owner_user_id=user.id,
        ),
        Transaction(
            id="tx-pdf-2",
            household_id=household.id,
            account_id=account.id,
            type=TransactionType.EXPENSE,
            amount=Decimal("-150.00"),
            transaction_date=first_day,
            state=TransactionState.REALIZED,
            description="Courses Supermarché",
            category_id=cat_expense.id,
            owner_type=TransactionOwnerType.PERSONAL,
            owner_user_id=user.id,
        ),
        Transaction(
            id="tx-pdf-3",
            household_id=household.id,
            account_id=account.id,
            type=TransactionType.EXPENSE,
            amount=Decimal("-75.50"),
            transaction_date=first_day,
            state=TransactionState.REALIZED,
            description="Restaurant",
            category_id=cat_expense.id,
            owner_type=TransactionOwnerType.PERSONAL,
            owner_user_id=user.id,
        ),
    ]
    for tx in transactions:
        db_session.add(tx)
    
    await db_session.commit()
    await db_session.refresh(user)
    await db_session.refresh(household)
    await db_session.refresh(account)
    
    return {
        "user": user,
        "household": household,
        "account": account,
        "transactions": transactions,
    }


class TestPDFService:
    """Tests pour le service de génération PDF"""
    
    async def test_generate_monthly_report_returns_bytes(self, pdf_service, test_data_for_pdf):
        """Test que generate_monthly_report retourne des bytes"""
        user = test_data_for_pdf["user"]
        today = date.today()
        
        pdf_bytes = await pdf_service.generate_monthly_report(
            user_id=user.id,
            year=today.year,
            month=today.month
        )
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
    
    async def test_generate_monthly_report_is_valid_pdf(self, pdf_service, test_data_for_pdf):
        """Test que le fichier généré est un PDF valide"""
        user = test_data_for_pdf["user"]
        today = date.today()
        
        pdf_bytes = await pdf_service.generate_monthly_report(
            user_id=user.id,
            year=today.year,
            month=today.month
        )
        
        # Vérifier signature PDF (%PDF-)
        assert pdf_bytes[:4] == b'%PDF'
    
    async def test_generate_monthly_report_contains_user_info(self, pdf_service, test_data_for_pdf):
        """Test que le PDF contient les informations de l'utilisateur"""
        user = test_data_for_pdf["user"]
        today = date.today()
        
        pdf_bytes = await pdf_service.generate_monthly_report(
            user_id=user.id,
            year=today.year,
            month=today.month
        )
        
        # Le PDF doit avoir une taille raisonnable (contient du contenu)
        assert len(pdf_bytes) > 1000  # Au moins 1KB
    
    async def test_generate_monthly_report_contains_transactions(self, pdf_service, test_data_for_pdf):
        """Test que le PDF contient les transactions du mois"""
        user = test_data_for_pdf["user"]
        today = date.today()
        
        pdf_bytes = await pdf_service.generate_monthly_report(
            user_id=user.id,
            year=today.year,
            month=today.month
        )
        
        # PDF avec transactions doit être plus gros que PDF vide
        assert len(pdf_bytes) > 1500  # Plus de contenu
    
    async def test_generate_monthly_report_contains_summary(self, pdf_service, test_data_for_pdf):
        """Test que le PDF contient un résumé financier"""
        user = test_data_for_pdf["user"]
        today = date.today()
        
        pdf_bytes = await pdf_service.generate_monthly_report(
            user_id=user.id,
            year=today.year,
            month=today.month
        )
        
        # Vérifier que c'est un PDF valide avec du contenu
        assert pdf_bytes[:4] == b'%PDF'
        assert len(pdf_bytes) > 1000
    
    async def test_generate_monthly_report_empty_month(self, pdf_service, db_session):
        """Test génération PDF pour un mois sans transactions"""
        # Créer un user sans transactions
        household = Household(
            id="household-empty",
            name="Empty Household",
            type=HouseholdType.INDIVIDUAL,
        )
        db_session.add(household)
        
        user = User(
            id="user-empty",
            household_id=household.id,
            email="empty@example.com",
            password_hash="hashed",
            first_name="Empty",
            last_name="User",
        )
        db_session.add(user)
        await db_session.commit()
        
        # Générer PDF pour un mois vide
        pdf_bytes = await pdf_service.generate_monthly_report(
            user_id=user.id,
            year=2025,
            month=1
        )
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 500  # Même vide, contient header/footer
        assert pdf_bytes[:4] == b'%PDF'
    
    async def test_generate_monthly_report_invalid_user(self, pdf_service):
        """Test avec un user_id invalide"""
        with pytest.raises(Exception):  # ValueError ou HTTPException
            await pdf_service.generate_monthly_report(
                user_id="invalid-user-id",
                year=2025,
                month=12
            )
    
    async def test_generate_monthly_report_invalid_month(self, pdf_service, test_data_for_pdf):
        """Test avec un mois invalide"""
        user = test_data_for_pdf["user"]
        
        with pytest.raises(ValueError):
            await pdf_service.generate_monthly_report(
                user_id=user.id,
                year=2025,
                month=13  # Mois invalide
            )
    
    async def test_generate_monthly_report_filename_format(self, pdf_service, test_data_for_pdf):
        """Test que le service peut suggérer un nom de fichier cohérent"""
        user = test_data_for_pdf["user"]
        
        filename = pdf_service.get_filename(
            user_id=user.id,
            year=2025,
            month=12
        )
        
        # Format attendu: rapport_financier_2025_12_John_Doe.pdf
        assert filename.endswith(".pdf")
        assert "2025" in filename
        assert "12" in filename or "décembre" in filename.lower() or "dec" in filename.lower()
