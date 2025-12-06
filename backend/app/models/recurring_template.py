"""
Recurring Template Model

Modèle pour les transactions récurrentes.
Génère automatiquement des transactions projetées selon la fréquence.
"""
from sqlalchemy import Column, String, Numeric, Date, Integer, Enum, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import date
import enum
import uuid

from app.database import Base


class Frequency(str, enum.Enum):
    """Fréquence de récurrence"""
    WEEKLY = "WEEKLY"  # Hebdomadaire
    MONTHLY = "MONTHLY"  # Mensuelle
    QUARTERLY = "QUARTERLY"  # Trimestrielle (tous les 3 mois)
    YEARLY = "YEARLY"  # Annuelle
    CUSTOM = "CUSTOM"  # Personnalisée (utilise custom_days)


class RecurringTemplate(Base):
    """
    Template de transaction récurrente
    
    Génère des transactions projetées automatiquement selon :
    - Fréquence (WEEKLY, MONTHLY, QUARTERLY, YEARLY, CUSTOM)
    - Date de début (start_date)
    - Date de fin optionnelle (end_date)
    - Jour du mois pour MONTHLY/QUARTERLY/YEARLY (day_of_month)
    - Jour de la semaine pour WEEKLY (day_of_week: 0=Lundi, 6=Dimanche)
    - Nombre de jours pour CUSTOM (custom_days)
    """
    __tablename__ = "recurring_templates"

    # Identifiant
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Informations de base (similaires à Transaction)
    name = Column(String(255), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    type = Column(String(50), nullable=False)  # INCOME, EXPENSE, TRANSFER
    description = Column(Text, nullable=True)

    # Configuration de récurrence
    frequency = Column(Enum(Frequency), nullable=False)
    start_date = Column(Date, nullable=False)  # Date de première occurrence
    end_date = Column(Date, nullable=True)  # Date de fin (None = indéfini)

    # Paramètres spécifiques selon fréquence
    day_of_month = Column(Integer, nullable=True)  # 1-31 pour MONTHLY/QUARTERLY/YEARLY
    day_of_week = Column(Integer, nullable=True)  # 0-6 pour WEEKLY (0=Lundi)
    custom_days = Column(Integer, nullable=True)  # Nombre de jours pour CUSTOM

    # Relations
    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    account_id = Column(String, ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False)
    destination_account_id = Column(String, ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=True)
    category_id = Column(String, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)

    # État
    is_active = Column(String, nullable=False, default="true")  # "true"/"false"
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    household = relationship("Household", back_populates="recurring_templates")
    account = relationship("Account", foreign_keys=[account_id])
    destination_account = relationship("Account", foreign_keys=[destination_account_id])
    category = relationship("Category")

    def __repr__(self):
        return f"<RecurringTemplate(id={self.id}, name={self.name}, frequency={self.frequency}, amount={self.amount})>"
