"""add_household_dissolved_notification_type

Revision ID: 41b674e8ec28
Revises: 0a7adba857ab
Create Date: 2025-12-08 15:42:56.275260

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '41b674e8ec28'
down_revision: Union[str, None] = '0a7adba857ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ajouter la valeur HOUSEHOLD_DISSOLVED à l'enum notificationtype
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'HOUSEHOLD_DISSOLVED'")


def downgrade() -> None:
    # Note: PostgreSQL ne permet pas de supprimer une valeur d'un ENUM facilement
    # Il faudrait recréer l'enum, ce qui est complexe et rarement nécessaire
    pass
