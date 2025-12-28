"""Change transaction FK constraints to RESTRICT

Revision ID: 8e5424c970e7
Revises: 20aec2232f0d
Create Date: 2025-12-05 17:26:34.824587

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8e5424c970e7'
down_revision: Union[str, None] = '20aec2232f0d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Supprimer les anciennes contraintes CASCADE
    op.drop_constraint('transactions_account_id_fkey', 'transactions', type_='foreignkey')
    op.drop_constraint('transactions_destination_account_id_fkey', 'transactions', type_='foreignkey')
    
    # Recréer avec RESTRICT
    op.create_foreign_key(
        'transactions_account_id_fkey',
        'transactions', 'accounts',
        ['account_id'], ['id'],
        ondelete='RESTRICT'
    )
    op.create_foreign_key(
        'transactions_destination_account_id_fkey',
        'transactions', 'accounts',
        ['destination_account_id'], ['id'],
        ondelete='RESTRICT'
    )


def downgrade() -> None:
    # Retour à CASCADE
    op.drop_constraint('transactions_account_id_fkey', 'transactions', type_='foreignkey')
    op.drop_constraint('transactions_destination_account_id_fkey', 'transactions', type_='foreignkey')
    
    op.create_foreign_key(
        'transactions_account_id_fkey',
        'transactions', 'accounts',
        ['account_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'transactions_destination_account_id_fkey',
        'transactions', 'accounts',
        ['destination_account_id'], ['id'],
        ondelete='CASCADE'
    )
