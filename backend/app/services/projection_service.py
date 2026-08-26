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
        Calculer la projection pour un mois donné (solde initial + transactions réalisées + projections futures)
        """
        today = date.today()

        # 1. Solde initial de tous les comptes actifs
        accounts_result = await db.execute(
            select(Account).where(
                Account.household_id == household_id,
                Account.is_active == "true"
            )
        )
        accounts = list(accounts_result.scalars().all())
        initial_balance = sum(float(acc.initial_balance) for acc in accounts)

        # 2. Toutes les transactions RÉALISÉES jusqu'à aujourd'hui
        past_tx_res = await db.execute(
            select(Transaction).where(
                Transaction.household_id == household_id,
                Transaction.state == "REALIZED",
                Transaction.transaction_date <= today,
                Transaction.deleted_at.is_(None)
            )
        )
        past_txs = list(past_tx_res.scalars().all())
        current_balance = initial_balance
        for tx in past_txs:
            if tx.type.value == "INCOME":
                current_balance += float(tx.amount)
            elif tx.type.value == "EXPENSE":
                current_balance -= float(abs(tx.amount))

        # 3. Dates du mois cible
        first_day_of_target_month = date(target_year, target_month, 1)
        last_day = monthrange(target_year, target_month)[1]
        end_date_of_target_month = date(target_year, target_month, last_day)

        # 4. Projections futures de demain jusqu'à la fin du mois cible
        future_projections = []
        start_future_date = today + timedelta(days=1)

        if end_date_of_target_month >= start_future_date:
            future_projections = await ProjectionService.generate_projections(
                db=db,
                household_id=household_id,
                start_date=start_future_date,
                end_date=end_date_of_target_month
            )

        # Projections spécifiques du mois cible
        month_projections = []
        for p in future_projections:
            p_date = p["date"]
            p_year = p_date.year if hasattr(p_date, "year") else int(str(p_date).split("-")[0])
            p_month = p_date.month if hasattr(p_date, "month") else int(str(p_date).split("-")[1])
            if p_year == target_year and p_month == target_month:
                month_projections.append(p)

        # Si le mois cible est le mois en cours ou passé, inclure aussi les transactions du mois en DB
        if first_day_of_target_month <= today:
            cur_month_tx_res = await db.execute(
                select(Transaction).where(
                    Transaction.household_id == household_id,
                    Transaction.transaction_date >= first_day_of_target_month,
                    Transaction.transaction_date <= min(today, end_date_of_target_month),
                    Transaction.deleted_at.is_(None)
                )
            )
            for tx in cur_month_tx_res.scalars().all():
                month_projections.append({
                    "id": tx.id,
                    "name": tx.description,
                    "amount": float(tx.amount),
                    "type": tx.type.value,
                    "date": tx.transaction_date,
                    "source": "database"
                })

        income = sum(float(p["amount"]) for p in month_projections if p["type"] == "INCOME")
        expense = sum(float(abs(p["amount"])) for p in month_projections if p["type"] in ["EXPENSE", "TRANSFER"])

        # Solde cumulé final à la fin du mois cible
        final_balance = current_balance
        for p in future_projections:
            if p["type"] == "INCOME":
                final_balance += float(p["amount"])
            elif p["type"] in ["EXPENSE", "TRANSFER"]:
                final_balance -= float(abs(p["amount"]))

        # Formater les dates des projections pour l'API
        formatted_projections = []
        for p in month_projections:
            p_copy = dict(p)
            if hasattr(p_copy.get("date"), "isoformat"):
                p_copy["date"] = p_copy["date"].isoformat()
            formatted_projections.append(p_copy)

        return {
            "month": target_month,
            "year": target_year,
            "income": income,
            "expense": expense,
            "balance": final_balance,
            "projections": formatted_projections
        }

    @staticmethod
    async def calculate_safe_to_spend(
        db: AsyncSession,
        household_id: str
    ) -> dict:
        """
        Calcule le Reste à Vivre Réel (Safe-to-Spend) :
        Solde actuel réel des comptes - Dépenses/charges prévues STRICTEMENT AVANT le prochain revenu.
        """
        today = date.today()

        # 1. Solde actuel réel (comptes actifs + initial_balance + transactions REALIZED jusqu'à aujourd'hui)
        accounts_res = await db.execute(
            select(Account).where(
                Account.household_id == household_id,
                Account.is_active == "true"
            )
        )
        accounts = list(accounts_res.scalars().all())
        total_initial = sum(float(acc.initial_balance) for acc in accounts)

        realized_tx_res = await db.execute(
            select(Transaction).where(
                Transaction.household_id == household_id,
                Transaction.state == "REALIZED",
                Transaction.transaction_date <= today,
                Transaction.deleted_at.is_(None)
            )
        )
        realized_txs = list(realized_tx_res.scalars().all())

        current_balance = total_initial
        for tx in realized_txs:
            if tx.type.value == "INCOME":
                current_balance += float(tx.amount)
            elif tx.type.value == "EXPENSE":
                current_balance -= float(abs(tx.amount))

        # 2. Chercher le prochain revenu planifié (transaction ou récurrence INCOME)
        upcoming_incomes_res = await db.execute(
            select(Transaction).where(
                Transaction.household_id == household_id,
                Transaction.type == "INCOME",
                Transaction.transaction_date >= today,
                Transaction.state.in_(["PROJECTED", "PENDING"]),
                Transaction.deleted_at.is_(None)
            ).order_by(Transaction.transaction_date.asc())
        )
        next_income_tx = upcoming_incomes_res.scalars().first()

        last_day_of_month = monthrange(today.year, today.month)[1]
        end_of_month_date = date(today.year, today.month, last_day_of_month)

        if next_income_tx:
            horizon_date = next_income_tx.transaction_date
            next_income_date = horizon_date.isoformat()
            next_income_amount = float(next_income_tx.amount)
            days_until_next_income = (horizon_date - today).days

            # Charges STRICTEMENT AVANT le jour du prochain revenu (car le jour du revenu est autofinancé par ce revenu)
            committed_tx_res = await db.execute(
                select(Transaction).where(
                    Transaction.household_id == household_id,
                    Transaction.type.in_(["EXPENSE", "TRANSFER"]),
                    Transaction.transaction_date >= today,
                    Transaction.transaction_date < horizon_date,
                    Transaction.deleted_at.is_(None)
                )
            )
        else:
            horizon_date = end_of_month_date
            next_income_date = end_of_month_date.isoformat()
            next_income_amount = 0.0
            days_until_next_income = (end_of_month_date - today).days

            committed_tx_res = await db.execute(
                select(Transaction).where(
                    Transaction.household_id == household_id,
                    Transaction.type.in_(["EXPENSE", "TRANSFER"]),
                    Transaction.transaction_date >= today,
                    Transaction.transaction_date <= horizon_date,
                    Transaction.deleted_at.is_(None)
                )
            )

        committed_txs = list(committed_tx_res.scalars().all())
        committed_expenses = sum(float(abs(tx.amount)) for tx in committed_txs)

        # 4. Reste à vivre réel = Solde actuel - Dépenses engagées avant revenu
        safe_to_spend = current_balance - committed_expenses

        # Status
        if safe_to_spend > 500:
            status = "healthy"
        elif safe_to_spend > 0:
            status = "caution"
        else:
            status = "danger"

        return {
            "current_balance": round(current_balance, 2),
            "committed_expenses": round(committed_expenses, 2),
            "safe_to_spend": round(safe_to_spend, 2),
            "next_income_date": next_income_date,
            "next_income_amount": round(next_income_amount, 2),
            "days_until_next_income": max(0, days_until_next_income),
            "status": status,
            "horizon_date": horizon_date.isoformat()
        }

    @staticmethod
    async def simulate_purchase(
        db: AsyncSession,
        household_id: str,
        name: str,
        is_saving: bool,
        total_amount: Optional[float],
        monthly_amount: Optional[float],
        payment_type: str,  # 'DIRECT' | 'INSTALLMENTS' | 'RECURRING'
        installments_count: Optional[int],
        start_date: date,
        account_id: Optional[str] = None
    ) -> dict:
        """
        Simulateur d'achat / projet d'épargne et aide à la décision.
        Évalue précisément l'impact à partir de la date de démarrage du projet.
        """
        # 1. Établir l'échéancier des montants
        schedule = []
        if payment_type == "DIRECT":
            amount = float(total_amount or monthly_amount or 0)
            schedule.append({
                "date": start_date.isoformat(),
                "amount": amount,
                "label": f"{name} (Paiement comptant)"
            })
            total = amount
            duration_months = 1
        elif payment_type == "INSTALLMENTS":
            count = installments_count or 3
            if total_amount:
                monthly = round(float(total_amount) / count, 2)
                total = float(total_amount)
            else:
                monthly = float(monthly_amount or 0)
                total = monthly * count

            for i in range(count):
                due_date = start_date + relativedelta(months=i)
                schedule.append({
                    "date": due_date.isoformat(),
                    "amount": monthly,
                    "label": f"{name} ({i+1}/{count})"
                })
            duration_months = count
        else:  # RECURRING
            monthly = float(monthly_amount or 0)
            count = installments_count or 12
            total = monthly * count
            for i in range(count):
                due_date = start_date + relativedelta(months=i)
                schedule.append({
                    "date": due_date.isoformat(),
                    "amount": monthly,
                    "label": f"Épargne {name} (Mois {i+1})"
                })
            duration_months = count

        # 2. Calculer l'impact mois par mois sur 12 mois à partir de la date de départ
        project_start_month = start_date.replace(day=1)
        monthly_comparisons = []
        min_projected_balance = float("inf")
        lowest_balance_month = ""

        # Cumulative simulation cost over time
        cumulative_sim_cost = 0.0

        for i in range(12):
            target_date = project_start_month + relativedelta(months=i)
            base_proj = await ProjectionService.calculate_monthly_projection(
                db=db,
                household_id=household_id,
                target_month=target_date.month,
                target_year=target_date.year
            )

            # Sommer les mensualités de ce mois
            sim_month_cost = sum(
                item["amount"] for item in schedule
                if str(item["date"]).startswith(f"{target_date.year:04d}-{target_date.month:02d}")
            )
            cumulative_sim_cost += sim_month_cost

            # Solde projeté simulé = solde de base - coût cumulé de ce projet
            simulated_balance = base_proj["balance"] - cumulative_sim_cost

            if simulated_balance < min_projected_balance:
                min_projected_balance = simulated_balance
                lowest_balance_month = f"{target_date.month:02d}/{target_date.year}"

            monthly_comparisons.append({
                "month": target_date.month,
                "year": target_date.year,
                "month_label": target_date.strftime("%b %Y"),
                "base_balance": round(base_proj["balance"], 2),
                "simulated_balance": round(simulated_balance, 2),
                "sim_cost": round(sim_month_cost, 2)
            })

        # 3. Évaluation de la viabilité à partir de la date du projet
        if min_projected_balance >= 300:
            feasibility_status = "SUCCESS"
            message = f"✅ Projet 100% faisable ! Votre solde projeté reste serein ({min_projected_balance:.2f} € minimum en {lowest_balance_month})."
        elif min_projected_balance >= 0:
            feasibility_status = "WARNING"
            message = f"⚠️ Faisable avec vigilance. Votre solde projeté descendra à {min_projected_balance:.2f} € en {lowest_balance_month}."
        else:
            feasibility_status = "DANGER"
            message = f"❌ Risque de découvert ({min_projected_balance:.2f} € en {lowest_balance_month}). Envisagez d'étaler la dépense sur plusieurs mois."

        return {
            "name": name,
            "is_saving": is_saving,
            "payment_type": payment_type,
            "total_amount": round(total, 2),
            "monthly_amount": round(schedule[0]["amount"] if schedule else 0, 2),
            "duration_months": duration_months,
            "schedule": schedule,
            "feasibility_status": feasibility_status,
            "feasibility_message": message,
            "min_projected_balance": round(min_projected_balance, 2),
            "lowest_balance_month": lowest_balance_month,
            "monthly_comparisons": monthly_comparisons
        }
