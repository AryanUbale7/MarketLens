from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.database.database import get_db
from app.models.article import Article
from app.schemas.article import ArticleCreate, ArticleResponse
from sqlalchemy import or_
router = APIRouter()


@router.post("/", response_model=ArticleResponse)
def create_article(
    article: ArticleCreate,
    db: Session = Depends(get_db)
):
    new_article = Article(
        title=article.title,
        url=article.url,
        source_id=article.source_id,
        category_id=article.category_id,
        summary=article.summary,
        why_it_matters=article.why_it_matters,
        priority_score=article.priority_score
    )

    db.add(new_article)
    db.commit()
    db.refresh(new_article)

    return new_article


@router.get("/", response_model=list[ArticleResponse])
def get_articles(
    q: Optional[str] = None,
    category_id: Optional[int] = None,
    source_id: Optional[int] = None,
    source_group: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    query = db.query(Article)

    if q:
        query = query.filter(
            or_(
                Article.title.ilike(f"%{q}%"),
                Article.summary.ilike(f"%{q}%")
            )
        )

    if category_id:
        query = query.filter(
            Article.category_id == category_id
        )

    if source_id:
        query = query.filter(
            Article.source_id == source_id
        )

    if source_group == "regulations":
        query = query.filter(
            Article.source_id.in_([8, 9, 10])
        )

    articles = (
        query
        .order_by(Article.published_date.desc().nulls_last(), Article.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return articles


@router.get("/{article_id}", response_model=ArticleResponse)
def get_article(
    article_id: int,
    db: Session = Depends(get_db)
):
    article = db.query(Article).filter(
        Article.id == article_id
    ).first()

    if not article:
        raise HTTPException(
            status_code=404,
            detail="Article not found"
        )

    return article
@router.get("/search/", response_model=list[ArticleResponse])
def search_articles(
    q: str,
    db: Session = Depends(get_db)
):
    articles = db.query(Article).filter(
        or_(
            Article.title.ilike(f"%{q}%"),
            Article.summary.ilike(f"%{q}%")
        )
    ).order_by(Article.published_date.desc().nulls_last(), Article.created_at.desc()).all()

    return articles