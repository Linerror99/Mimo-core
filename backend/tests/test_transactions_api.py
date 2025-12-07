"""
Transaction API Integration Tests

Tests des endpoints API transactions
"""
import pytest
from httpx import AsyncClient
from datetime import date, timedelta
from decimal import Decimal


pytestmark = pytest.mark.asyncio


class TestTransactionAPI:
    """Tests d'intégration pour l'API transactions"""
    
    # ===== CREATE Tests =====
    
    async def test_create_income_transaction(
        self,
        client: AsyncClient,
        test_user_token: str,
        test_user_household_id: str
    ):
        """Test création transaction revenu via API"""
        # Créer d'abord un compte et une catégorie
        account_response = await client.post(
            "/api/v1/accounts",
            json={
                "name": "Mon Compte",
                "type": "CHECKING",
                "initial_balance": "1000.00",
                "currency": "EUR"
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert account_response.status_code == 201
        account_id = account_response.json()["id"]
        
        category_response = await client.post(
            "/api/v1/categories",
            json={
                "name": "Salaire",
                "type": "INCOME",
                "icon": "💰",
                "color": "#00FF00"
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert category_response.status_code == 201
        category_id = category_response.json()["id"]
        
        # Créer transaction
        response = await client.post(
            "/api/v1/transactions",
            json={
                "description": "Salaire mensuel",
                "amount": "3000.00",
                "transaction_date": str(date.today()),
                "type": "INCOME",
                "account_id": account_id,
                "category_id": category_id,
                "notes": "Salaire du mois"
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["description"] == "Salaire mensuel"
        assert float(data["amount"]) == 3000.00
        assert data["type"] == "INCOME"
        assert data["state"] == "PENDING"  # Sprint 5: today = PENDING
        assert data["recurrence_frequency"] == "NONE"
    
    async def test_create_expense_transaction(
        self,
        client: AsyncClient,
        test_user_token: str
    ):
        """Test création transaction dépense via API"""
        # Créer compte et catégorie
        account_response = await client.post(
            "/api/v1/accounts",
            json={
                "name": "Mon Compte",
                "type": "CHECKING",
                "initial_balance": "1000.00"
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        account_id = account_response.json()["id"]
        
        category_response = await client.post(
            "/api/v1/categories",
            json={
                "name": "Courses",
                "type": "EXPENSE",
                "icon": "🛒",
                "color": "#FF0000"
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        category_id = category_response.json()["id"]
        
        # Créer transaction
        response = await client.post(
            "/api/v1/transactions",
            json={
                "description": "Courses alimentaires",
                "amount": "-150.50",
                "transaction_date": str(date.today()),
                "type": "EXPENSE",
                "account_id": account_id,
                "category_id": category_id
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["type"] == "EXPENSE"
        assert data["amount"] == "-150.50"
    
    async def test_create_future_transaction(
        self,
        client: AsyncClient,
        test_user_token: str
    ):
        """Test création transaction future (PROJECTED)"""
        # Créer compte et catégorie
        account_response = await client.post(
            "/api/v1/accounts",
            json={"name": "Mon Compte", "type": "CHECKING", "initial_balance": "1000.00"},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        account_id = account_response.json()["id"]
        
        category_response = await client.post(
            "/api/v1/categories",
            json={"name": "Salaire", "type": "INCOME", "icon": "💰"},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        category_id = category_response.json()["id"]
        
        # Créer transaction future
        future_date = date.today() + timedelta(days=30)
        response = await client.post(
            "/api/v1/transactions",
            json={
                "description": "Salaire futur",
                "amount": "3000.00",
                "transaction_date": str(future_date),
                "type": "INCOME",
                "account_id": account_id,
                "category_id": category_id
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["state"] == "PROJECTED"
    
    # ===== READ Tests =====
    
    async def test_list_transactions(
        self,
        client: AsyncClient,
        test_user_token: str
    ):
        """Test liste transactions"""
        response = await client.get(
            "/api/v1/transactions",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    async def test_get_transaction_by_id(
        self,
        client: AsyncClient,
        test_user_token: str
    ):
        """Test récupération transaction par ID"""
        # Créer compte, catégorie et transaction
        account_response = await client.post(
            "/api/v1/accounts",
            json={"name": "Mon Compte", "type": "CHECKING", "initial_balance": "1000.00"},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        account_id = account_response.json()["id"]
        
        category_response = await client.post(
            "/api/v1/categories",
            json={"name": "Courses", "type": "EXPENSE"},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        category_id = category_response.json()["id"]
        
        create_response = await client.post(
            "/api/v1/transactions",
            json={
                "description": "Test transaction",
                "amount": "-50.00",
                "transaction_date": str(date.today()),
                "type": "EXPENSE",
                "account_id": account_id,
                "category_id": category_id
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        transaction_id = create_response.json()["id"]
        
        # Récupérer
        response = await client.get(
            f"/api/v1/transactions/{transaction_id}",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == transaction_id
    
    # ===== UPDATE Tests =====
    
    async def test_update_transaction(
        self,
        client: AsyncClient,
        test_user_token: str
    ):
        """Test mise à jour transaction"""
        # Créer transaction
        account_response = await client.post(
            "/api/v1/accounts",
            json={"name": "Mon Compte", "type": "CHECKING", "initial_balance": "1000.00"},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        account_id = account_response.json()["id"]
        
        category_response = await client.post(
            "/api/v1/categories",
            json={"name": "Courses", "type": "EXPENSE"},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        category_id = category_response.json()["id"]
        
        create_response = await client.post(
            "/api/v1/transactions",
            json={
                "description": "Test",
                "amount": "-50.00",
                "transaction_date": str(date.today()),
                "type": "EXPENSE",
                "account_id": account_id,
                "category_id": category_id
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        transaction_id = create_response.json()["id"]
        
        # Mettre à jour
        response = await client.patch(
            f"/api/v1/transactions/{transaction_id}",
            json={
                "description": "Description mise à jour",
                "amount": "-75.00"
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "Description mise à jour"
        assert data["amount"] == "-75.00"
    
    # ===== DELETE Tests =====
    
    async def test_soft_delete_transaction(
        self,
        client: AsyncClient,
        test_user_token: str
    ):
        """Test soft delete (corbeille)"""
        # Créer transaction
        account_response = await client.post(
            "/api/v1/accounts",
            json={"name": "Mon Compte", "type": "CHECKING", "initial_balance": "1000.00"},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        account_id = account_response.json()["id"]
        
        category_response = await client.post(
            "/api/v1/categories",
            json={"name": "Courses", "type": "EXPENSE"},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        category_id = category_response.json()["id"]
        
        create_response = await client.post(
            "/api/v1/transactions",
            json={
                "description": "Test",
                "amount": "-50.00",
                "transaction_date": str(date.today()),
                "type": "EXPENSE",
                "account_id": account_id,
                "category_id": category_id
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        transaction_id = create_response.json()["id"]
        
        # Soft delete
        response = await client.delete(
            f"/api/v1/transactions/{transaction_id}",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 204
        
        # Vérifier qu'elle n'apparaît plus dans liste normale
        list_response = await client.get(
            "/api/v1/transactions",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        transactions = list_response.json()
        assert not any(t["id"] == transaction_id for t in transactions)
        
        # Mais apparaît dans corbeille
        trash_response = await client.get(
            "/api/v1/transactions/trash",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        trash_transactions = trash_response.json()
        assert any(t["id"] == transaction_id for t in trash_transactions)
    
    async def test_restore_transaction(
        self,
        client: AsyncClient,
        test_user_token: str
    ):
        """Test restauration depuis corbeille"""
        # Créer et supprimer transaction
        account_response = await client.post(
            "/api/v1/accounts",
            json={"name": "Mon Compte", "type": "CHECKING", "initial_balance": "1000.00"},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        account_id = account_response.json()["id"]
        
        category_response = await client.post(
            "/api/v1/categories",
            json={"name": "Courses", "type": "EXPENSE"},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        category_id = category_response.json()["id"]
        
        create_response = await client.post(
            "/api/v1/transactions",
            json={
                "description": "Test",
                "amount": "-50.00",
                "transaction_date": str(date.today()),
                "type": "EXPENSE",
                "account_id": account_id,
                "category_id": category_id
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        transaction_id = create_response.json()["id"]
        
        await client.delete(
            f"/api/v1/transactions/{transaction_id}",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        # Restaurer
        response = await client.patch(
            f"/api/v1/transactions/{transaction_id}/restore",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["deleted_at"] is None
