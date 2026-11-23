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

    async def test_get_projections_range_custom_dates_min_balance_and_exclude_income(
        self,
        client: AsyncClient,
        test_user_token: str,
        db_session,
        test_user_household_id: str,
    ):
        """
        Scénario salaire en fin de mois :
        - Solde actuel : 8 000 €
        - Mois prochain le 5 : charges -1 500 € -> point bas = 6 500 €
        - Mois prochain le 28 : salaire +2 000 € -> fin de mois = 8 500 €
        Vérifie :
        1. `min_balance` capture bien 6 500 € (avant salaire) même si `balance` = 8 500 €
        2. `end_date` au 25 du mois prochain exclut le salaire du 28 -> `balance` = 6 500 €
        3. `exclude_future_income=true` ignore le salaire -> `balance` = 6 500 €
        """
        from decimal import Decimal
        from app.models import Account, AccountType, Transaction, TransactionState, TransactionType

        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = date.today()
        next_month_first = (today.replace(day=1) + relativedelta(months=1))
        charge_date = next_month_first.replace(day=5)
        cutoff_date = next_month_first.replace(day=25)
        salary_date = next_month_first.replace(day=28)

        acc = Account(
            household_id=test_user_household_id,
            name="Courant Projection",
            type=AccountType.CHECKING,
            initial_balance=Decimal("8000.00"),
        )
        db_session.add(acc)
        await db_session.flush()

        charge_tx = Transaction(
            household_id=test_user_household_id,
            account_id=acc.id,
            description="Loyer + charges",
            amount=Decimal("-1500.00"),
            transaction_date=charge_date,
            type=TransactionType.EXPENSE,
            state=TransactionState.PROJECTED,
        )
        salary_tx = Transaction(
            household_id=test_user_household_id,
            account_id=acc.id,
            description="Salaire fin de mois",
            amount=Decimal("2000.00"),
            transaction_date=salary_date,
            type=TransactionType.INCOME,
            state=TransactionState.PROJECTED,
        )
        db_session.add_all([charge_tx, salary_tx])
        await db_session.commit()

        # 1. Plage complète incluant le 28 : balance = 8500, mais min_balance = 6500 !
        res_full = await client.get(
            f"/api/v1/projections/range?start_year={next_month_first.year}&start_month={next_month_first.month}&end_year={next_month_first.year}&end_month={next_month_first.month}",
            headers=headers,
        )
        assert res_full.status_code == 200
        m_full = res_full.json()[0]
        assert m_full["balance"] == pytest.approx(8500.0)
        assert m_full["min_balance"] == pytest.approx(6500.0)

        # 2. Plage personnalisée coupée au 25 (avant le salaire du 28) -> balance = 6500
        res_cutoff = await client.get(
            f"/api/v1/projections/range?start_date={next_month_first.isoformat()}&end_date={cutoff_date.isoformat()}",
            headers=headers,
        )
        assert res_cutoff.status_code == 200
        m_cutoff = res_cutoff.json()[0]
        assert m_cutoff["income"] == pytest.approx(0.0)
        assert m_cutoff["balance"] == pytest.approx(6500.0)

        # 3. Mode exclude_future_income=true -> ignore le salaire -> balance = 6500
        res_no_inc = await client.get(
            f"/api/v1/projections/range?start_year={next_month_first.year}&start_month={next_month_first.month}&end_year={next_month_first.year}&end_month={next_month_first.month}&exclude_future_income=true",
            headers=headers,
        )
        assert res_no_inc.status_code == 200
        m_no_inc = res_no_inc.json()[0]
        assert m_no_inc["income"] == pytest.approx(0.0)
        assert m_no_inc["balance"] == pytest.approx(6500.0)
