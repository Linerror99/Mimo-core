"""
Account Model

Represents a bank account (checking, savings, investment, etc.)
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Numeric, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import relationship

from app.database import Base


class AccountType(str, enum.Enum):
    """Account types"""
    CHECKING = "CHECKING"  # Compte courant
    SAVINGS = "SAVINGS"  # Livret épargne
    INVESTMENT = "INVESTMENT"  # Compte titres
    LOAN = "LOAN"  # Prêt
    CASH = "CASH"  # Espèces
    OTHER = "OTHER"  # Autre


class Account(Base):
    """Account model"""
    __tablename__ = "accounts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    household_id = Column(String(36), ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    type = Column(SQLEnum(AccountType), nullable=False, default=AccountType.CHECKING)
    initial_balance = Column(Numeric(12, 2), nullable=False, default=0)
    currency = Column(String(3), nullable=False, default="EUR")
    is_active = Column(SQLEnum("true", "false", name="boolean_enum"), nullable=False, default="true")
    closed_at = Column(DateTime, nullable=True)  # Soft delete: NULL = actif, DATE = fermé
    logo_url = Column(String(500), nullable=True)  # Bank logo (URL or preset identifier or base64)

    # Track du propriétaire d'origine pour :
    # 1. Calcul correct des wallets après fusion (inclure initial_balance)
    # 2. Affichage "Tes comptes" vs "Ses comptes" dans l'UI
    # 3. Dissolution future : rendre les comptes à leur propriétaire
    # NULL = compte créé après fusion (compte commun)
    original_owner_user_id = Column(String(36), nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    household = relationship("Household", back_populates="accounts")
    transactions = relationship("Transaction", foreign_keys="Transaction.account_id", back_populates="account")

    def __repr__(self):
        return f"<Account {self.name} ({self.type})>"
