from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.apartment import Apartment
from app.schemas.apartment import ApartmentCreate, ApartmentResponse

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
