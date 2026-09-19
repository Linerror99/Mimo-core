"""
Tests pour l'API Projections (/api/v1/projections)
Vérification des projections mensuelles et de la nouvelle route /range par lot
"""
from datetime import date
from dateutil.relativedelta import relativedelta
from httpx import AsyncClient
import pytest


class TestProjectionsAPI:
    """Tests pour les endpoints de projection financière"""

    async def test_get_monthly_projection(self, client: AsyncClient, test_user_token: str):
        """Tester la récupération d'un mois spécifique"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = date.today()

        response = await client.get(
            f"/api/v1/projections/monthly/{today.year}/{today.month}",
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "month" in data
        assert "year" in data
        assert data["month"] == today.month
        assert data["year"] == today.year
        assert "income" in data
        assert "expense" in data
        assert "transfers" in data
        assert "balance" in data
        assert "treasury_balance" in data
        assert isinstance(data["projections"], list)

    async def test_get_projections_range_basic(self, client: AsyncClient, test_user_token: str):
        """Tester la récupération d'une plage de 6 mois via /range"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = date.today()
        end_date = today + relativedelta(months=5)

        response = await client.get(
            f"/api/v1/projections/range?start_year={today.year}&start_month={today.month}&end_year={end_date.year}&end_month={end_date.month}",
            headers=headers
        )

        assert response.status_code == 200
        projections = response.json()
        assert isinstance(projections, list)
        assert len(projections) == 6

        # Vérifier que chaque mois a les champs attendus
        for proj in projections:
            assert "month" in proj
            assert "year" in proj
            assert "income" in proj
            assert "expense" in proj
            assert "balance" in proj
            assert "treasury_balance" in proj
            assert "projections" in proj

    async def test_get_projections_range_two_years(self, client: AsyncClient, test_user_token: str):
        """Tester une projection sur 2 ans (24 mois) en une seule requête ultra-rapide"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = date.today()
        end_date = today + relativedelta(months=23)

        response = await client.get(
            f"/api/v1/projections/range?start_year={today.year}&start_month={today.month}&end_year={end_date.year}&end_month={end_date.month}",
            headers=headers
        )

        assert response.status_code == 200
        projections = response.json()
        assert len(projections) == 24
        # Vérifier l'ordre chronologique
        assert projections[0]["year"] == today.year
        assert projections[0]["month"] == today.month
        assert projections[-1]["year"] == end_date.year
        assert projections[-1]["month"] == end_date.month

    async def test_get_projections_range_five_years(self, client: AsyncClient, test_user_token: str):
        """Tester une projection sur 5 ans (60 mois)"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = date.today()
        end_date = today + relativedelta(months=59)

        response = await client.get(
            f"/api/v1/projections/range?start_year={today.year}&start_month={today.month}&end_year={end_date.year}&end_month={end_date.month}",
            headers=headers
        )

        assert response.status_code == 200
        projections = response.json()
        assert len(projections) == 60

    async def test_get_projections_range_inverted_dates(self, client: AsyncClient, test_user_token: str):
        """Tester que start > end est corrigé sans erreur 500"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = date.today()

        response = await client.get(
            f"/api/v1/projections/range?start_year={today.year + 2}&start_month=1&end_year={today.year}&end_month=1",
            headers=headers
        )

        assert response.status_code == 200
        projections = response.json()
        assert len(projections) >= 1
