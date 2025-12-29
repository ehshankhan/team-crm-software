"""Add procurement_items table

Revision ID: add_procurement_items
Revises: add_daily_logs
Create Date: 2025-12-29 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_procurement_items'
down_revision = 'add_daily_logs'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create procurement_items table
    op.create_table(
        'procurement_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('link', sa.Text(), nullable=True),
        sa.Column('vendor', sa.String(100), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('priority', sa.String(20), server_default='medium', nullable=True),
        sa.Column('status', sa.String(20), server_default='pending', nullable=True),
        sa.Column('is_non_gem', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('requested_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('received_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['requested_by'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    # Create indexes for faster queries
    op.create_index('ix_procurement_items_status', 'procurement_items', ['status'])
    op.create_index('ix_procurement_items_vendor', 'procurement_items', ['vendor'])
    op.create_index('ix_procurement_items_is_non_gem', 'procurement_items', ['is_non_gem'])
    op.create_index('ix_procurement_items_requested_by', 'procurement_items', ['requested_by'])


def downgrade() -> None:
    op.drop_index('ix_procurement_items_requested_by', table_name='procurement_items')
    op.drop_index('ix_procurement_items_is_non_gem', table_name='procurement_items')
    op.drop_index('ix_procurement_items_vendor', table_name='procurement_items')
    op.drop_index('ix_procurement_items_status', table_name='procurement_items')
    op.drop_table('procurement_items')
