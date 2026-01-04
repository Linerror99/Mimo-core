"""add_goal_model_and_avatar_url

Revision ID: 84ed193779c7
Revises: 41b674e8ec28
Create Date: 2025-12-08 16:06:24.540371

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '84ed193779c7'
down_revision: Union[str, None] = '41b674e8ec28'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ajouter colonne avatar_url à la table users
    op.add_column('users', sa.Column('avatar_url', sa.String(length=500), nullable=True))
    
    # Créer table goals
    op.create_table(
        'goals',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('household_id', sa.String(), nullable=True),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('target_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('current_amount', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0'),
        sa.Column('target_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['household_id'], ['households.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='RESTRICT'),
        sa.CheckConstraint(
            '(household_id IS NOT NULL AND user_id IS NULL) OR (household_id IS NULL AND user_id IS NOT NULL)',
            name='check_goal_owner_exclusive'
        )
    )
    
    # Créer index sur household_id et user_id pour performance
    op.create_index(op.f('ix_goals_household_id'), 'goals', ['household_id'], unique=False)
    op.create_index(op.f('ix_goals_user_id'), 'goals', ['user_id'], unique=False)
    op.create_index(op.f('ix_goals_created_by'), 'goals', ['created_by'], unique=False)


def downgrade() -> None:
    # Supprimer table goals
    op.drop_index(op.f('ix_goals_created_by'), table_name='goals')
    op.drop_index(op.f('ix_goals_user_id'), table_name='goals')
    op.drop_index(op.f('ix_goals_household_id'), table_name='goals')
    op.drop_table('goals')
    
    # Supprimer colonne avatar_url
    op.drop_column('users', 'avatar_url')
