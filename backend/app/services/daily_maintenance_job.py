"""
DailyMaintenanceJob

Job de maintenance quotidien qui :
1. Transition des transactions PROJECTED vers PENDING pour la date du jour
2. Création des notifications de validation pour les membres du foyer
3. Nettoyage des transactions supprimées il y a plus de 30 jours
"""
from datetime import date, datetime, timedelta
from typing import Any, Dict

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Household, Transaction, TransactionState
from app.services.notification_service import NotificationService


class DailyMaintenanceJob:
    """Service d'exécution du job de maintenance quotidien"""

    @staticmethod
    async def run(db: AsyncSession) -> Dict[str, Any]:
        """
        Exécute le job de maintenance quotidien

        Args:
            db: Session de base de données

        Returns:
            Statistiques d'exécution du job
        """
        stats = {
            "date": date.today().isoformat(),
            "timestamp": datetime.utcnow().isoformat(),
            "transactions_marked_pending": 0,
            "notifications_created": 0,
            "transactions_cleaned": 0,
            "errors": []
        }

        try:
            # 1. Transition PROJECTED -> PENDING pour les transactions d'aujourd'hui
            pending_count, notifications_count = await DailyMaintenanceJob._mark_transactions_pending(db)
            stats["transactions_marked_pending"] = pending_count
            stats["notifications_created"] = notifications_count

            # 2. Nettoyage des transactions supprimées il y a plus de 30 jours
            cleaned_count = await DailyMaintenanceJob._cleanup_deleted_transactions(db)
            stats["transactions_cleaned"] = cleaned_count

        except Exception as e:
            stats["errors"].append(str(e))
            raise

        return stats

    @staticmethod
    async def _mark_transactions_pending(db: AsyncSession) -> tuple[int, int]:
        """
        Marque les transactions PROJECTED d'aujourd'hui comme PENDING
        et crée les notifications de validation

        Returns:
            (nombre de transactions mises à jour, nombre de notifications créées)
        """
        from sqlalchemy.orm import selectinload

        today = date.today()

        # Récupérer les transactions projetées pour aujourd'hui ou échues
        query = select(Transaction).where(
            and_(
                Transaction.state == TransactionState.PROJECTED,
                Transaction.transaction_date <= today,
                Transaction.deleted_at.is_(None)
            )
        )

        result = await db.execute(query)
        transactions = result.scalars().all()

        transactions_count = 0
        notifications_count = 0

        for transaction in transactions:
            # Marquer la transaction comme PENDING
            transaction.state = TransactionState.PENDING
            transaction.updated_at = datetime.utcnow()
            transactions_count += 1

            # Récupérer tous les membres du foyer pour créer les notifications
            household_query = select(Household).where(
                Household.id == transaction.household_id
            ).options(selectinload(Household.members))
            household_result = await db.execute(household_query)
            household = household_result.scalar_one_or_none()

            if household:
                # Créer une notification pour chaque membre du foyer
                for member in household.members:
                    await NotificationService.create_validation_notification(
                        db=db,
                        user_id=member.id,
                        household_id=household.id,
                        transaction_id=transaction.id,
                        transaction_description=transaction.description,
                        transaction_amount=transaction.amount
                    )
                    notifications_count += 1

        await db.commit()

        return transactions_count, notifications_count

    @staticmethod
    async def _cleanup_deleted_transactions(db: AsyncSession) -> int:
        """
        Supprime définitivement les transactions marquées deleted_at
        il y a plus de 30 jours (corbeille expirée)

        Returns:
            Nombre de transactions supprimées
        """
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        # Récupérer les transactions à supprimer
        query = select(Transaction).where(
            and_(
                Transaction.deleted_at.isnot(None),
                Transaction.deleted_at < thirty_days_ago
            )
        )

        result = await db.execute(query)
        transactions_to_delete = result.scalars().all()

        count = len(transactions_to_delete)

        for transaction in transactions_to_delete:
            await db.delete(transaction)

        await db.commit()

        return count

    @staticmethod
    async def preview_pending_transactions(db: AsyncSession) -> Dict[str, Any]:
        """
        Aperçu des transactions qui seraient marquées PENDING (sans les marquer)
        Utile pour tester le job avant de l'exécuter

        Returns:
            Statistiques de prévisualisation
        """
        today = date.today()

        # Compter les transactions projetées pour aujourd'hui
        query = select(func.count(Transaction.id)).where(
            and_(
                Transaction.state == TransactionState.PROJECTED,
                Transaction.transaction_date == today,
                Transaction.deleted_at.is_(None)
            )
        )

        result = await db.execute(query)
        count = result.scalar()

        # Récupérer les détails des transactions
        detail_query = select(Transaction).where(
            and_(
                Transaction.state == TransactionState.PROJECTED,
                Transaction.transaction_date == today,
                Transaction.deleted_at.is_(None)
            )
        ).limit(10)

        detail_result = await db.execute(detail_query)
        transactions = detail_result.scalars().all()

        return {
            "date": today.isoformat(),
            "total_count": count,
            "preview": [
                {
                    "id": t.id,
                    "description": t.description,
                    "amount": float(t.amount),
                    "type": t.type.value,
                    "household_id": t.household_id
                }
                for t in transactions
            ]
        }
