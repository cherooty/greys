"""add price_calendar table

Revision ID: 20260408_01
Revises:
Create Date: 2026-04-08
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260408_01"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "price_calendar",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("apartment_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("price", sa.Integer(), nullable=True),
        sa.Column(
            "is_blocked",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("comment", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(
            ["apartment_id"],
            ["apartments.id"],
            name="fk_price_calendar_apartment_id_apartments",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "apartment_id",
            "date",
            name="uq_price_calendar_apartment_date",
        ),
    )
    op.create_index(
        "ix_price_calendar_apartment_id",
        "price_calendar",
        ["apartment_id"],
        unique=False,
    )
    op.create_index(
        "ix_price_calendar_date",
        "price_calendar",
        ["date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_price_calendar_date", table_name="price_calendar")
    op.drop_index("ix_price_calendar_apartment_id", table_name="price_calendar")
    op.drop_table("price_calendar")
