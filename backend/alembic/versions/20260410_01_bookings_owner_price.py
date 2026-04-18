"""add bookings.owner_price

Revision ID: 20260410_01
Revises: 20260409_01
Create Date: 2026-04-10
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260410_01"
down_revision: Union[str, None] = "20260409_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "bookings",
        sa.Column("owner_price", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("bookings", "owner_price")
