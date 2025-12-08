"""
Invitation Model

Handles household invitations between existing users
"""
from datetime import datetime, timedelta
from enum import Enum
from sqlalchemy import String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import uuid


class InvitationType(str, Enum):
    EXISTING_USER = "existing_user"


class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"


class Invitation(Base):
    __tablename__ = "invitations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Inviter (qui envoie l'invitation)
    inviter_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    
    # Invitee (qui reçoit l'invitation) - toujours rempli pour EXISTING_USER
    invitee_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    
    # Type d'invitation (EXISTING_USER seulement pour MVP)
    type: Mapped[InvitationType] = mapped_column(SQLEnum(InvitationType), nullable=False, default=InvitationType.EXISTING_USER)
    
    # Statut de l'invitation
    status: Mapped[InvitationStatus] = mapped_column(SQLEnum(InvitationStatus), nullable=False, default=InvitationStatus.PENDING)
    
    # Expiration (7 jours par défaut)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    # Relationships
    inviter: Mapped["User"] = relationship("User", foreign_keys=[inviter_user_id], back_populates="sent_invitations")
    invitee: Mapped["User"] = relationship("User", foreign_keys=[invitee_user_id], back_populates="received_invitations")

    def __repr__(self) -> str:
        return f"<Invitation(id={self.id}, inviter={self.inviter_user_id}, invitee={self.invitee_user_id}, status={self.status})>"

    @property
    def is_expired(self) -> bool:
        """Check if invitation has expired"""
        return datetime.utcnow() > self.expires_at and self.status == InvitationStatus.PENDING
