"""add bookings.guests_count and bookings.messengers

Revision ID: 20260421_01
Revises: 20260419_01
Create Date: 2026-04-21
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260421_01"
down_revision: Union[str, None] = "20260419_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "bookings",
        sa.Column("guests_count", sa.Integer(), nullable=True),
    )
    op.add_column(
        "bookings",
        sa.Column("messengers", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("bookings", "messengers")
    op.drop_column("bookings", "guests_count")
