"""
Transaction Schemas

Pydantic schemas for Transaction API
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models.transaction import RecurrenceFrequency, TransactionState, TransactionType

# ===== Base Schemas =====

class TransactionBase(BaseModel):
    """Base transaction schema"""
    description: str = Field(..., min_length=1, max_length=255, description="Description de la transaction")
    amount: Decimal = Field(..., description="Montant (positif pour INCOME, négatif pour EXPENSE)")
    transaction_date: date = Field(..., description="Date de la transaction")
    type: TransactionType = Field(..., description="Type de transaction")
    notes: Optional[str] = Field(None, description="Notes additionnelles")

    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: Decimal, info) -> Decimal:
        """Valide que le montant n'est pas nul"""
        if v == 0:
            raise ValueError("Le montant ne peut pas être zéro")
        return v


# ===== Create Schemas =====

class TransactionCreate(TransactionBase):
    """Schema pour créer une transaction ponctuelle"""
    account_id: str = Field(..., description="ID du compte source")
    category_id: Optional[str] = Field(None, description="ID de la catégorie")
    destination_account_id: Optional[str] = Field(None, description="ID du compte destination (pour TRANSFER)")
    goal_id: Optional[str] = Field(None, description="ID de l'objectif/épargne lié")

    @field_validator('destination_account_id')
    @classmethod
    def validate_destination_account(cls, v: Optional[str], info) -> Optional[str]:
        """Valide que destination_account_id est fourni pour les TRANSFER"""
        transaction_type = info.data.get('type')
        if transaction_type == TransactionType.TRANSFER and not v:
            raise ValueError("destination_account_id requis pour les virements")
        if transaction_type != TransactionType.TRANSFER and v:
            raise ValueError("destination_account_id uniquement pour les virements")
        return v

    @field_validator('amount')
    @classmethod
    def validate_amount_sign(cls, v: Decimal, info) -> Decimal:
        """Valide le signe du montant selon le type"""
        transaction_type = info.data.get('type')
        if transaction_type == TransactionType.INCOME and v < 0:
            raise ValueError("Le montant d'un revenu doit être positif")
        if transaction_type == TransactionType.EXPENSE and v > 0:
            raise ValueError("Le montant d'une dépense doit être négatif")
        if transaction_type == TransactionType.TRANSFER and v <= 0:
            raise ValueError("Le montant d'un virement doit être positif")
        return v


class RecurringTransactionCreate(TransactionCreate):
    """Schema pour créer une transaction récurrente"""
    recurrence_frequency: RecurrenceFrequency = Field(
        ...,
        description="Fréquence de récurrence (DAILY, WEEKLY, MONTHLY, YEARLY)"
    )
    recurrence_end_date: Optional[date] = Field(
        None,
        description="Date de fin de récurrence (optionnel, None = infini)"
    )

    @field_validator('recurrence_frequency')
    @classmethod
    def validate_recurrence_frequency(cls, v: RecurrenceFrequency) -> RecurrenceFrequency:
        """Valide que la fréquence n'est pas NONE pour une récurrence"""
        if v == RecurrenceFrequency.NONE:
            raise ValueError("Pour une transaction récurrente, la fréquence ne peut pas être NONE")
        return v

    @field_validator('recurrence_end_date')
    @classmethod
    def validate_end_date(cls, v: Optional[date], info) -> Optional[date]:
        """Valide que la date de fin est après la date de début"""
        if v is not None:
            start_date = info.data.get('transaction_date')
            if start_date and v <= start_date:
                raise ValueError("La date de fin doit être après la date de début")
        return v


# ===== Update Schema =====

class TransactionUpdate(BaseModel):
    """Schema pour mettre à jour une transaction"""
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[Decimal] = Field(None)
    transaction_date: Optional[date] = Field(None)
    type: Optional[TransactionType] = Field(None)
    account_id: Optional[str] = Field(None)
    destination_account_id: Optional[str] = Field(None)
    category_id: Optional[str] = Field(None)
    goal_id: Optional[str] = Field(None)
    notes: Optional[str] = Field(None)
    is_active: Optional[bool] = Field(None)

    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        """Valide que le montant n'est pas nul si fourni"""
        if v is not None and v == 0:
            raise ValueError("Le montant ne peut pas être zéro")
        return v


# ===== Response Schema =====

class TransactionResponse(TransactionBase):
    """Schema de réponse pour une transaction"""
    id: str
    household_id: str
    account_id: str
    category_id: Optional[str]
    destination_account_id: Optional[str]
    goal_id: Optional[str] = None
    recurring_template_id: Optional[str] = None
    state: TransactionState = Field(..., description="État calculé (REALIZED ou PROJECTED)")
    recurrence_frequency: RecurrenceFrequency
    recurrence_end_date: Optional[date]
    parent_transaction_id: Optional[str]
    is_active: bool
    deleted_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    # Relations (optionnel, pour enrichir les réponses)
    account_name: Optional[str] = Field(None, description="Nom du compte")
    category_name: Optional[str] = Field(None, description="Nom de la catégorie")
    destination_account_name: Optional[str] = Field(None, description="Nom du compte destination")
    goal_name: Optional[str] = Field(None, description="Nom de l'objectif d'épargne lié")

    model_config = {"from_attributes": True}


# ===== Filters & Query Params =====

class TransactionFilters(BaseModel):
    """Filtres pour la liste des transactions"""
    start_date: Optional[date] = Field(None, description="Date de début (inclusive)")
    end_date: Optional[date] = Field(None, description="Date de fin (inclusive)")
    type: Optional[TransactionType] = Field(None, description="Filtrer par type")
    account_id: Optional[str] = Field(None, description="Filtrer par compte")
    category_id: Optional[str] = Field(None, description="Filtrer par catégorie")
    goal_id: Optional[str] = Field(None, description="Filtrer par objectif lié")
    state: Optional[TransactionState] = Field(None, description="Filtrer par état (REALIZED ou PROJECTED)")
    include_deleted: bool = Field(False, description="Inclure les transactions supprimées (corbeille)")

    model_config = {"from_attributes": True}
