"""
Recurring Template Schemas

Schemas Pydantic pour validation et sérialisation des templates récurrents.
"""
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class FrequencyEnum(str, Enum):
    """Fréquence de récurrence"""
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    YEARLY = "YEARLY"
    CUSTOM = "CUSTOM"


class TransactionTypeEnum(str, Enum):
    """Type de transaction"""
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"
    TRANSFER = "TRANSFER"


class RecurringTemplateBase(BaseModel):
    """Schema de base pour RecurringTemplate"""
    name: str = Field(..., min_length=1, max_length=255, description="Nom de la transaction récurrente")
    amount: Decimal = Field(..., gt=0, decimal_places=2, description="Montant (toujours positif)")
    type: TransactionTypeEnum = Field(..., description="Type: INCOME, EXPENSE, TRANSFER")
    description: Optional[str] = Field(None, max_length=1000, description="Description optionnelle")

    frequency: FrequencyEnum = Field(..., description="Fréquence de récurrence")
    start_date: date = Field(..., description="Date de première occurrence")
    end_date: Optional[date] = Field(None, description="Date de fin (None = indéfini)")

    day_of_month: Optional[int] = Field(None, ge=1, le=31, description="Jour du mois (1-31) pour MONTHLY/QUARTERLY/YEARLY")
    day_of_week: Optional[int] = Field(None, ge=0, le=6, description="Jour de la semaine (0=Lundi, 6=Dimanche) pour WEEKLY")
    custom_days: Optional[int] = Field(None, ge=1, description="Nombre de jours pour CUSTOM")

    account_id: str = Field(..., description="ID du compte source")
    destination_account_id: Optional[str] = Field(None, description="ID du compte destination (pour TRANSFER)")
    category_id: Optional[str] = Field(None, description="ID de la catégorie")

    @field_validator('end_date')
    @classmethod
    def validate_end_date(cls, v, info):
        """Valider que end_date >= start_date"""
        if v is not None and 'start_date' in info.data:
            start_date = info.data['start_date']
            if v < start_date:
                raise ValueError("end_date must be >= start_date")
        return v

    @field_validator('destination_account_id')
    @classmethod
    def validate_transfer(cls, v, info):
        """Valider que destination_account_id est fourni pour TRANSFER"""
        if 'type' in info.data and info.data['type'] == TransactionTypeEnum.TRANSFER:
            if not v:
                raise ValueError("destination_account_id required for TRANSFER")
        return v

    @field_validator('day_of_month')
    @classmethod
    def validate_day_of_month(cls, v, info):
        """Valider day_of_month pour MONTHLY/QUARTERLY/YEARLY"""
        if 'frequency' in info.data:
            freq = info.data['frequency']
            if freq in [FrequencyEnum.MONTHLY, FrequencyEnum.QUARTERLY, FrequencyEnum.YEARLY]:
                if v is None:
                    raise ValueError(f"day_of_month required for {freq.value}")
        return v

    @field_validator('day_of_week')
    @classmethod
    def validate_day_of_week(cls, v, info):
        """Valider day_of_week pour WEEKLY"""
        if 'frequency' in info.data and info.data['frequency'] == FrequencyEnum.WEEKLY:
            if v is None:
                raise ValueError("day_of_week required for WEEKLY")
        return v

    @field_validator('custom_days')
    @classmethod
    def validate_custom_days(cls, v, info):
        """Valider custom_days pour CUSTOM"""
        if 'frequency' in info.data and info.data['frequency'] == FrequencyEnum.CUSTOM:
            if v is None:
                raise ValueError("custom_days required for CUSTOM")
        return v


class RecurringTemplateCreate(RecurringTemplateBase):
    """Schema pour création de RecurringTemplate"""
    pass


class RecurringTemplateUpdate(BaseModel):
    """Schema pour mise à jour de RecurringTemplate"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    description: Optional[str] = Field(None, max_length=1000)

    end_date: Optional[date] = Field(None, description="Date de fin (None = indéfini)")

    day_of_month: Optional[int] = Field(None, ge=1, le=31)
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    custom_days: Optional[int] = Field(None, ge=1)

    category_id: Optional[str] = None
    is_active: Optional[str] = Field(None, pattern="^(true|false)$")


class RecurringTemplateResponse(RecurringTemplateBase):
    """Schema pour réponse RecurringTemplate"""
    id: str
    household_id: str
    is_active: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class BulkCancelRequest(BaseModel):
    """Schema pour annulation bulk d'occurrences"""
    start_date: date = Field(..., description="Date de début de période")
    end_date: date = Field(..., description="Date de fin de période")

    @field_validator('end_date')
    @classmethod
    def validate_period(cls, v, info):
        """Valider que end_date >= start_date"""
        if 'start_date' in info.data and v < info.data['start_date']:
            raise ValueError("end_date must be >= start_date")
        return v


class BulkUpdateRequest(BaseModel):
    """Schema pour modification bulk d'occurrences"""
    start_date: date = Field(..., description="Date de début de période")
    end_date: date = Field(..., description="Date de fin de période")
    amount: Decimal = Field(..., gt=0, decimal_places=2, description="Nouveau montant")

    @field_validator('end_date')
    @classmethod
    def validate_period(cls, v, info):
        """Valider que end_date >= start_date"""
        if 'start_date' in info.data and v < info.data['start_date']:
            raise ValueError("end_date must be >= start_date")
        return v
