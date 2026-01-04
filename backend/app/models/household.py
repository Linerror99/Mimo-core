import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class HouseholdType(str, Enum):
    INDIVIDUAL = "individual"
    COUPLE = "couple"


class HouseholdStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    MERGED_INTO_COUPLE = "merged_into_couple"


class Household(Base):
    __tablename__ = "households"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[HouseholdType] = mapped_column(SQLEnum(HouseholdType), nullable=False, default=HouseholdType.INDIVIDUAL)

    # Status (pour mode couple)
    status: Mapped[HouseholdStatus] = mapped_column(SQLEnum(HouseholdStatus), nullable=False, default=HouseholdStatus.ACTIVE)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    merged_into_household_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    members: Mapped[list["User"]] = relationship("User", back_populates="household")
    accounts = relationship("Account", back_populates="household", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="household", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="household", cascade="all, delete-orphan")
    recurring_templates = relationship("RecurringTemplate", back_populates="household", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="household", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="household", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Household(id={self.id}, name={self.name}, type={self.type})>"
