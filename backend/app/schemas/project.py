"""
Project and ProjectItem Schemas

Pydantic schemas for Project and Simulation endpoints.
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.project import ProjectStatus


# ==============================================================================
# Project Item Schemas
# ==============================================================================

class ProjectItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Libellé de la dépense")
    amount: Decimal = Field(..., gt=0, description="Montant positif de la dépense")
    planned_date: date = Field(..., description="Date prévue du paiement")
    account_id: str = Field(..., description="Compte qui sera débité")
    category_id: Optional[str] = Field(None, description="Catégorie de la dépense")
    owner_user_id: Optional[str] = Field(None, description="Payeur / Propriétaire")
    notes: Optional[str] = Field(None, description="Notes complémentaires")


class ProjectItemCreate(ProjectItemBase):
    pass


class ProjectItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[Decimal] = Field(None, gt=0)
    planned_date: Optional[date] = None
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    owner_user_id: Optional[str] = None
    notes: Optional[str] = None


class ProjectItemResponse(ProjectItemBase):
    id: str
    project_id: str
    transaction_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    account_name: Optional[str] = None
    category_name: Optional[str] = None
    owner_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Project Schemas
# ==============================================================================

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Nom du projet")
    description: Optional[str] = Field(None, description="Description du projet")
    color: Optional[str] = Field("#6366f1", description="Couleur hex du projet")
    icon: Optional[str] = Field("Compass", description="Icône du projet")
    target_start_date: Optional[date] = Field(None, description="Date de début prévisionnelle")
    target_end_date: Optional[date] = Field(None, description="Date de fin prévisionnelle")
    total_budget: Optional[Decimal] = Field(None, ge=0, description="Budget alloué au projet")


class ProjectCreate(ProjectBase):
    items: Optional[List[ProjectItemCreate]] = Field(default=[], description="Dépenses initiales prévues")


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    target_start_date: Optional[date] = None
    target_end_date: Optional[date] = None
    total_budget: Optional[Decimal] = Field(None, ge=0)
    status: Optional[ProjectStatus] = None


class ProjectResponse(ProjectBase):
    id: str
    household_id: str
    created_by: str
    status: ProjectStatus
    total_planned_amount: Decimal = Decimal("0")
    items_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectDetailResponse(ProjectResponse):
    items: List[ProjectItemResponse] = []


# ==============================================================================
# Simulation & What-If Schemas
# ==============================================================================

class SimulationWarning(BaseModel):
    type: str  # ex: "NEGATIVE_BALANCE", "LOW_TREASURY"
    severity: str  # "CRITICAL", "WARNING"
    account_id: Optional[str] = None
    account_name: Optional[str] = None
    date: date
    balance: Decimal
    message: str


class SimulationTimelinePoint(BaseModel):
    date: str  # YYYY-MM-DD
    baseline_balance: float
    whatif_balance: float
    impact: float
    accounts: Dict[str, Dict[str, Any]] = {}


class ProjectSimulationResponse(BaseModel):
    project_id: str
    project_name: str
    is_viable: bool
    status: ProjectStatus
    total_cost: Decimal
    current_balance: Decimal
    projected_min_balance_baseline: Decimal
    projected_min_balance_whatif: Decimal
    critical_account_name: Optional[str] = None
    critical_date: Optional[date] = None
    warnings: List[SimulationWarning] = []
    timeline: List[SimulationTimelinePoint] = []


class ProjectCommitResponse(BaseModel):
    success: bool
    project_id: str
    status: ProjectStatus
    transactions_created: int
    message: str
