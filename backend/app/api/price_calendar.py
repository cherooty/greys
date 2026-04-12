from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.apartment import Apartment
from app.models.price_calendar import PriceCalendar
from app.schemas.price_calendar import PriceCalendarItem, PriceCalendarUpsertRequest

router = APIRouter()


def get_db():
    # Тот же паттерн, что в endpoints/apartments и bookings
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def iterate_dates(start_date: date, end_date: date):
    """Границы включительно: [start_date, end_date]."""
    d = start_date
    while d <= end_date:
        yield d
        d += timedelta(days=1)


@router.get("/", response_model=list[PriceCalendarItem])
def get_price_calendar(
    apartment_id: int = Query(..., description="ID квартиры"),
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db),
):
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be <= end_date",
        )
    if db.get(Apartment, apartment_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="apartment not found",
        )
    rows = (
        db.query(PriceCalendar)
        .filter(
            PriceCalendar.apartment_id == apartment_id,
            PriceCalendar.date >= start_date,
            PriceCalendar.date <= end_date,
        )
        .order_by(PriceCalendar.date)
        .all()
    )
    return rows


@router.post("/", response_model=list[PriceCalendarItem])
def upsert_price_calendar(
    body: PriceCalendarUpsertRequest,
    db: Session = Depends(get_db),
):
    if body.start_date > body.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be <= end_date",
        )
    if db.get(Apartment, body.apartment_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="apartment not found",
        )

    # Один запрос на весь диапазон вместо N выборок в цикле
    existing = (
        db.query(PriceCalendar)
        .filter(
            PriceCalendar.apartment_id == body.apartment_id,
            PriceCalendar.date >= body.start_date,
            PriceCalendar.date <= body.end_date,
        )
        .all()
    )
    existing_map = {row.date: row for row in existing}

    for d in iterate_dates(body.start_date, body.end_date):
        row = existing_map.get(d)
        if row is not None:
            row.price = body.price
            row.is_blocked = body.is_blocked
            row.comment = body.comment
        else:
            db.add(
                PriceCalendar(
                    apartment_id=body.apartment_id,
                    date=d,
                    price=body.price,
                    is_blocked=body.is_blocked,
                    comment=body.comment,
                )
            )

    db.commit()

    # Итог диапазона одним запросом (после flush/commit id у новых строк есть)
    rows = (
        db.query(PriceCalendar)
        .filter(
            PriceCalendar.apartment_id == body.apartment_id,
            PriceCalendar.date >= body.start_date,
            PriceCalendar.date <= body.end_date,
        )
        .order_by(PriceCalendar.date)
        .all()
    )
    return rows
