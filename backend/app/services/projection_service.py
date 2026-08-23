"""
Projection Service

Service pour générer les projections de transactions récurrentes.
Calcule les prochaines occurrences basées sur la fréquence.
"""
from calendar import monthrange
from datetime import date, timedelta
from typing import List, Optional

from dateutil.relativedelta import relativedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Account, Frequency, RecurringTemplate, Transaction


def get_next_occurrence(
    current_date: date,
    frequency: Frequency,
    day_of_month: Optional[int] = None,
    day_of_week: Optional[int] = None,
    custom_days: Optional[int] = None,
    start_date: Optional[date] = None
) -> date:
    """
    Calculer la prochaine occurrence d'une récurrence

    Args:
        current_date: Date actuelle de référence
        frequency: Fréquence de récurrence
        day_of_month: Jour du mois (1-31) pour MONTHLY/QUARTERLY/YEARLY
        day_of_week: Jour de la semaine (0=Lundi, 6=Dimanche) pour WEEKLY
        custom_days: Nombre de jours pour CUSTOM
        start_date: Date de début (pour YEARLY, pour calculer le mois/jour)

    Returns:
        Date de la prochaine occurrence
    """
    if frequency == Frequency.WEEKLY:
        # Calculer le prochain jour de la semaine
        current_weekday = current_date.weekday()
        days_until_target = (day_of_week - current_weekday) % 7

        if days_until_target == 0:
            # Si on est déjà le bon jour, prendre la semaine prochaine
            days_until_target = 7

        return current_date + timedelta(days=days_until_target)

    elif frequency == Frequency.MONTHLY:
        max_day_current = monthrange(current_date.year, current_date.month)[1]
        target_day_current = min(day_of_month, max_day_current) if day_of_month else 1

        if current_date.day < target_day_current:
            return date(current_date.year, current_date.month, target_day_current)
        else:
            first_of_next = current_date.replace(day=1) + relativedelta(months=1)
            max_day_next = monthrange(first_of_next.year, first_of_next.month)[1]
            actual_day = min(day_of_month, max_day_next) if day_of_month else 1
            return date(first_of_next.year, first_of_next.month, actual_day)

    elif frequency == Frequency.QUARTERLY:
        max_day_current = monthrange(current_date.year, current_date.month)[1]
        target_day_current = min(day_of_month, max_day_current) if day_of_month else 1

        if current_date.day < target_day_current:
            return date(current_date.year, current_date.month, target_day_current)
        else:
            first_of_next = current_date.replace(day=1) + relativedelta(months=3)
            max_day_next = monthrange(first_of_next.year, first_of_next.month)[1]
            actual_day = min(day_of_month, max_day_next) if day_of_month else 1
            return date(first_of_next.year, first_of_next.month, actual_day)

    elif frequency == Frequency.YEARLY:
        # Annuelle : même mois/jour que start_date chaque année
        if not start_date:
            raise ValueError("start_date required for YEARLY frequency")

        # Utiliser le mois et jour de start_date
        target_month = start_date.month
        target_day = day_of_month

        # Essayer cette année d'abord
        current_year = current_date.year

        # Ajuster le jour si nécessaire
        max_day = monthrange(current_year, target_month)[1]
        actual_day = min(target_day, max_day)

        next_occurrence = date(current_year, target_month, actual_day)

        # Si c'est dans le passé, prendre l'année prochaine
        if next_occurrence <= current_date:
            next_occurrence = date(current_year + 1, target_month, actual_day)

        return next_occurrence

    elif frequency == Frequency.CUSTOM:
        # Tous les X jours
        return current_date + timedelta(days=custom_days)

    else:
        raise ValueError(f"Unknown frequency: {frequency}")


