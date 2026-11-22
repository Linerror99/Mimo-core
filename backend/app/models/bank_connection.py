"""
BankConnection Model

Stocke les connexions Open Banking (Enable Banking DSP2 / Mock) par foyer.
Aucun mot de passe bancaire n'est jamais stocké : uniquement un session_id en lecture seule.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class BankConnectionStatus(str, enum.Enum):
    """Statut d'une connexion Open Banking."""
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"
    ERROR = "ERROR"


class BankConnection(Base):
    """Connexion Open Banking associée à un foyer."""
    __tablename__ = "bank_connections"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    household_id = Column(
        String(36),
        ForeignKey("households.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider = Column(String(50), nullable=False, default="enable_banking")
    institution_name = Column(String(150), nullable=False)
    institution_country = Column(String(4), nullable=False, default="FR")
    institution_logo = Column(String(500), nullable=True)

    session_id = Column(String(255), nullable=True, index=True)
    state_token = Column(String(128), nullable=False, unique=True, index=True)
    status = Column(String(20), nullable=False, default=BankConnectionStatus.PENDING.value)

    consent_expires_at = Column(DateTime, nullable=True)
    last_synced_at = Column(DateTime, nullable=True)
    last_error = Column(Text, nullable=True)
    discovered_accounts_json = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    accounts = relationship("Account", back_populates="bank_connection")

    def __repr__(self) -> str:
        return f"<BankConnection {self.institution_name} ({self.status})>"
