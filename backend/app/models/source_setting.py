from sqlalchemy import Column, Integer, String, text
from sqlalchemy.dialects.postgresql import JSONB

from app.models.base import Base


class SourceSetting(Base):
    __tablename__ = "source_settings"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(String(64), unique=True, nullable=False, index=True)
    settings_json = Column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )
