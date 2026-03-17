from fastapi import FastAPI

from app.core.database import engine
from app.models.base import Base
from app.models import apartment

# импорт роутеров
from app.api.endpoints import apartments, bookings

app = FastAPI(title="Greys API")


@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)


# подключение роутеров
app.include_router(apartments.router, prefix="/api/apartments", tags=["apartments"])
app.include_router(bookings.router, prefix="/api/bookings", tags=["bookings"])


@app.get("/")
def root():
    return {"message": "Greys backend is running"}