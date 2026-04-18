from typing import Any

from pydantic import BaseModel, Field


class SourceSettingOut(BaseModel):
    source_id: str
    settings: dict[str, Any] = Field(default_factory=dict)


class SourceSettingPut(BaseModel):
    settings: dict[str, Any] = Field(default_factory=dict)
