"""
Goal Schemas

Pydantic schemas for goal endpoints
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class GoalCreate(BaseModel):
    """Schema pour créer un objectif"""
    name: str = Field(..., min_length=1, max_length=255, description="Nom de l'objectif")
    target_amount: Optional[Decimal] = Field(None, gt=0, description="Montant cible optionnel")
    current_amount: Optional[Decimal] = Field(Decimal("0"), ge=0, description="Montant initial")
    monthly_contribution: Optional[Decimal] = Field(None, gt=0, description="Prélèvement mensuel optionnel")
    start_date: Optional[date] = Field(None, description="Date de première échéance / début")
    description: Optional[str] = Field(None, description="Description optionnelle")
    target_date: Optional[date] = Field(None, description="Date cible optionnelle")
    account_id: Optional[str] = Field(None, description="Compte source")
    destination_account_id: Optional[str] = Field(None, description="Compte épargne de destination")

    # SOIT user_id (objectif personnel) SOIT household_id (objectif foyer)
    user_id: Optional[str] = Field(None, description="ID utilisateur (objectif personnel)")
    household_id: Optional[str] = Field(None, description="ID foyer (objectif partagé)")

    @field_validator('target_amount')
    @classmethod
    def validate_target_amount(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("Le montant cible doit être positif")
        return v

    @field_validator('target_date')
    @classmethod
    def validate_target_date(cls, v: Optional[date]) -> Optional[date]:
        if v and v < date.today():
            raise ValueError("La date cible ne peut pas être dans le passé")
        return v


class GoalUpdate(BaseModel):
    """Schema pour mettre à jour un objectif"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    target_amount: Optional[Decimal] = Field(None, gt=0)
    monthly_contribution: Optional[Decimal] = Field(None, gt=0)
    description: Optional[str] = None
    target_date: Optional[date] = None
    account_id: Optional[str] = None
    destination_account_id: Optional[str] = None

    @field_validator('target_amount')
    @classmethod
    def validate_target_amount(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("Le montant cible doit être positif")
        return v


class GoalContributionUpdate(BaseModel):
    """Schema pour mettre à jour manuellement la contribution"""
    amount: Decimal = Field(..., description="Nouveau montant de contribution")

    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Le montant de contribution ne peut pas être négatif")
        return v


class GoalResponse(BaseModel):
    """Schema de réponse pour un objectif"""
    id: str
    household_id: Optional[str]
    user_id: Optional[str]
    created_by: str
    name: str
    description: Optional[str]
    target_amount: Optional[Decimal]
    current_amount: Decimal
    monthly_contribution: Optional[Decimal] = None
    target_date: Optional[date]
    account_id: Optional[str] = None
    destination_account_id: Optional[str] = None

    # Propriétés calculées
    is_personal: bool
    is_household: bool
    progress_percentage: float
    is_completed: bool
    remaining_amount: float

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
