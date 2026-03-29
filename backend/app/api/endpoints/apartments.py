from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.apartment import Apartment
from app.models.booking import Booking
from app.schemas.apartment import ApartmentCreate, ApartmentResponse
from app.schemas.booking import BookingAvailabilityRange

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=ApartmentResponse)
def create_apartment(apartment: ApartmentCreate, db: Session = Depends(get_db)):
    db_apartment = Apartment(**apartment.dict())
    db.add(db_apartment)
    db.commit()
    db.refresh(db_apartment)
    return db_apartment


@router.get("/", response_model=list[ApartmentResponse])
def list_apartments(db: Session = Depends(get_db)):
    return db.query(Apartment).all()


@router.get(
    "/{apartment_id}/availability",
    response_model=list[BookingAvailabilityRange],
)
def get_apartment_availability(apartment_id: int, db: Session = Depends(get_db)):
    bookings = (
        db.query(Booking)
        .filter(Booking.apartment_id == apartment_id)
        .order_by(Booking.check_in_date)
        .all()
    )
    ranges = [
        BookingAvailabilityRange(
            check_in_date=b.check_in_date,
            check_out_date=b.check_out_date,
        )
        for b in bookings
    ]
    if not ranges:
        return []

    merged: list[BookingAvailabilityRange] = []
    current = ranges[0]
    for nxt in ranges[1:]:
        if nxt.check_in_date <= current.check_out_date:
            current = BookingAvailabilityRange(
                check_in_date=current.check_in_date,
                check_out_date=max(current.check_out_date, nxt.check_out_date),
            )
        else:
            merged.append(current)
            current = nxt
    merged.append(current)
    return merged
