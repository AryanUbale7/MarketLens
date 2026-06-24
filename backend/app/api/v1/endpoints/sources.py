from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.source import Source
from app.schemas.source import SourceCreate, SourceResponse

router = APIRouter()


@router.post("/", response_model=SourceResponse)
def create_source(
    source: SourceCreate,
    db: Session = Depends(get_db)
):
    new_source = Source(
        name=source.name,
        website=source.website
    )

    db.add(new_source)
    db.commit()
    db.refresh(new_source)

    return new_source


@router.get("/", response_model=list[SourceResponse])
def get_sources(
    db: Session = Depends(get_db)
):
    return db.query(Source).all()