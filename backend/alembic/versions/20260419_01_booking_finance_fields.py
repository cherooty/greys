"""add booking finance columns

Revision ID: 20260419_01
Revises: 20260410_01
Create Date: 2026-04-19
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260419_01"
down_revision: Union[str, None] = "20260410_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "bookings",
        sa.Column("commission_price", sa.Float(), nullable=True),
    )
    op.add_column(
        "bookings",
        sa.Column("commission_percent", sa.Float(), nullable=True),
    )
    op.add_column(
        "bookings",
        sa.Column("paid_amount", sa.Float(), nullable=True),
    )
    op.add_column(
        "bookings",
        sa.Column("paid_date", sa.Date(), nullable=True),
    )
    op.add_column(
        "bookings",
        sa.Column("payment_method", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("bookings", "payment_method")
    op.drop_column("bookings", "paid_date")
    op.drop_column("bookings", "paid_amount")
    op.drop_column("bookings", "commission_percent")
    op.drop_column("bookings", "commission_price")
