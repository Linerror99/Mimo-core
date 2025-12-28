"""add_original_owner_user_id_to_accounts

Revision ID: 0a7adba857ab
Revises: 5de877f00589
Create Date: 2025-12-08 14:03:03.724293

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0a7adba857ab'
down_revision: Union[str, None] = '5de877f00589'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ajouter la colonne original_owner_user_id pour tracker le propriétaire d'origine
    # Cette colonne permet de :
    # 1. Calculer correctement les wallets après fusion (inclure initial_balance)
    # 2. Afficher "Tes comptes" vs "Ses comptes" dans le frontend
    # 3. Rendre les comptes à leur propriétaire lors d'une dissolution future
    op.add_column('accounts', 
        sa.Column('original_owner_user_id', sa.String(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('accounts', 'original_owner_user_id')
