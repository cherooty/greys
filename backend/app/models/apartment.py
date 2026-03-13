from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

from app.models.base import Base


class Apartment(Base):
    __tablename__ = "apartments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    address = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
