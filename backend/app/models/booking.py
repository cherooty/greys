from datetime import date, datetime

from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String

from app.models.base import Base


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    apartment_id = Column(Integer, ForeignKey("apartments.id"), nullable=False, index=True)

    guest_name = Column(String, nullable=False)
    guest_contact = Column(String, nullable=True)

    check_in_date = Column(Date, nullable=False)
    check_out_date = Column(Date, nullable=False)

    total_price = Column(Float, nullable=False)
    currency = Column(String, nullable=False, default="RUB")

    status = Column(String, nullable=False, default="confirmed")

    source = Column(String, nullable=False, default="manual")
    external_source = Column(String, nullable=True)
    external_id = Column(String, nullable=True)

    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