class ProjectionService:
    """Service pour générer les projections à partir des vraies transactions"""

    @staticmethod
    async def generate_projections(
        db: AsyncSession,
        household_id: str,
        start_date: date,
        end_date: date
    ) -> List[dict]:
        """
        Récupérer toutes les transactions futures (PROJECTED) sur une période.
        Plus besoin de calculer, on lit juste les transactions existantes.

        Args:
            db: Session database
            household_id: ID du household
            start_date: Date de début de projection
            end_date: Date de fin de projection

        Returns:
            Liste de projections (transactions futures)
        """
        # Récupérer toutes les transactions dans la période (passées ET futures)
        result = await db.execute(
            select(Transaction).where(
                Transaction.household_id == household_id,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
                Transaction.deleted_at.is_(None)
            ).order_by(Transaction.transaction_date)
        )
        transactions = list(result.scalars().all())

        # Convertir en format projection
        projections = []
        for tx in transactions:
            # Récupérer le template si c'est une récurrence
            template_name = tx.description
            if tx.recurring_template_id:
                template_result = await db.execute(
                    select(RecurringTemplate).where(
                        RecurringTemplate.id == tx.recurring_template_id
                    )
                )
                template = template_result.scalar_one_or_none()
                if template:
                    template_name = template.name

            projections.append({
                "template_id": tx.recurring_template_id or "",
                "template_name": template_name,
                "date": tx.transaction_date,
                "amount": tx.amount,
                "type": tx.type.value if hasattr(tx.type, 'value') else tx.type,
                "account_id": tx.account_id,
                "destination_account_id": tx.destination_account_id,
                "category_id": tx.category_id,
                "frequency": "NONE"  # Pour compatibilité
            })

        return projections

    @staticmethod
    def _generate_occurrences(
        template: RecurringTemplate,
        start_date: date,
        end_date: date
    ) -> List[date]:
        """
        Générer toutes les occurrences d'un template sur une période

        Args:
            template: Template récurrent
            start_date: Date de début
            end_date: Date de fin

        Returns:
            Liste de dates d'occurrence
        """
        occurrences = []
        current_date = max(template.start_date, start_date)

        # Si le template a une date de fin, limiter
        if template.end_date:
            end_date = min(end_date, template.end_date)

        # Générer jusqu'à 1000 occurrences max (sécurité)
        max_iterations = 1000
        iteration = 0

        while current_date <= end_date and iteration < max_iterations:
            # Ajouter cette occurrence si elle est dans la période
            if start_date <= current_date <= end_date:
                occurrences.append(current_date)

            # Calculer la prochaine occurrence
            try:
                current_date = get_next_occurrence(
                    current_date=current_date,
                    frequency=template.frequency,
                    day_of_month=template.day_of_month,
                    day_of_week=template.day_of_week,
                    custom_days=template.custom_days,
                    start_date=template.start_date
                )
            except Exception:
                # En cas d'erreur, arrêter la génération
                break

            iteration += 1

        return occurrences

    @staticmethod
    async def calculate_monthly_projection(
        db: AsyncSession,
        household_id: str,
        target_month: int,
        target_year: int
    ) -> dict:
        """
        Calculer la projection pour un mois donné (toutes les transactions du mois + solde initial)

        Args:
            db: Session database
            household_id: ID du household
            target_month: Mois cible (1-12)
            target_year: Année cible

        Returns:
            Dict avec projections mensuelles (income, expense, balance incluant solde initial des comptes)
        """
        # 1. Récupérer le solde initial de tous les comptes actifs
        accounts_result = await db.execute(
            select(Account).where(
                Account.household_id == household_id,
                Account.is_active == "true"
            )
        )
        accounts = list(accounts_result.scalars().all())
        initial_balance = sum(float(acc.initial_balance) for acc in accounts)

        # 2. Calculer les transactions AVANT ce mois (pour le solde cumulé)
        first_day_of_month = date(target_year, target_month, 1)

        # Transactions passées (avant ce mois)
        past_transactions_result = await db.execute(
            select(Transaction).where(
                Transaction.household_id == household_id,
                Transaction.transaction_date < first_day_of_month,
                Transaction.deleted_at.is_(None)
            )
        )
        past_transactions = list(past_transactions_result.scalars().all())

        # Calculer le solde cumulé avant ce mois
        cumulative_balance = initial_balance
        for tx in past_transactions:
            if tx.type.value == "INCOME":
                cumulative_balance += float(tx.amount)
            elif tx.type.value == "EXPENSE":
                cumulative_balance -= float(abs(tx.amount))

        # 3. Dates de début et fin du mois cible
        last_day = monthrange(target_year, target_month)[1]
        end_date = date(target_year, target_month, last_day)

        # 4. Récupérer toutes les transactions du mois
        projections = await ProjectionService.generate_projections(
            db=db,
            household_id=household_id,
            start_date=first_day_of_month,
            end_date=end_date
        )

        # 5. Calculer les totaux du mois
        income = sum(float(p["amount"]) for p in projections if p["type"] == "INCOME")
        expense = sum(float(abs(p["amount"])) for p in projections if p["type"] == "EXPENSE")

        # 6. Solde final = solde cumulé avant + revenus du mois - dépenses du mois
        final_balance = cumulative_balance + income - expense

        return {
            "month": target_month,
            "year": target_year,
            "income": income,
            "expense": expense,
            "balance": final_balance,  # Solde TOTAL incluant initial_balance + toutes transactions
            "projections": projections
        }
