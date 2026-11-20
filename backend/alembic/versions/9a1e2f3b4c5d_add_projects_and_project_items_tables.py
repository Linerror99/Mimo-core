"""add_projects_and_project_items_tables

Revision ID: 9a1e2f3b4c5d
Revises: 839dbd115223
Create Date: 2026-09-07 12:46:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '9a1e2f3b4c5d'
down_revision: Union[str, None] = '839dbd115223'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create projects table
    op.create_table(
        'projects',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('household_id', sa.String(), nullable=False),
        sa.Column('created_by', sa.String(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('color', sa.String(length=50), nullable=True),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('target_start_date', sa.Date(), nullable=True),
        sa.Column('target_end_date', sa.Date(), nullable=True),
        sa.Column('total_budget', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('status', sa.Enum('DRAFT', 'COMMITTED', 'COMPLETED', 'CANCELLED', name='projectstatus'), nullable=False, server_default='DRAFT'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['household_id'], ['households.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_projects_household_id'), 'projects', ['household_id'], unique=False)
    op.create_index(op.f('ix_projects_created_by'), 'projects', ['created_by'], unique=False)
    op.create_index(op.f('ix_projects_status'), 'projects', ['status'], unique=False)

    # 2. Add project_id to transactions table
    op.add_column('transactions', sa.Column('project_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_transactions_project_id'), 'transactions', ['project_id'], unique=False)
    op.create_foreign_key('fk_transactions_project_id', 'transactions', 'projects', ['project_id'], ['id'], ondelete='SET NULL')

    # 3. Create project_items table
    op.create_table(
        'project_items',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('project_id', sa.String(), nullable=False),
        sa.Column('account_id', sa.String(), nullable=False),
        sa.Column('category_id', sa.String(), nullable=True),
        sa.Column('owner_user_id', sa.String(), nullable=True),
        sa.Column('transaction_id', sa.String(), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('planned_date', sa.Date(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['owner_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_project_items_project_id'), 'project_items', ['project_id'], unique=False)
    op.create_index(op.f('ix_project_items_account_id'), 'project_items', ['account_id'], unique=False)
    op.create_index(op.f('ix_project_items_category_id'), 'project_items', ['category_id'], unique=False)
    op.create_index(op.f('ix_project_items_planned_date'), 'project_items', ['planned_date'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_project_items_planned_date'), table_name='project_items')
    op.drop_index(op.f('ix_project_items_category_id'), table_name='project_items')
    op.drop_index(op.f('ix_project_items_account_id'), table_name='project_items')
    op.drop_index(op.f('ix_project_items_project_id'), table_name='project_items')
    op.drop_table('project_items')

    op.drop_constraint('fk_transactions_project_id', 'transactions', type_='foreignkey')
    op.drop_index(op.f('ix_transactions_project_id'), table_name='transactions')
    op.drop_column('transactions', 'project_id')

    op.drop_index(op.f('ix_projects_status'), table_name='projects')
    op.drop_index(op.f('ix_projects_created_by'), table_name='projects')
    op.drop_index(op.f('ix_projects_household_id'), table_name='projects')
    op.drop_table('projects')
    op.execute("DROP TYPE IF EXISTS projectstatus")
