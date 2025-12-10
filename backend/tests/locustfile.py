"""
Locust Load Testing Configuration for DuoFlow Finance

Tests de charge pour identifier les bottlenecks de performance.

Usage:
    # Dans le container backend
    locust -f tests/locustfile.py --host=http://localhost:8000
    
    # Puis ouvre http://localhost:8089 pour la UI
    # Configure: 100 users, spawn rate 10/s

Endpoints testés:
    - Login/Register (authentification)
    - Liste transactions (GET avec pagination)
    - Création transaction (POST)
    - Dashboard (GET avec agrégations)
    - Goals (GET + POST)
"""

from locust import HttpUser, task, between, SequentialTaskSet
import random
import json
from datetime import datetime, timedelta


class UserBehavior(SequentialTaskSet):
    """
    Simule le comportement d'un utilisateur réel :
    1. Register/Login
    2. Consulte le dashboard
    3. Crée des transactions
    4. Consulte la timeline
    5. Gère ses objectifs
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.access_token = None
        self.user_id = None
        self.household_id = None
        self.account_id = None
        self.category_ids = []
        
    def on_start(self):
        """Exécuté au démarrage de chaque utilisateur virtuel."""
        # Générer un email unique pour chaque utilisateur
        timestamp = datetime.now().timestamp()
        random_id = random.randint(1000, 9999)
        self.email = f"loadtest_{timestamp}_{random_id}@test.com"
        self.password = "LoadTest123!"
        
        # S'inscrire
        self.register()
        # Se connecter
        self.login()
        
    def register(self):
        """Inscription d'un nouvel utilisateur."""
        response = self.client.post(
            "/api/v1/auth/register",
            json={
                "email": self.email,
                "password": self.password,
                "first_name": "Load",
                "last_name": "Test"
            },
            name="01_register"
        )
        
        if response.status_code == 201:
            data = response.json()
            self.access_token = data.get("access_token")
            self.user_id = data.get("user", {}).get("id")
            self.household_id = data.get("user", {}).get("household_id")
    
    def login(self):
        """Connexion utilisateur (si register échoue)."""
        if self.access_token:
            return
            
        response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": self.email,
                "password": self.password
            },
            name="02_login"
        )
        
        if response.status_code == 200:
            data = response.json()
            self.access_token = data.get("access_token")
            self.user_id = data.get("user", {}).get("id")
            self.household_id = data.get("user", {}).get("household_id")
    
    def _headers(self):
        """Headers avec token JWT."""
        if not self.access_token:
            return {}
        return {"Authorization": f"Bearer {self.access_token}"}
    
    @task(1)
    def get_user_profile(self):
        """Récupère le profil utilisateur (endpoint léger)."""
        if not self.access_token:
            return
        self.client.get(
            "/api/v1/users/me",
            headers=self._headers(),
            name="03_get_profile"
        )
    
    @task(3)
    def list_accounts(self):
        """Liste les comptes (endpoint fréquent)."""
        if not self.access_token:
            return
        response = self.client.get(
            "/api/v1/accounts",
            headers=self._headers(),
            name="04_list_accounts"
        )
        
        if response.status_code == 200 and not self.account_id:
            accounts = response.json()
            if accounts:
                self.account_id = accounts[0]["id"]
    
    @task(5)
    def list_transactions(self):
        """Liste les transactions avec filtres de date (endpoint le plus utilisé)."""
        if not self.access_token:
            return
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        self.client.get(
            f"/api/v1/transactions?start_date={start_date}&end_date={end_date}",
            headers=self._headers(),
            name="05_list_transactions"
        )
    
    @task(2)
    def create_transaction(self):
        """Crée une nouvelle transaction (POST lourd)."""
        if not self.account_id:
            return
            
        if not self.category_ids:
            # Récupérer les catégories
            response = self.client.get(
                "/api/v1/categories",
                headers=self._headers()
            )
            if response.status_code == 200:
                categories = response.json()
                self.category_ids = [c["id"] for c in categories if c["type"] == "EXPENSE"]
        
        if not self.category_ids:
            return
        
        transaction_data = {
            "description": f"Test Load {random.randint(1, 1000)}",
            "amount": round(random.uniform(10.0, 500.0), 2),
            "transaction_date": datetime.now().strftime("%Y-%m-%d"),
            "type": "EXPENSE",
            "account_id": self.account_id,
            "category_id": random.choice(self.category_ids),
            "state": "REALIZED"
        }
        
        self.client.post(
            "/api/v1/transactions",
            json=transaction_data,
            headers=self._headers(),
            name="06_create_transaction"
        )
    
    @task(2)
    def list_categories(self):
        """Liste les catégories."""
        if not self.access_token:
            return
        self.client.get(
            "/api/v1/categories",
            headers=self._headers(),
            name="07_list_categories"
        )
    
    @task(2)
    def list_goals(self):
        """Liste les objectifs."""
        if not self.access_token:
            return
        self.client.get(
            "/api/v1/goals",
            headers=self._headers(),
            name="08_list_goals"
        )
    
    @task(1)
    def get_wallet_balance(self):
        """Calcule le solde du wallet (endpoint avec calculs lourds)."""
        if not self.access_token:
            return
        self.client.get(
            "/api/v1/wallets/balance",
            headers=self._headers(),
            name="09_wallet_balance"
        )
    
    @task(1)
    def list_pending_transactions(self):
        """Liste les transactions en attente de validation."""
        if not self.access_token:
            return
        self.client.get(
            "/api/v1/transactions/pending",
            headers=self._headers(),
            name="10_pending_transactions"
        )


class WebsiteUser(HttpUser):
    """
    Utilisateur Locust simulant un utilisateur réel.
    
    Configuration:
    - wait_time: Temps d'attente entre chaque tâche (1 à 3 secondes)
    - tasks: Comportement séquentiel défini dans UserBehavior
    """
    tasks = [UserBehavior]
    wait_time = between(1, 3)  # Attend 1 à 3 secondes entre chaque action
    
    # Host par défaut (peut être surchargé en ligne de commande)
    host = "http://localhost:8000"
