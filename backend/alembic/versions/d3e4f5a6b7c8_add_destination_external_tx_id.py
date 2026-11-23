"""Add destination_external_transaction_id for two-legged Open Banking transfers.

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-11-22 23:55:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "d3e4f5a6b7c8"
down_revision: Union[str, None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE transactions
            ADD COLUMN IF NOT EXISTS destination_external_transaction_id VARCHAR(255)
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_transactions_destination_external_transaction_id "
        "ON transactions (destination_external_transaction_id)"
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_dest_account_external_id
            ON transactions (destination_account_id, destination_external_transaction_id)
            WHERE destination_account_id IS NOT NULL
              AND destination_external_transaction_id IS NOT NULL
              AND deleted_at IS NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_transactions_dest_account_external_id")
    op.execute("DROP INDEX IF EXISTS ix_transactions_destination_external_transaction_id")
    op.execute(
        "ALTER TABLE transactions DROP COLUMN IF EXISTS destination_external_transaction_id"
    )
