from pydantic import BaseModel
from datetime import datetime


class ApartmentBase(BaseModel):
    name: str
    description: str | None = None
    address: str | None = None


class ApartmentCreate(ApartmentBase):
    pass


class ApartmentUpdate(BaseModel):
    name: str | None = None
    address: str | None = None


class ApartmentResponse(ApartmentBase):
    id: int
    created_at: datetime | None = None

    class Config:
        from_attributes = True
