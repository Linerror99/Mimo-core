"""
Tests for NotificationService

Tests unitaires pour le service de gestion des notifications.
"""
import pytest
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.notification_service import NotificationService
from app.models import Notification, NotificationType, User, Household


@pytest.mark.asyncio
class TestNotificationService:
    """Tests pour NotificationService"""
    
    async def test_create_notification(self, db_session: AsyncSession, test_user, test_household):
        """Test création d'une notification"""
        notification = await NotificationService.create(
            db=db_session,
            user_id=test_user.id,
            household_id=test_household.id,
            notification_type=NotificationType.VALIDATION_REQUIRED,
            title="Test notification",
            message="Test message",
            data={"transaction_id": "tx123", "amount": 100.0},
            action_url="/transactions/tx123/validate"
        )
        
        assert notification.id is not None
        assert notification.user_id == test_user.id
        assert notification.household_id == test_household.id
        assert notification.type == NotificationType.VALIDATION_REQUIRED
        assert notification.title == "Test notification"
        assert notification.message == "Test message"
        assert notification.data == {"transaction_id": "tx123", "amount": 100.0}
        assert notification.action_url == "/transactions/tx123/validate"
        assert notification.is_read is False
        assert notification.created_at is not None
    
    async def test_get_by_user_all(self, db_session: AsyncSession, test_user, test_household):
        """Test récupération de toutes les notifications d'un user"""
        # Créer 3 notifications
        for i in range(3):
            await NotificationService.create(
                db=db_session,
                user_id=test_user.id,
                household_id=test_household.id,
                notification_type=NotificationType.INFO,
                title=f"Notification {i}",
                message=f"Message {i}"
            )
        
        notifications = await NotificationService.get_by_user(
            db=db_session,
            user_id=test_user.id,
            unread_only=False
        )
        
        assert len(notifications) == 3
        assert all(n.user_id == test_user.id for n in notifications)
    
    async def test_get_by_user_unread_only(self, db_session: AsyncSession, test_user, test_household):
        """Test récupération uniquement des notifications non lues"""
        # Créer 3 notifications
        notifs = []
        for i in range(3):
            n = await NotificationService.create(
                db=db_session,
                user_id=test_user.id,
                household_id=test_household.id,
                notification_type=NotificationType.INFO,
                title=f"Notification {i}",
                message=f"Message {i}"
            )
            notifs.append(n)
        
        # Marquer une comme lue
        await NotificationService.mark_as_read(db=db_session, notification_id=notifs[0].id)
        
        # Récupérer seulement les non lues
        unread = await NotificationService.get_by_user(
            db=db_session,
            user_id=test_user.id,
            unread_only=True
        )
        
        assert len(unread) == 2
        assert all(n.is_read is False for n in unread)
    
    async def test_mark_as_read(self, db_session: AsyncSession, test_user, test_household):
        """Test marquage d'une notification comme lue"""
        notification = await NotificationService.create(
            db=db_session,
            user_id=test_user.id,
            household_id=test_household.id,
            notification_type=NotificationType.INFO,
            title="Test",
            message="Test"
        )
        
        assert notification.is_read is False
        
        updated = await NotificationService.mark_as_read(
            db=db_session,
            notification_id=notification.id
        )
        
        assert updated.is_read is True
        assert updated.updated_at > notification.created_at
    
    async def test_mark_all_as_read(self, db_session: AsyncSession, test_user, test_household):
        """Test marquage de toutes les notifications comme lues"""
        # Créer 5 notifications
        for i in range(5):
            await NotificationService.create(
                db=db_session,
                user_id=test_user.id,
                household_id=test_household.id,
                notification_type=NotificationType.INFO,
                title=f"Notification {i}",
                message=f"Message {i}"
            )
        
        count = await NotificationService.mark_all_as_read(
            db=db_session,
            user_id=test_user.id
        )
        
        assert count == 5
        
        # Vérifier que toutes sont lues
        notifications = await NotificationService.get_by_user(
            db=db_session,
            user_id=test_user.id
        )
        assert all(n.is_read is True for n in notifications)
    
    async def test_delete_notification(self, db_session: AsyncSession, test_user, test_household):
        """Test suppression d'une notification"""
        notification = await NotificationService.create(
            db=db_session,
            user_id=test_user.id,
            household_id=test_household.id,
            notification_type=NotificationType.INFO,
            title="Test",
            message="Test"
        )
        
        deleted = await NotificationService.delete(
            db=db_session,
            notification_id=notification.id
        )
        
        assert deleted is True
        
        # Vérifier que la notification n'existe plus
        notifications = await NotificationService.get_by_user(
            db=db_session,
            user_id=test_user.id
        )
        assert len(notifications) == 0
    
    async def test_count_unread(self, db_session: AsyncSession, test_user, test_household):
        """Test comptage des notifications non lues"""
        # Créer 3 notifications
        notifs = []
        for i in range(3):
            n = await NotificationService.create(
                db=db_session,
                user_id=test_user.id,
                household_id=test_household.id,
                notification_type=NotificationType.INFO,
                title=f"Notification {i}",
                message=f"Message {i}"
            )
            notifs.append(n)
        
        count = await NotificationService.count_unread(
            db=db_session,
            user_id=test_user.id
        )
        assert count == 3
        
        # Marquer une comme lue
        await NotificationService.mark_as_read(db=db_session, notification_id=notifs[0].id)
        
        count = await NotificationService.count_unread(
            db=db_session,
            user_id=test_user.id
        )
        assert count == 2
    
    async def test_create_validation_notification(self, db_session: AsyncSession, test_user, test_household):
        """Test création d'une notification de validation"""
        notification = await NotificationService.create_validation_notification(
            db=db_session,
            user_id=test_user.id,
            household_id=test_household.id,
            transaction_id="tx123",
            transaction_description="Loyer",
            transaction_amount=-1200.00
        )
        
        assert notification.type == NotificationType.VALIDATION_REQUIRED
        assert notification.title == "Transaction à valider"
        assert "Loyer" in notification.message
        assert "-1200.00€" in notification.message or "-1200.0€" in notification.message
        assert notification.data["transaction_id"] == "tx123"
        assert notification.data["amount"] == -1200.00
        assert notification.action_url == "/transactions/tx123/validate"
