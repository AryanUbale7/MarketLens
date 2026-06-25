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

@router.get("/ai/search")
def ai_search(
    query: str,
    db: Session = Depends(get_db)
):
    from app.services.groq_service import parse_natural_language_query
    from app.models.article import Article
    
    filters = parse_natural_language_query(query)
    
    db_query = db.query(Article)
    
    if filters.get("category_id"):
        db_query = db_query.filter(Article.category_id == filters["category_id"])
        
    if filters.get("source_id"):
        db_query = db_query.filter(Article.source_id == filters["source_id"])
    elif filters.get("source_group") == "regulations":
        db_query = db_query.filter(Article.source_id.in_([8, 9, 10]))
        
    if filters.get("q"):
        search_term = f"%{filters['q']}%"
        db_query = db_query.filter(Article.title.ilike(search_term) | Article.summary.ilike(search_term))
        
    articles = db_query.order_by(Article.created_at.desc()).limit(50).all()
    
    return {
        "filters": filters,
        "articles": articles
    }    