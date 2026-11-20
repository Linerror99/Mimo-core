"""
Goal Model

Représente un objectif d'épargne pour un foyer OU un utilisateur individuel.
Progression calculée automatiquement via transactions.

Règles:
- SOIT household_id (objectif de foyer en mode couple)
- SOIT user_id (objectif personnel, mode individuel ou personnel en couple)
- Pas les deux en même temps
"""
import uuid

from sqlalchemy import CheckConstraint, Column, Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Goal(Base):
    """
    Objectif d'épargne

    Caractéristiques :
    - Associé à un household (couple) OU à un user (individuel/personnel)
    - Montant cible et date limite
    - Progression calculée en temps réel
    """
    __tablename__ = "goals"

    # Contrainte: SOIT household_id SOIT user_id (exclusif)
    __table_args__ = (
        CheckConstraint(
            '(household_id IS NOT NULL AND user_id IS NULL) OR (household_id IS NULL AND user_id IS NOT NULL)',
            name='check_goal_owner_exclusive'
        ),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Relations - SOIT household SOIT user (pas les deux)
    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    created_by = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)

    # Détails objectif / épargne
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    target_amount = Column(Numeric(10, 2), nullable=True)  # Montant cible (optionnel pour épargne libre)
    current_amount = Column(Numeric(10, 2), nullable=False, default=0)  # Montant actuel
    monthly_contribution = Column(Numeric(10, 2), nullable=True)  # Prélèvement mensuel (optionnel)
    target_date = Column(Date, nullable=True)  # Date cible (optionnel)
    account_id = Column(String, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    destination_account_id = Column(String, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True)

    # Métadonnées
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relations ORM
    household = relationship("Household", back_populates="goals")
    user = relationship("User", foreign_keys=[user_id], back_populates="goals")
    creator = relationship("User", foreign_keys=[created_by])
    account = relationship("Account", foreign_keys=[account_id])
    destination_account = relationship("Account", foreign_keys=[destination_account_id])
    transactions = relationship("Transaction", back_populates="goal", cascade="all, delete-orphan")

    def __repr__(self):
        owner = f"household:{self.household_id}" if self.household_id else f"user:{self.user_id}"
        return f"<Goal {self.id} {self.name} {owner} {self.current_amount}/{self.target_amount}>"

    @property
    def is_personal(self) -> bool:
        """Vérifie si c'est un objectif personnel (user_id)"""
        return self.user_id is not None

    @property
    def is_household(self) -> bool:
        """Vérifie si c'est un objectif de foyer (household_id)"""
        return self.household_id is not None

    @property
    def progress_percentage(self) -> float:
        """Calcule le pourcentage de progression"""
        if not self.target_amount or self.target_amount <= 0:
            return 0.0
        percentage = (float(self.current_amount) / float(self.target_amount)) * 100
        return min(percentage, 100.0)  # Cap à 100%

    @property
    def is_completed(self) -> bool:
        """Vérifie si l'objectif est atteint"""
        if not self.target_amount or self.target_amount <= 0:
            return False
        return self.current_amount >= self.target_amount

    @property
    def remaining_amount(self) -> float:
        """Calcule le montant restant à atteindre"""
        if not self.target_amount or self.target_amount <= 0:
            return 0.0
        remaining = float(self.target_amount) - float(self.current_amount)
        return max(remaining, 0.0)
