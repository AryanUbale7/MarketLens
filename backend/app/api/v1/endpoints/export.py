from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.category import Category
from app.models.source import Source
from app.models.article import Article

router = APIRouter()

@router.get("/articles")
def export_articles(db: Session = Depends(get_db)):
    results = (
        db.query(
            Article.title,
            Source.name.label("source"),
            Article.url,
            Article.published_date,
            Category.name.label("category")
        )
        .join(Source, Article.source_id == Source.id)
        .join(Category, Article.category_id == Category.id)
        .order_by(Article.created_at.desc())
        .all()
    )
    
    return [
        {
            "title": r.title,
            "source": r.source,
            "url": r.url,
            "published_date": r.published_date.isoformat() if r.published_date else None,
            "category": r.category
        }
        for r in results
    ]
