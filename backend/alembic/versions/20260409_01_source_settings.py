"""add source_settings table

Revision ID: 20260409_01
Revises: 20260408_01
Create Date: 2026-04-09
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260409_01"
down_revision: Union[str, None] = "20260408_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "source_settings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("source_id", sa.String(length=64), nullable=False),
        sa.Column(
            "settings_json",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_id", name="uq_source_settings_source_id"),
    )
    op.create_index(
        "ix_source_settings_source_id",
        "source_settings",
        ["source_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_source_settings_source_id", table_name="source_settings")
    op.drop_table("source_settings")
