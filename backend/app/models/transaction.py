"""
Transaction Model

Représente une transaction financière (ponctuelle ou récurrente).
États automatiques : REALIZED (passée), PROJECTED (future)
"""
from sqlalchemy import Column, String, Numeric, Date, Boolean, Enum, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import date
import enum
import uuid

from app.database import Base


class TransactionType(str, enum.Enum):
    """Type de transaction"""
    INCOME = "INCOME"  # Revenu
    EXPENSE = "EXPENSE"  # Dépense
    TRANSFER = "TRANSFER"  # Virement entre comptes


class TransactionState(str, enum.Enum):
    """État de la transaction basé sur sa date"""
    REALIZED = "REALIZED"  # Transaction passée et validée
    PROJECTED = "PROJECTED"  # Transaction future (date > aujourd'hui)
    PENDING = "PENDING"  # Transaction du jour en attente de validation
    CANCELLED = "CANCELLED"  # Transaction annulée (visible mais barrée)


class RecurrenceFrequency(str, enum.Enum):
    """Fréquence de récurrence"""
    NONE = "NONE"  # Transaction ponctuelle
    DAILY = "DAILY"  # Quotidienne
    WEEKLY = "WEEKLY"  # Hebdomadaire
    BIWEEKLY = "BIWEEKLY"  # Bimensuelle
    MONTHLY = "MONTHLY"  # Mensuelle
    YEARLY = "YEARLY"  # Annuelle


class TransactionOwnerType(str, enum.Enum):
    """Type de propriétaire de la transaction (pour mode couple)"""
    PERSONAL = "PERSONAL"  # Transaction personnelle (un des membres)
    SHARED = "SHARED"  # Transaction commune (partagée)


class Transaction(Base):
    """
    Transaction financière
    
    Caractéristiques :
    - Type : INCOME, EXPENSE, TRANSFER
    - État auto : REALIZED (passée), PROJECTED (future)
    - Récurrence : NONE (ponctuelle) ou fréquence
    - Soft delete : deleted_at timestamp
    """
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Relations
    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(String, ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False, index=True)
    category_id = Column(String, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Pour les virements (TRANSFER)
    destination_account_id = Column(String, ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=True, index=True)
    
    # Détails transaction
    amount = Column(Numeric(10, 2), nullable=False)  # Montant (positif pour INCOME, négatif pour EXPENSE)
    transaction_date = Column(Date, nullable=False, index=True)  # Date de la transaction
    type = Column(Enum(TransactionType), nullable=False, index=True)
    state = Column(Enum(TransactionState), nullable=False, default=TransactionState.REALIZED, index=True)  # État de la transaction
    description = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True)
    
    # Récurrence
    recurrence_frequency = Column(
        Enum(RecurrenceFrequency), 
        nullable=False, 
        default=RecurrenceFrequency.NONE,
        index=True
    )
    recurrence_end_date = Column(Date, nullable=True)  # Date de fin de récurrence (optionnel)
    parent_transaction_id = Column(String, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=True)
    recurring_template_id = Column(String, ForeignKey("recurring_templates.id", ondelete="CASCADE"), nullable=True, index=True)  # Lien vers le template récurrent
    
    # Propriété (pour mode couple)
    owner_type = Column(Enum(TransactionOwnerType), nullable=True)  # NULL si INDIVIDUAL, PERSONAL/SHARED si COUPLE
    owner_user_id = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=True, index=True)  # Si PERSONAL, quel user?
    
    # Métadonnées
    is_active = Column(Boolean, default=True, nullable=False)
    deleted_at = Column(DateTime, nullable=True)  # Soft delete (corbeille)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relations ORM
    household = relationship("Household", back_populates="transactions")
    account = relationship("Account", foreign_keys=[account_id], back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    destination_account = relationship("Account", foreign_keys=[destination_account_id])
    owner_user = relationship("User", foreign_keys=[owner_user_id])  # User propriétaire (si PERSONAL)
    
    # Récurrence : transaction parente et enfants
    parent_transaction = relationship("Transaction", remote_side=[id], foreign_keys=[parent_transaction_id])
    child_transactions = relationship("Transaction", back_populates="parent_transaction", foreign_keys=[parent_transaction_id])
    recurring_template = relationship("RecurringTemplate", foreign_keys=[recurring_template_id])

    def __repr__(self):
        return f"<Transaction {self.id} {self.type} {self.amount} on {self.transaction_date}>"
