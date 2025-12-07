"""
Notification Model

Représente une notification in-app pour l'utilisateur.
Types: VALIDATION_REQUIRED, REMINDER, INFO
"""
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Text, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import uuid

from app.database import Base


class NotificationType(str, enum.Enum):
    """Type de notification"""
    VALIDATION_REQUIRED = "VALIDATION_REQUIRED"  # Transaction à valider
    REMINDER = "REMINDER"  # Rappel général
    INFO = "INFO"  # Information


class Notification(Base):
    """
    Notification in-app pour l'utilisateur
    
    Caractéristiques :
    - Liée à un user et un household
    - Type : VALIDATION_REQUIRED, REMINDER, INFO
    - Données JSON : transaction_id, etc.
    - État lu/non lu
    """
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    
    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(JSON, nullable=True)  # {"transaction_id": "...", "amount": 50.00}
    action_url = Column(String(500), nullable=True)  # URL optionnelle pour action
    
    is_read = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relations
    user = relationship("User", back_populates="notifications")
    household = relationship("Household", back_populates="notifications")

    def __repr__(self):
        return f"<Notification {self.id} - {self.type} - {self.title}>"
