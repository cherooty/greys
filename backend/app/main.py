from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine
from app.models.base import Base
from app.models import apartment, price_calendar, source_setting  # noqa: F401 — metadata

# импорт роутеров
from app.api.endpoints import apartments, bookings, source_settings
from app.api import price_calendar

app = FastAPI(title="Greys API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)


# подключение роутеров
app.include_router(apartments.router, prefix="/api/apartments", tags=["apartments"])
app.include_router(bookings.router, prefix="/api/bookings", tags=["bookings"])
app.include_router(
    price_calendar.router,
    prefix="/api/price-calendar",
    tags=["price-calendar"],
)
app.include_router(
    source_settings.router,
    prefix="/api/source-settings",
    tags=["source-settings"],
)


@app.get("/")
def root():
    return {"message": "Greys backend is running"}