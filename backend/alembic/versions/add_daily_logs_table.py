"""Add daily_logs table

Revision ID: add_daily_logs
Revises: c336b9541280
Create Date: 2025-12-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_daily_logs'
down_revision = 'c336b9541280'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create daily_logs table
    op.create_table(
        'daily_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('activity', sa.Text(), nullable=False),
        sa.Column('hours_spent', sa.Numeric(precision=4, scale=2), nullable=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    # Create index on user_id and date for faster queries
    op.create_index('ix_daily_logs_user_id', 'daily_logs', ['user_id'])
    op.create_index('ix_daily_logs_date', 'daily_logs', ['date'])


def downgrade() -> None:
    op.drop_index('ix_daily_logs_date', table_name='daily_logs')
    op.drop_index('ix_daily_logs_user_id', table_name='daily_logs')
    op.drop_table('daily_logs')
