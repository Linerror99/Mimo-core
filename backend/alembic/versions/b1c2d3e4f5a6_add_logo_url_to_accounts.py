"""Add logo_url column to accounts table

Revision ID: b1c2d3e4f5a6
Revises: 9a1e2f3b4c5d
Create Date: 2026-11-19 13:15:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "9a1e2f3b4c5d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col["name"] for col in inspector.get_columns("accounts")]
    if "logo_url" not in columns:
        op.add_column(
            "accounts",
            sa.Column("logo_url", sa.String(length=500), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col["name"] for col in inspector.get_columns("accounts")]
    if "logo_url" in columns:
        op.drop_column("accounts", "logo_url")
