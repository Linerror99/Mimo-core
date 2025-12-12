"""
NotificationService

Service gérant les notifications pour les utilisateurs et les foyers.
Utilisé par le job quotidien pour notifier les transactions en attente de validation.
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification, NotificationType


class NotificationService:
    """Service de gestion des notifications"""

    @staticmethod
    async def create(
        db: AsyncSession,
        user_id: str,
        household_id: str,
        notification_type: NotificationType,
        title: str,
        message: str,
        data: Optional[dict] = None,
        action_url: Optional[str] = None
    ) -> Notification:
        """
        Crée une nouvelle notification

        Args:
            db: Session de base de données
            user_id: ID de l'utilisateur destinataire
            household_id: ID du foyer concerné
            notification_type: Type de notification
            title: Titre de la notification
            message: Message de la notification
            data: Données JSON supplémentaires (transaction_id, amount, etc.)
            action_url: URL de l'action associée (optionnel)

        Returns:
            La notification créée
        """
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            household_id=household_id,
            type=notification_type,
            title=title,
            message=message,
            data=data,
            action_url=action_url,
            is_read=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        db.add(notification)
        await db.commit()
        await db.refresh(notification)

        return notification

    @staticmethod
    async def get_by_user(
        db: AsyncSession,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50
    ) -> list[Notification]:
        """
        Récupère les notifications d'un utilisateur

        Args:
            db: Session de base de données
            user_id: ID de l'utilisateur
            unread_only: Si True, ne retourne que les non lues
            limit: Nombre maximum de notifications

        Returns:
            Liste des notifications
        """
        query = select(Notification).where(Notification.user_id == user_id)

        if unread_only:
            query = query.where(not Notification.is_read)

        query = query.order_by(Notification.created_at.desc()).limit(limit)

        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def mark_as_read(db: AsyncSession, notification_id: str) -> Optional[Notification]:
        """
        Marque une notification comme lue

        Args:
            db: Session de base de données
            notification_id: ID de la notification

        Returns:
            La notification mise à jour, ou None si non trouvée
        """
        query = select(Notification).where(Notification.id == notification_id)
        result = await db.execute(query)
        notification = result.scalar_one_or_none()

        if notification:
            notification.is_read = True
            notification.updated_at = datetime.utcnow()
            await db.commit()
            await db.refresh(notification)

        return notification

    @staticmethod
    async def mark_all_as_read(db: AsyncSession, user_id: str) -> int:
        """
        Marque toutes les notifications d'un utilisateur comme lues

        Args:
            db: Session de base de données
            user_id: ID de l'utilisateur

        Returns:
            Nombre de notifications mises à jour
        """
        query = select(Notification).where(
            Notification.user_id == user_id,
            not Notification.is_read
        )
        result = await db.execute(query)
        notifications = result.scalars().all()

        count = 0
        for notification in notifications:
            notification.is_read = True
            notification.updated_at = datetime.utcnow()
            count += 1

        await db.commit()
        return count

    @staticmethod
    async def delete(db: AsyncSession, notification_id: str) -> bool:
        """
        Supprime une notification

        Args:
            db: Session de base de données
            notification_id: ID de la notification

        Returns:
            True si supprimée, False si non trouvée
        """
        query = select(Notification).where(Notification.id == notification_id)
        result = await db.execute(query)
        notification = result.scalar_one_or_none()

        if notification:
            await db.delete(notification)
            await db.commit()
            return True

        return False

    @staticmethod
    async def count_unread(db: AsyncSession, user_id: str) -> int:
        """
        Compte les notifications non lues d'un utilisateur

        Args:
            db: Session de base de données
            user_id: ID de l'utilisateur

        Returns:
            Nombre de notifications non lues
        """
        query = select(Notification).where(
            Notification.user_id == user_id,
            not Notification.is_read
        )
        result = await db.execute(query)
        return len(result.scalars().all())

    @staticmethod
    async def create_validation_notification(
        db: AsyncSession,
        user_id: str,
        household_id: str,
        transaction_id: str,
        transaction_description: str,
        transaction_amount: float
    ) -> Notification:
        """
        Crée une notification de validation de transaction

        Args:
            db: Session de base de données
            user_id: ID de l'utilisateur
            household_id: ID du foyer
            transaction_id: ID de la transaction à valider
            transaction_description: Description de la transaction
            transaction_amount: Montant de la transaction

        Returns:
            La notification créée
        """
        return await NotificationService.create(
            db=db,
            user_id=user_id,
            household_id=household_id,
            notification_type=NotificationType.VALIDATION_REQUIRED,
            title="Transaction à valider",
            message=f"La transaction '{transaction_description}' ({transaction_amount}€) est en attente de validation.",
            data={
                "transaction_id": transaction_id,
                "amount": float(transaction_amount),
                "description": transaction_description
            },
            action_url=f"/transactions/{transaction_id}/validate"
        )
