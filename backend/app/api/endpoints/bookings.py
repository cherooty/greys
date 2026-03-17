from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date

from app.core.database import SessionLocal
from app.models.booking import Booking
from app.schemas.booking import BookingCreate, BookingResponse

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def has_booking_overlap(
    db: Session,
    apartment_id: int,
    check_in_date: date,
    check_out_date: date,
) -> bool:
    return (
        db.query(Booking.id)
        .filter(
            Booking.apartment_id == apartment_id,
            Booking.check_in_date < check_out_date,
            Booking.check_out_date > check_in_date,
        )
        .first()
        is not None
    )


@router.post("/", response_model=BookingResponse)
def create_booking(booking: BookingCreate, db: Session = Depends(get_db)):
    if booking.check_in_date >= booking.check_out_date:
        raise HTTPException(
            status_code=400,
            detail="check_out_date must be greater than check_in_date",
        )

    if has_booking_overlap(
        db,
        booking.apartment_id,
        booking.check_in_date,
        booking.check_out_date,
    ):
        raise HTTPException(
            status_code=400,
            detail="Booking dates overlap with an existing booking",
        )

    db_booking = Booking(**booking.model_dump())
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking


@router.get("/", response_model=list[BookingResponse])
def list_bookings(db: Session = Depends(get_db)):
    return db.query(Booking).order_by(Booking.check_in_date).all()

