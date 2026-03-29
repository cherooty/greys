from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date

from app.core.database import SessionLocal
from app.models.booking import Booking
from app.schemas.booking import BookingCreate, BookingResponse, BookingUpdate

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
    exclude_booking_id: int | None = None,
) -> bool:
    q = db.query(Booking.id).filter(
        Booking.apartment_id == apartment_id,
        Booking.status == "confirmed",
        Booking.check_in_date < check_out_date,
        Booking.check_out_date > check_in_date,
    )
    if exclude_booking_id is not None:
        q = q.filter(Booking.id != exclude_booking_id)
    return q.first() is not None


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


@router.patch("/{booking_id}", response_model=BookingResponse)
def update_booking_dates(
    booking_id: int,
    body: BookingUpdate,
    db: Session = Depends(get_db),
):
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Not found")
    if booking.status == "cancelled":
        raise HTTPException(
            status_code=400,
            detail="Cannot update cancelled booking",
        )
    if body.check_in_date >= body.check_out_date:
        raise HTTPException(
            status_code=400,
            detail="check_out_date must be greater than check_in_date",
        )
    if has_booking_overlap(
        db,
        booking.apartment_id,
        body.check_in_date,
        body.check_out_date,
        exclude_booking_id=booking_id,
    ):
        raise HTTPException(
            status_code=400,
            detail="Booking dates overlap with an existing booking",
        )
    booking.check_in_date = body.check_in_date
    booking.check_out_date = body.check_out_date
    db.commit()
    db.refresh(booking)
    return booking


@router.patch("/{booking_id}/cancel", response_model=BookingResponse)
def cancel_booking(booking_id: int, db: Session = Depends(get_db)):
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Not found")
    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)
    return booking

