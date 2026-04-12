from datetime import date

from pydantic import BaseModel, ConfigDict


class PriceCalendarItem(BaseModel):
    # Сериализация из SQLAlchemy без ручного перечисления полей
    model_config = ConfigDict(from_attributes=True)

    date: date
    price: int | None
    is_blocked: bool
    comment: str | None


class PriceCalendarRangeRequest(BaseModel):
    apartment_id: int
    start_date: date
    end_date: date


class PriceCalendarUpsertRequest(BaseModel):
    apartment_id: int
    start_date: date
    end_date: date
    price: int | None
    is_blocked: bool
    comment: str | None
