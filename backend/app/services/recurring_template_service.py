"""
Recurring Template Service

Service pour gérer les templates de transactions récurrentes.
Crée automatiquement toutes les transactions pour les 12 prochains mois.
"""
from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from dateutil.relativedelta import relativedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Frequency, RecurringTemplate, Transaction, TransactionState, TransactionType
from app.services.projection_service import get_next_occurrence


class RecurringTemplateService:
    """Service pour gérer les templates récurrents"""

    @staticmethod
    async def create_template(
        db: AsyncSession,
        household_id: str,
        data: Dict[str, Any]
    ) -> RecurringTemplate:
        """
        Créer un template récurrent et générer TOUTES les transactions sur 12 mois

        Args:
            db: Session database
            household_id: ID du household
            data: Données du template

        Returns:
            RecurringTemplate créé
        """
        # Convertir frequency string en enum si nécessaire
        if "frequency" in data and isinstance(data["frequency"], str):
            data["frequency"] = Frequency[data["frequency"]]

        template = RecurringTemplate(
            household_id=household_id,
            **data
        )

        db.add(template)
        await db.flush()  # Flush pour obtenir l'ID

        # Générer toutes les transactions sur 12 mois
        await RecurringTemplateService._generate_transactions(db, template, months=12)

        await db.commit()
        await db.refresh(template)
        return template

    @staticmethod
    async def _generate_transactions(
        db: AsyncSession,
        template: RecurringTemplate,
        months: int = 12
    ) -> int:
        """
        Générer toutes les transactions d'un template sur X mois

        Args:
            db: Session database
            template: Template récurrent
            months: Nombre de mois à générer

        Returns:
            Nombre de transactions créées
        """
        today = date.today()
        # Si le template a une end_date explicite, on génère jusqu'à cette end_date
        # Sinon, par défaut sans date de fin, on génère sur 12 mois (months)
        if template.end_date:
            end_date = template.end_date
        else:
            base_date = max(today, template.start_date)
            end_date = base_date + relativedelta(months=months)

        current_date = template.start_date
        transactions_created = 0
        max_iterations = 1000  # Sécurité

        while current_date <= end_date and transactions_created < max_iterations:
            # Déterminer le montant avec le bon signe
            transaction_type = TransactionType[template.type] if isinstance(template.type, str) else template.type
            transaction_amount = template.amount if transaction_type == TransactionType.INCOME else -abs(template.amount)

            # Déterminer l'état de la transaction selon sa date
            from app.models import TransactionState
            if current_date < today:
                state = TransactionState.REALIZED
            elif current_date == today:
                state = TransactionState.PENDING
            else:
                state = TransactionState.PROJECTED

            # Créer la transaction
            transaction = Transaction(
                household_id=template.household_id,
                account_id=template.account_id,
                amount=transaction_amount,
                type=transaction_type,
                transaction_date=current_date,
                state=state,
                description=template.description or template.name,
                category_id=template.category_id,
                destination_account_id=template.destination_account_id,
                recurring_template_id=template.id
            )
            db.add(transaction)
            transactions_created += 1

            # Calculer la prochaine occurrence
            next_date = get_next_occurrence(
                current_date,
                template.frequency,
                template.day_of_month,
                template.day_of_week,
                template.custom_days,
                template.start_date
            )

            if next_date <= current_date:
                break
            current_date = next_date

        return transactions_created

    @staticmethod
    async def get_template(
        db: AsyncSession,
        template_id: str,
        household_id: str
    ) -> Optional[RecurringTemplate]:
        """
        Récupérer un template par ID (avec isolation household)

        Args:
            db: Session database
            template_id: ID du template
            household_id: ID du household (isolation)

        Returns:
            RecurringTemplate ou None
        """
        result = await db.execute(
            select(RecurringTemplate)
            .where(
                RecurringTemplate.id == template_id,
                RecurringTemplate.household_id == household_id
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all_templates(
        db: AsyncSession,
        household_id: str,
        include_inactive: bool = True
    ) -> List[RecurringTemplate]:
        """
        Récupérer tous les templates d'un household

        Args:
            db: Session database
            household_id: ID du household
            include_inactive: Inclure templates inactifs (default: True)

        Returns:
            Liste de RecurringTemplate
        """
        query = select(RecurringTemplate).where(
            RecurringTemplate.household_id == household_id
        )

        if not include_inactive:
            query = query.where(RecurringTemplate.is_active == "true")

        query = query.order_by(RecurringTemplate.created_at.desc())

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def update_template(
        db: AsyncSession,
        template_id: str,
        household_id: str,
        data: Dict[str, Any]
    ) -> RecurringTemplate:
        """
        Mettre à jour un template

        Args:
            db: Session database
            template_id: ID du template
            household_id: ID du household (isolation)
            data: Nouvelles données

        Returns:
            RecurringTemplate mis à jour
        """
        template = await RecurringTemplateService.get_template(
            db=db, template_id=template_id, household_id=household_id
        )

        if not template:
            raise ValueError(f"Template {template_id} not found")

        payload = dict(data)
        apply_to_future = bool(payload.pop("apply_to_future", False))

        # Mettre à jour les champs fournis
        for key, value in payload.items():
            if hasattr(template, key):
                setattr(template, key, value)

        # Optionnel : propager les changements aux occurrences futures déjà générées (PROJECTED)
        if apply_to_future:
            today = date.today()
            future_res = await db.execute(
                select(Transaction).where(
                    Transaction.recurring_template_id == template.id,
                    Transaction.household_id == household_id,
                    Transaction.state == TransactionState.PROJECTED,
                    Transaction.transaction_date >= today,
                    Transaction.deleted_at.is_(None),
                )
            )
            future_txs = list(future_res.scalars().all())
            tx_type_val = template.type.value if hasattr(template.type, "value") else str(template.type)
            signed_amount = (
                -abs(Decimal(str(template.amount)))
                if tx_type_val == "EXPENSE"
                else abs(Decimal(str(template.amount)))
            )
            for tx in future_txs:
                if "amount" in payload:
                    tx.amount = signed_amount
                if "name" in payload:
                    tx.description = template.name
                if "category_id" in payload:
                    tx.category_id = template.category_id

        await db.commit()
        await db.refresh(template)
        return template

    @staticmethod
    async def delete_template(
        db: AsyncSession,
        template_id: str,
        household_id: str
    ) -> None:
        """
        Supprimer un template ET toutes ses transactions associées

        Args:
            db: Session database
            template_id: ID du template
            household_id: ID du household (isolation)
        """
        template = await RecurringTemplateService.get_template(
            db=db, template_id=template_id, household_id=household_id
        )

        if not template:
            raise ValueError(f"Template {template_id} not found")

        # Supprimer toutes les transactions liées (cascade via FK on delete CASCADE)
        await db.delete(template)
        await db.commit()
