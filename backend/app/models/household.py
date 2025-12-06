from datetime import datetime
from enum import Enum
from sqlalchemy import String, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import uuid


class HouseholdType(str, Enum):
    INDIVIDUAL = "individual"
    COUPLE = "couple"


class Household(Base):
    __tablename__ = "households"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[HouseholdType] = mapped_column(SQLEnum(HouseholdType), nullable=False, default=HouseholdType.INDIVIDUAL)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    members: Mapped[list["User"]] = relationship("User", back_populates="household")
    accounts = relationship("Account", back_populates="household", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="household", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="household", cascade="all, delete-orphan")
    recurring_templates = relationship("RecurringTemplate", back_populates="household", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Household(id={self.id}, name={self.name}, type={self.type})>"
