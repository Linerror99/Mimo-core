"""
Projection Service

Service pour générer les projections de transactions récurrentes.
Calcule les prochaines occurrences basées sur la fréquence.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from calendar import monthrange

from app.models import RecurringTemplate, Frequency, Transaction


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
        # Prochain mois avec le jour spécifié
        next_month = current_date + relativedelta(months=1)
        
        # Si on est avant le jour cible dans le mois actuel, utiliser ce mois
        if current_date.day < day_of_month:
            next_month = current_date
        
        # Ajuster si le jour n'existe pas dans le mois (ex: 31 en février)
        max_day = monthrange(next_month.year, next_month.month)[1]
        actual_day = min(day_of_month, max_day)
        
        return date(next_month.year, next_month.month, actual_day)
    
    elif frequency == Frequency.QUARTERLY:
        # Tous les 3 mois
        # Chercher la prochaine occurrence trimestrielle
        # Si on est avant le jour cible dans le mois actuel, utiliser ce mois
        if current_date.day < day_of_month:
            # Vérifier si le jour cible existe dans ce mois
            max_day_current = monthrange(current_date.year, current_date.month)[1]
            if day_of_month <= max_day_current:
                next_occurrence = current_date
            else:
                # Le jour n'existe pas ce mois, passer au prochain trimestre
                next_occurrence = current_date + relativedelta(months=3)
        else:
            # On est déjà passé, passer au prochain trimestre
            next_occurrence = current_date + relativedelta(months=3)
        
        # Ajuster le jour
        max_day = monthrange(next_occurrence.year, next_occurrence.month)[1]
        actual_day = min(day_of_month, max_day)
        
        return date(next_occurrence.year, next_occurrence.month, actual_day)
    
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
    """Service pour générer les projections"""

    @staticmethod
    async def generate_projections(
        db: AsyncSession,
        household_id: str,
        start_date: date,
        end_date: date
    ) -> List[dict]:
        """
        Générer des projections pour toutes les récurrences actives
        
        Args:
            db: Session database
            household_id: ID du household
            start_date: Date de début de projection
            end_date: Date de fin de projection
            
        Returns:
            Liste de projections (dict avec template_id, date, montant, etc.)
        """
        # Récupérer tous les templates actifs
        result = await db.execute(
            select(RecurringTemplate).where(
                RecurringTemplate.household_id == household_id,
                RecurringTemplate.is_active == "true"
            )
        )
        templates = list(result.scalars().all())
        
        projections = []
        
        for template in templates:
            # Générer les occurrences pour ce template
            occurrences = ProjectionService._generate_occurrences(
                template=template,
                start_date=start_date,
                end_date=end_date
            )
            
            for occurrence_date in occurrences:
                projections.append({
                    "template_id": template.id,
                    "template_name": template.name,
                    "date": occurrence_date,
                    "amount": template.amount,
                    "type": template.type,
                    "account_id": template.account_id,
                    "destination_account_id": template.destination_account_id,
                    "category_id": template.category_id,
                    "frequency": template.frequency.value
                })
        
        # Trier par date
        projections.sort(key=lambda x: x["date"])
        
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
        Calculer la projection pour un mois donné
        
        Args:
            db: Session database
            household_id: ID du household
            target_month: Mois cible (1-12)
            target_year: Année cible
            
        Returns:
            Dict avec projections mensuelles (income, expense, balance)
        """
        # Dates de début et fin du mois
        start_date = date(target_year, target_month, 1)
        
        # Dernier jour du mois
        last_day = monthrange(target_year, target_month)[1]
        end_date = date(target_year, target_month, last_day)
        
        # Générer les projections
        projections = await ProjectionService.generate_projections(
            db=db,
            household_id=household_id,
            start_date=start_date,
            end_date=end_date
        )
        
        # Calculer les totaux
        income = sum(p["amount"] for p in projections if p["type"] == "INCOME")
        expense = sum(p["amount"] for p in projections if p["type"] == "EXPENSE")
        
        return {
            "month": target_month,
            "year": target_year,
            "income": income,
            "expense": expense,
            "balance": income - expense,
            "projections": projections
        }
