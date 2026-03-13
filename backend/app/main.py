from fastapi import FastAPI

from app.core.database import engine
from app.models.base import Base
from app.models import apartment

# импорт роутера
from app.api.endpoints import apartments

app = FastAPI(title="Greys API")


@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)


# подключение роутера
app.include_router(apartments.router, prefix="/api/apartments", tags=["apartments"])


@app.get("/")
def root():
    return {"message": "Greys backend is running"}