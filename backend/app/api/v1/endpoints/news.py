from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.services.news_fetcher import fetch_all_news
from app.database.database import get_db


router = APIRouter()




@router.post("/fetch-news")
def fetch_news(
    db: Session = Depends(get_db)
):
    return fetch_all_news(db)