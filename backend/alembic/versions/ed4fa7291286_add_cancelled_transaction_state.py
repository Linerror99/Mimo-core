"""add_cancelled_transaction_state

Revision ID: ed4fa7291286
Revises: b24e883f6fc3
Create Date: 2025-12-08 16:25:17.232570

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ed4fa7291286'
down_revision: Union[str, None] = '84ed193779c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ajouter valeur CANCELLED à l'enum transactionstate (minuscule)
    op.execute("ALTER TYPE transactionstate ADD VALUE IF NOT EXISTS 'CANCELLED'")


def downgrade() -> None:
    # PostgreSQL ne supporte pas la suppression de valeurs enum facilement
    pass
