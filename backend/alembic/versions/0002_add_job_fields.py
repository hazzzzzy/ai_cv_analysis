"""add job fields to sessions

Revision ID: 0002_add_job_fields
Revises: 0001_initial
Create Date: 2026-02-01 12:00:00

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = '0002_add_job_fields'
down_revision = '0001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('sessions', sa.Column('job_title', sa.String(length=255), nullable=True))
    op.add_column('sessions', sa.Column('job_description', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('sessions', 'job_description')
    op.drop_column('sessions', 'job_title')
