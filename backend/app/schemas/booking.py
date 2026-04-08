from datetime import date, datetime

from pydantic import BaseModel


class BookingBase(BaseModel):
    apartment_id: int
    guest_name: str
    guest_contact: str | None = None
    check_in_date: date
    check_out_date: date
    check_in_time: str | None = None
    check_out_time: str | None = None
    total_price: float
    currency: str = "RUB"
    status: str = "confirmed"
    source: str = "manual"
    external_source: str | None = None
    external_id: str | None = None
    notes: str | None = None


class BookingCreate(BookingBase):
    pass


class BookingUpdate(BaseModel):
    check_in_date: date
    check_out_date: date
    guest_name: str
    total_price: float
    currency: str = "RUB"
    check_in_time: str | None = None
    check_out_time: str | None = None


class BookingResponse(BookingBase):
    id: int
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class BookingAvailabilityRange(BaseModel):
    check_in_date: date
    check_out_date: date

