"""
Tests pour get_next_occurrence helper

Tests TDD pour calcul de la prochaine occurrence d'une récurrence.
"""
from datetime import date

from app.models import Frequency
from app.services.projection_service import get_next_occurrence


class TestGetNextOccurrence:
    """Tests pour le helper get_next_occurrence"""

    def test_weekly_next_occurrence(self):
        """Test récurrence hebdomadaire"""
        # Partir du 1er décembre 2025 (lundi), next occurrence pour dimanche (6)
        current_date = date(2025, 12, 1)  # Lundi
        day_of_week = 6  # Dimanche

        next_date = get_next_occurrence(
            current_date=current_date,
            frequency=Frequency.WEEKLY,
            day_of_week=day_of_week
        )

        # Le prochain dimanche est le 7 décembre
        assert next_date == date(2025, 12, 7)

    def test_weekly_same_day(self):
        """Test récurrence hebdomadaire quand on est déjà le bon jour"""
        # Si on est dimanche, le prochain dimanche est dans 7 jours
        current_date = date(2025, 12, 7)  # Dimanche
        day_of_week = 6  # Dimanche

        next_date = get_next_occurrence(
            current_date=current_date,
            frequency=Frequency.WEEKLY,
            day_of_week=day_of_week
        )

        assert next_date == date(2025, 12, 14)

    def test_monthly_next_occurrence(self):
        """Test récurrence mensuelle"""
        # 15 décembre, prochain 1er du mois
        current_date = date(2025, 12, 15)
        day_of_month = 1

        next_date = get_next_occurrence(
            current_date=current_date,
            frequency=Frequency.MONTHLY,
            day_of_month=day_of_month
        )

        # Le prochain 1er est en janvier 2026
        assert next_date == date(2026, 1, 1)

    def test_monthly_same_day(self):
        """Test récurrence mensuelle quand on est le bon jour"""
        # 1er décembre, prochain 1er du mois
        current_date = date(2025, 12, 1)
        day_of_month = 1

        next_date = get_next_occurrence(
            current_date=current_date,
            frequency=Frequency.MONTHLY,
            day_of_month=day_of_month
        )

        # Le prochain 1er est en janvier 2026
        assert next_date == date(2026, 1, 1)

    def test_monthly_day_31_in_february(self):
        """Test récurrence mensuelle jour 31 en février (ajuster au dernier jour)"""
        current_date = date(2025, 1, 31)
        day_of_month = 31

        next_date = get_next_occurrence(
            current_date=current_date,
            frequency=Frequency.MONTHLY,
            day_of_month=day_of_month
        )

        # Février 2025 a 28 jours, donc on ajuste au 28
        assert next_date == date(2025, 2, 28)

    def test_quarterly_next_occurrence(self):
        """Test récurrence trimestrielle (tous les 3 mois)"""
        current_date = date(2025, 12, 15)
        day_of_month = 31

        next_date = get_next_occurrence(
            current_date=current_date,
            frequency=Frequency.QUARTERLY,
            day_of_month=day_of_month
        )

        # Depuis 15/12, le prochain 31 du mois en cours est le 31/12 (avant la fin du mois)
        expected = date(2025, 12, 31)
        assert next_date == expected

    def test_quarterly_current_month(self):
        """Test récurrence trimestrielle dans le mois en cours"""
        current_date = date(2025, 12, 1)
        day_of_month = 31

        next_date = get_next_occurrence(
            current_date=current_date,
            frequency=Frequency.QUARTERLY,
            day_of_month=day_of_month
        )

        # Le 31 décembre est encore dans le futur, donc on le prend
        assert next_date == date(2025, 12, 31)

    def test_yearly_next_occurrence(self):
        """Test récurrence annuelle"""
        current_date = date(2025, 12, 15)
        day_of_month = 1

        # On suppose que start_date est le 1er janvier
        start_date = date(2025, 1, 1)

        next_date = get_next_occurrence(
            current_date=current_date,
            frequency=Frequency.YEARLY,
            day_of_month=day_of_month,
            start_date=start_date
        )

        # Prochain 1er janvier
        assert next_date == date(2026, 1, 1)

    def test_yearly_before_anniversary(self):
        """Test récurrence annuelle avant l'anniversaire"""
        current_date = date(2025, 11, 1)
        day_of_month = 15

        # Start date: 15 décembre 2024
        start_date = date(2024, 12, 15)

        next_date = get_next_occurrence(
            current_date=current_date,
            frequency=Frequency.YEARLY,
            day_of_month=day_of_month,
            start_date=start_date
        )

        # Prochain 15 décembre (pas encore passé cette année)
        assert next_date == date(2025, 12, 15)

    def test_custom_next_occurrence(self):
        """Test récurrence personnalisée (tous les X jours)"""
        current_date = date(2025, 12, 1)
        custom_days = 15

        next_date = get_next_occurrence(
            current_date=current_date,
            frequency=Frequency.CUSTOM,
            custom_days=custom_days
        )

        # 15 jours après le 1er décembre
        assert next_date == date(2025, 12, 16)

    def test_custom_7_days(self):
        """Test récurrence tous les 7 jours"""
        current_date = date(2025, 12, 10)
        custom_days = 7

        next_date = get_next_occurrence(
            current_date=current_date,
            frequency=Frequency.CUSTOM,
            custom_days=custom_days
        )

        assert next_date == date(2025, 12, 17)

    def test_custom_30_days_across_months(self):
        """Test récurrence tous les 30 jours traversant les mois"""
        current_date = date(2025, 12, 15)
        custom_days = 30

        next_date = get_next_occurrence(
            current_date=current_date,
            frequency=Frequency.CUSTOM,
            custom_days=custom_days
        )

        # 30 jours après le 15 décembre = 14 janvier 2026
        assert next_date == date(2026, 1, 14)
