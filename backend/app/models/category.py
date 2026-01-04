"""
Category Model

Represents a transaction category (income or expense)
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import relationship

from app.database import Base


class CategoryType(str, enum.Enum):
    """Category types"""
    INCOME = "INCOME"  # Revenu
    EXPENSE = "EXPENSE"  # Dépense


class Category(Base):
    """Category model"""
    __tablename__ = "categories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    household_id = Column(String(36), ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    type = Column(SQLEnum(CategoryType), nullable=False)
    icon = Column(String(50), nullable=True)  # Emoji or icon name
    color = Column(String(7), nullable=True)  # Hex color (e.g., #FF5733)
    parent_id = Column(String(36), ForeignKey("categories.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    household = relationship("Household", back_populates="categories")
    parent = relationship("Category", remote_side=[id], backref="children")
    transactions = relationship("Transaction", back_populates="category")

    def __repr__(self):
        return f"<Category {self.name} ({self.type})>"
