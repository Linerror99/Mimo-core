"""
Notifications API

Endpoints pour la gestion des notifications.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    unread_only: bool = Query(False, description="Ne retourner que les notifications non lues"),
    limit: int = Query(50, ge=1, le=100, description="Nombre maximum de notifications"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Liste les notifications de l'utilisateur courant

    Args:
        unread_only: Si True, ne retourne que les non lues
        limit: Nombre maximum de notifications (1-100)
        current_user: Utilisateur authentifié
        db: Session de base de données

    Returns:
        Liste des notifications avec statistiques
    """
    notifications = await NotificationService.get_by_user(
        db=db,
        user_id=current_user.id,
        unread_only=unread_only,
        limit=limit
    )

    unread_count = await NotificationService.count_unread(db=db, user_id=current_user.id)

    return NotificationListResponse(
        total=len(notifications),
        unread_count=unread_count,
        notifications=[NotificationResponse.model_validate(n) for n in notifications]
    )


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Marque une notification comme lue

    Args:
        notification_id: ID de la notification
        current_user: Utilisateur authentifié
        db: Session de base de données

    Returns:
        La notification mise à jour

    Raises:
        404: Si la notification n'existe pas
    """
    notification = await NotificationService.mark_as_read(db=db, notification_id=notification_id)

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    # Vérifier que la notification appartient à l'utilisateur
    if notification.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this notification"
        )

    return NotificationResponse.model_validate(notification)


@router.post("/mark-all-read")
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Marque toutes les notifications de l'utilisateur comme lues

    Args:
        current_user: Utilisateur authentifié
        db: Session de base de données

    Returns:
        Nombre de notifications mises à jour
    """
    count = await NotificationService.mark_all_as_read(db=db, user_id=current_user.id)

    return {"count": count, "message": f"{count} notifications marked as read"}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Supprime une notification

    Args:
        notification_id: ID de la notification
        current_user: Utilisateur authentifié
        db: Session de base de données

    Raises:
        404: Si la notification n'existe pas
    """
    # Vérifier que la notification appartient à l'utilisateur avant de la supprimer
    notifications = await NotificationService.get_by_user(db=db, user_id=current_user.id)
    notification = next((n for n in notifications if n.id == notification_id), None)

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    deleted = await NotificationService.delete(db=db, notification_id=notification_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
