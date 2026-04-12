from sqlalchemy import (
    Boolean,
    Column,
    Date,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.models.base import Base


class PriceCalendar(Base):
    """Цена и доступность по дням для квартиры (календарь цен)."""

    __tablename__ = "price_calendar"

    __table_args__ = (
        UniqueConstraint(
            "apartment_id",
            "date",
            name="uq_price_calendar_apartment_date",
        ),
        Index("ix_price_calendar_apartment_id", "apartment_id"),
        Index("ix_price_calendar_date", "date"),
    )

    id = Column(Integer, primary_key=True)
    apartment_id = Column(
        Integer,
        ForeignKey("apartments.id", ondelete="CASCADE"),
        nullable=False,
    )
    date = Column(Date, nullable=False)
    price = Column(Integer, nullable=True)
    is_blocked = Column(Boolean, nullable=False, default=False)
    comment = Column(String, nullable=True)

    apartment = relationship("Apartment", backref="price_calendar")
