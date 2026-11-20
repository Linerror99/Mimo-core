"""
Project and ProjectItem Models

Permet de regrouper des dépenses planifiées au sein d'un projet financier
(ex: Vacances, Travaux, Mariage) pour simuler son impact avant de le valider.
"""
import enum
import uuid

from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class ProjectStatus(str, enum.Enum):
    """Statut du projet"""
    DRAFT = "DRAFT"  # En simulation / brouillon
    COMMITTED = "COMMITTED"  # Validé, transactions injectées dans la timeline
    COMPLETED = "COMPLETED"  # Projet terminé
    CANCELLED = "CANCELLED"  # Projet annulé


class Project(Base):
    """
    Projet financier regroupant des dépenses prévisionnelles
    """
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(50), nullable=True, default="#6366f1")  # Couleur hex
    icon = Column(String(50), nullable=True, default="Compass")  # Nom icône

    target_start_date = Column(Date, nullable=True)
    target_end_date = Column(Date, nullable=True)
    total_budget = Column(Numeric(10, 2), nullable=True)  # Budget cible optionnel

    status = Column(
        Enum(ProjectStatus),
        nullable=False,
        default=ProjectStatus.DRAFT,
        index=True
    )

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relations ORM
    household = relationship("Household", back_populates="projects")
    creator = relationship("User", foreign_keys=[created_by])
    items = relationship(
        "ProjectItem",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="ProjectItem.planned_date"
    )
    transactions = relationship("Transaction", back_populates="project")

    def __repr__(self):
        return f"<Project {self.id} {self.name} [{self.status}]>"


class ProjectItem(Base):
    """
    Dépense prévisionnelle faisant partie d'un projet
    """
    __tablename__ = "project_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(String, ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False, index=True)
    category_id = Column(String, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    owner_user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Si le projet est validé, lien vers la vraie transaction générée
    transaction_id = Column(String, ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True, index=True)

    name = Column(String(255), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)  # Montant positif de la dépense
    planned_date = Column(Date, nullable=False, index=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relations ORM
    project = relationship("Project", back_populates="items")
    account = relationship("Account", foreign_keys=[account_id])
    category = relationship("Category", foreign_keys=[category_id])
    owner_user = relationship("User", foreign_keys=[owner_user_id])
    transaction = relationship("Transaction", foreign_keys=[transaction_id])

    def __repr__(self):
        return f"<ProjectItem {self.id} {self.name} {self.amount}€ on {self.planned_date}>"
