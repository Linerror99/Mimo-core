import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)  # URL de la photo de profil
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Foreign key to household
    household_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("households.id", ondelete="SET NULL"), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    household: Mapped["Household"] = relationship("Household", back_populates="members")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    sent_invitations: Mapped[list["Invitation"]] = relationship("Invitation", foreign_keys="Invitation.inviter_user_id", back_populates="inviter")
    received_invitations: Mapped[list["Invitation"]] = relationship("Invitation", foreign_keys="Invitation.invitee_user_id", back_populates="invitee")
    goals: Mapped[list["Goal"]] = relationship("Goal", foreign_keys="Goal.user_id", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, name={self.first_name} {self.last_name})>"
