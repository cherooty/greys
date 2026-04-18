from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as OrmSession

from app.core.database import SessionLocal
from app.models.source_setting import SourceSetting
from app.schemas.source_setting import SourceSettingOut, SourceSettingPut

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=list[SourceSettingOut])
def list_source_settings(db: OrmSession = Depends(get_db)):
    rows = db.query(SourceSetting).order_by(SourceSetting.source_id).all()
    return [
        SourceSettingOut(
            source_id=r.source_id,
            settings=_as_dict(r.settings_json),
        )
        for r in rows
    ]


@router.put("/{source_id}", response_model=SourceSettingOut)
def put_source_setting(
    source_id: str,
    body: SourceSettingPut,
    db: OrmSession = Depends(get_db),
):
    row = db.query(SourceSetting).filter(SourceSetting.source_id == source_id).first()
    payload = body.settings if isinstance(body.settings, dict) else {}
    if row is None:
        row = SourceSetting(source_id=source_id, settings_json=payload)
        db.add(row)
    else:
        row.settings_json = payload
    db.commit()
    db.refresh(row)
    return SourceSettingOut(
        source_id=row.source_id,
        settings=_as_dict(row.settings_json),
    )


def _as_dict(v: Any) -> dict[str, Any]:
    if isinstance(v, dict):
        return v
    return {}
