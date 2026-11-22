"""Add Open Banking tables and columns (bank_connections, accounts, transactions).

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-11-22 05:05:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, None] = "b1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS bank_connections (
            id VARCHAR(36) PRIMARY KEY,
            household_id VARCHAR(36) NOT NULL REFERENCES households(id) ON DELETE CASCADE,
            user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            provider VARCHAR(50) NOT NULL DEFAULT 'enable_banking',
            institution_name VARCHAR(150) NOT NULL,
            institution_country VARCHAR(4) NOT NULL DEFAULT 'FR',
            institution_logo VARCHAR(500),
            session_id VARCHAR(255),
            state_token VARCHAR(128) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            consent_expires_at TIMESTAMP WITHOUT TIME ZONE,
            last_synced_at TIMESTAMP WITHOUT TIME ZONE,
            last_error TEXT,
            discovered_accounts_json TEXT,
            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_bank_connections_household_id ON bank_connections (household_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_bank_connections_user_id ON bank_connections (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_bank_connections_session_id ON bank_connections (session_id)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_bank_connections_state_token ON bank_connections (state_token)")

    op.execute("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS bank_connection_id VARCHAR(36) REFERENCES bank_connections(id) ON DELETE SET NULL")
    op.execute("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS external_account_id VARCHAR(255)")
    op.execute("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS iban_masked VARCHAR(64)")
    op.execute("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN NOT NULL DEFAULT false")
    op.execute("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS sync_from_date DATE")
    op.execute("CREATE INDEX IF NOT EXISTS ix_accounts_bank_connection_id ON accounts (bank_connection_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_accounts_external_account_id ON accounts (external_account_id)")

    op.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS external_transaction_id VARCHAR(255)")
    op.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS import_source VARCHAR(32) NOT NULL DEFAULT 'manual'")
    op.execute("CREATE INDEX IF NOT EXISTS ix_transactions_external_transaction_id ON transactions (external_transaction_id)")
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_account_external_id
        ON transactions (account_id, external_transaction_id)
        WHERE external_transaction_id IS NOT NULL AND deleted_at IS NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_transactions_account_external_id")
    op.execute("DROP INDEX IF EXISTS ix_transactions_external_transaction_id")
    op.execute("ALTER TABLE transactions DROP COLUMN IF EXISTS import_source")
    op.execute("ALTER TABLE transactions DROP COLUMN IF EXISTS external_transaction_id")

    op.execute("DROP INDEX IF EXISTS ix_accounts_external_account_id")
    op.execute("DROP INDEX IF EXISTS ix_accounts_bank_connection_id")
    op.execute("ALTER TABLE accounts DROP COLUMN IF EXISTS sync_from_date")
    op.execute("ALTER TABLE accounts DROP COLUMN IF EXISTS sync_enabled")
    op.execute("ALTER TABLE accounts DROP COLUMN IF EXISTS iban_masked")
    op.execute("ALTER TABLE accounts DROP COLUMN IF EXISTS external_account_id")
    op.execute("ALTER TABLE accounts DROP COLUMN IF EXISTS bank_connection_id")

    op.execute("DROP TABLE IF EXISTS bank_connections")
