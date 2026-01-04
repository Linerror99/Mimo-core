"""
Notification Schemas

Schémas Pydantic pour les notifications.
"""
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field

from app.models.notification import NotificationType


class NotificationBase(BaseModel):
    """Schéma de base pour une notification"""
    type: NotificationType
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    data: Optional[Dict[str, Any]] = None
    action_url: Optional[str] = Field(None, max_length=500)


class NotificationCreate(NotificationBase):
    """Schéma pour créer une notification"""
    user_id: str
    household_id: str


class NotificationUpdate(BaseModel):
    """Schéma pour mettre à jour une notification"""
    is_read: bool


class NotificationResponse(NotificationBase):
    """Schéma de réponse pour une notification"""
    id: str
    user_id: str
    household_id: str
    is_read: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Schéma de réponse pour une liste de notifications"""
    total: int
    unread_count: int
    notifications: list[NotificationResponse]
