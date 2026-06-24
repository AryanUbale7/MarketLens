from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.services.article_processor import process_article
from app.services.article_processor import (
    process_article,
    process_all_articles
)
router = APIRouter()


@router.post("/process-article/{article_id}")
def process_article_ai(
    article_id: int,
    db: Session = Depends(get_db)
):
    return process_article(
        article_id,
        db
    )
@router.post("/process-all-articles")
def process_all_articles_ai(
    db: Session = Depends(get_db)
):
    return process_all_articles(db)    