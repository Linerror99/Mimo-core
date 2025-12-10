"""
Tests pour Recurring Templates API - Sprint 8 Coverage Improvement

Tests pour atteindre >85% de couverture sur app/api/recurring_templates.py
"""
import pytest
from httpx import AsyncClient
from datetime import date, timedelta


class TestRecurringTemplatesAPI:
    """Tests pour /api/v1/recurring-templates/*"""
    
    async def test_get_template_by_id(self, client: AsyncClient, test_user_token: str, test_account_id: str):
        """Test GET /recurring-templates/{id}"""
        # Créer un template
        create_resp = await client.post(
            "/api/v1/recurring-templates",
            headers={"Authorization": f"Bearer {test_user_token}"},
            json={
                "name": "Loyer Mensuel",
                "description": "Paiement loyer",
                "amount": 800.00,  # Must be positive
                "frequency": "MONTHLY",
                "start_date": date.today().isoformat(),
                "type": "EXPENSE",
                "day_of_month": 1,
                "account_id": test_account_id  # Required
            }
        )
        assert create_resp.status_code == 201
        template_id = create_resp.json()["id"]
        
        # GET by ID
        response = await client.get(
            f"/api/v1/recurring-templates/{template_id}",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == template_id
        assert data["name"] == "Loyer Mensuel"
        assert float(data["amount"]) == 800.00
        assert data["frequency"] == "MONTHLY"
    
    async def test_update_template(self, client: AsyncClient, test_user_token: str, test_account_id: str):
        """Test PATCH /recurring-templates/{id}"""
        # Créer un template
        create_resp = await client.post(
            "/api/v1/recurring-templates",
            headers={"Authorization": f"Bearer {test_user_token}"},
            json={
                "name": "Abonnement Original",
                "amount": 10.00,  # Positive
                "frequency": "MONTHLY",
                "start_date": date.today().isoformat(),
                "type": "EXPENSE",
                "day_of_month": 5,
                "account_id": test_account_id
            }
        )
        assert create_resp.status_code == 201
        template_id = create_resp.json()["id"]
        
        # Update
        update_resp = await client.patch(
            f"/api/v1/recurring-templates/{template_id}",
            headers={"Authorization": f"Bearer {test_user_token}"},
            json={
                "name": "Abonnement Modifié",
                "amount": 15.00  # Positive
            }
        )
        
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data["name"] == "Abonnement Modifié"
        assert float(data["amount"]) == 15.00
    
    async def test_delete_template(self, client: AsyncClient, test_user_token: str, test_account_id: str):
        """Test DELETE /recurring-templates/{id}"""
        # Créer un template
        create_resp = await client.post(
            "/api/v1/recurring-templates",
            headers={"Authorization": f"Bearer {test_user_token}"},
            json={
                "name": "Template à Supprimer",
                "amount": 50.00,  # Positive
                "frequency": "MONTHLY",
                "start_date": date.today().isoformat(),
                "type": "EXPENSE",
                "day_of_month": 10,
                "account_id": test_account_id
            }
        )
        assert create_resp.status_code == 201
        template_id = create_resp.json()["id"]
        
        # Delete
        delete_resp = await client.delete(
            f"/api/v1/recurring-templates/{template_id}",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert delete_resp.status_code == 204
        
        # Vérifier que le template n'existe plus
        get_resp = await client.get(
            f"/api/v1/recurring-templates/{template_id}",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert get_resp.status_code == 404
    
    async def test_cannot_get_nonexistent_template(self, client: AsyncClient, test_user_token: str):
        """Test GET avec ID inexistant → 404"""
        response = await client.get(
            "/api/v1/recurring-templates/nonexistent-id-12345",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 404
    
    async def test_cannot_update_nonexistent_template(self, client: AsyncClient, test_user_token: str):
        """Test PATCH avec ID inexistant → 404"""
        response = await client.patch(
            "/api/v1/recurring-templates/nonexistent-id-12345",
            headers={"Authorization": f"Bearer {test_user_token}"},
            json={"name": "New Name"}
        )
        
        assert response.status_code == 404
    
    async def test_cannot_delete_nonexistent_template(self, client: AsyncClient, test_user_token: str):
        """Test DELETE avec ID inexistant → 404"""
        response = await client.delete(
            "/api/v1/recurring-templates/nonexistent-id-12345",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 404
    
    async def test_create_template_with_different_frequencies(self, client: AsyncClient, test_user_token: str, test_account_id: str):
        """Test création de templates avec différentes fréquences"""
        # Map frequency to required params
        frequency_configs = [
            ("WEEKLY", {"day_of_week": 1}),  # Monday
            ("MONTHLY", {"day_of_month": 15}),
            ("YEARLY", {"day_of_month": 1})
        ]
        
        for freq, extra_params in frequency_configs:
            payload = {
                "name": f"Template {freq}",
                "amount": 20.00,  # Positive
                "frequency": freq,
                "start_date": date.today().isoformat(),
                "type": "EXPENSE",
                "account_id": test_account_id
            }
            payload.update(extra_params)
            
            response = await client.post(
                "/api/v1/recurring-templates",
                headers={"Authorization": f"Bearer {test_user_token}"},
                json=payload
            )
            
            assert response.status_code == 201
            assert response.json()["frequency"] == freq
    
    async def test_create_template_with_end_date(self, client: AsyncClient, test_user_token: str, test_account_id: str):
        """Test création de template avec end_date"""
        start = date.today()
        end = start + timedelta(days=365)
        
        response = await client.post(
            "/api/v1/recurring-templates",
            headers={"Authorization": f"Bearer {test_user_token}"},
            json={
                "name": "Template avec End Date",
                "amount": 200.00,  # Positive
                "frequency": "MONTHLY",
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "type": "EXPENSE",
                "day_of_month": 20,
                "account_id": test_account_id
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["end_date"] is not None
    
    async def test_templates_require_authentication(self, client: AsyncClient):
        """Test que les endpoints templates nécessitent auth"""
        response = await client.get("/api/v1/recurring-templates")
        assert response.status_code == 403
        
        response2 = await client.post("/api/v1/recurring-templates", json={
            "name": "Test",
            "amount": -10.00,
            "frequency": "MONTHLY",
            "start_date": date.today().isoformat(),
            "type": "EXPENSE"
        })
        assert response2.status_code == 403
