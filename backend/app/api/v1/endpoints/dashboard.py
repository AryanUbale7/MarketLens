from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.database import get_db
from app.models.article import Article
from app.models.source import Source

router = APIRouter()


@router.get("/stats")
def dashboard_stats(
    db: Session = Depends(get_db)
):
    # Total count of all articles
    total_articles = db.query(Article).count()

    # Category counts
    wealth_creation = (
        db.query(Article)
        .filter(Article.category_id == 1)
        .count()
    )

    wealth_protection = (
        db.query(Article)
        .filter(Article.category_id == 2)
        .count()
    )

    wealth_legacy = (
        db.query(Article)
        .filter(Article.category_id == 3)
        .count()
    )

    # Source Distribution counts
    all_sources = db.query(Source).all()
    source_distribution = {source.name: 0 for source in all_sources}

    source_counts = (
        db.query(Source.name, func.count(Article.id))
        .join(Article, Article.source_id == Source.id)
        .group_by(Source.name)
        .all()
    )

    for name, count in source_counts:
        source_distribution[name] = count

    # Source health summary
    online_sources = sum(1 for s in all_sources if s.last_fetch_status == "online")
    failed_sources = sum(1 for s in all_sources if s.last_fetch_status and s.last_fetch_status != "online")

    return {
        "total_articles": total_articles,
        "wealth_creation": wealth_creation,
        "wealth_protection": wealth_protection,
        "wealth_legacy": wealth_legacy,
        "source_distribution": source_distribution,
        "online_sources": online_sources,
        "failed_sources": failed_sources
    }


@router.get("/latest")
def latest_news(
    db: Session = Depends(get_db)
):
    articles = (
        db.query(Article)
        .order_by(Article.published_date.desc())
        .limit(10)
        .all()
    )

    return articles


@router.get("/source-distribution")
def get_source_distribution(
    db: Session = Depends(get_db)
):
    all_sources = db.query(Source).all()
    distribution = {source.name: 0 for source in all_sources}

    source_counts = (
        db.query(Source.name, func.count(Article.id))
        .join(Article, Article.source_id == Source.id)
        .group_by(Source.name)
        .all()
    )

    for name, count in source_counts:
        distribution[name] = count

    return distribution


@router.get("/category-distribution")
def get_category_distribution(
    db: Session = Depends(get_db)
):
    wealth_creation = (
        db.query(Article)
        .filter(Article.category_id == 1)
        .count()
    )

    wealth_protection = (
        db.query(Article)
        .filter(Article.category_id == 2)
        .count()
    )

    wealth_legacy = (
        db.query(Article)
        .filter(Article.category_id == 3)
        .count()
    )

    return {
        "wealth_creation": wealth_creation,
        "wealth_protection": wealth_protection,
        "wealth_legacy": wealth_legacy
    }


@router.get("/source-health")
def get_source_health(
    db: Session = Depends(get_db)
):
    """
    Returns the health status of all 11 configured news sources.
    """
    all_sources = db.query(Source).all()
    health = {}
    
    for source in all_sources:
        health[source.name] = {
            "status": source.last_fetch_status or "unknown",
            "last_fetched": source.last_fetched_at.isoformat() if source.last_fetched_at else None,
            "rss_url": source.rss_url,
            "is_active": source.is_active
        }
    
    return health