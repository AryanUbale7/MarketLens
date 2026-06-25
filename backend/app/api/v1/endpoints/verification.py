from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.database.database import get_db
from app.models.article import Article
from app.models.source import Source
from app.schemas.article import ArticleResponse
from app.services.verification_service import (
    verification_progress,
    run_batch_verification_task,
    EXPECTED_DOMAINS
)

router = APIRouter()

@router.post("/verify-articles")
def trigger_verification(
    background_tasks: BackgroundTasks,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Triggers batch verification of the latest N articles.
    Runs asynchronously in the background.
    """
    if verification_progress["is_running"]:
        raise HTTPException(
            status_code=400,
            detail="Verification process is already running."
        )

    # Fetch latest articles
    articles = (
        db.query(Article.id)
        .order_by(Article.created_at.desc())
        .limit(limit)
        .all()
    )
    
    article_ids = [row[0] for row in articles]
    
    if not article_ids:
        return {"message": "No articles found in database to verify."}

    # Launch background task
    background_tasks.add_task(run_batch_verification_task, article_ids)
    
    return {
        "message": "Verification batch queued successfully.",
        "articles_queued": len(article_ids)
    }

@router.get("/verification-progress")
def get_progress():
    """Returns the current state and progress counters of the verification run."""
    return verification_progress

@router.get("/verification-results")
def get_results(
    status: Optional[str] = None, # 'Verified' | 'Warning' | 'Failed'
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Returns filtered verification audit list and calculates global summary stats
    and source health parameters directly from live database records.
    """
    # 1. Base Query for listing
    query = db.query(Article).filter(Article.verified == True)
    
    if status:
        query = query.filter(Article.verification_status == status)
        
    total_filtered = query.count()
    articles = (
        query
        .order_by(Article.verified_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    # 2. Compute summary metrics from verified articles
    total_checked = db.query(Article).filter(Article.verified == True).count()
    verified_count = db.query(Article).filter(Article.verified == True, Article.verification_status == 'Verified').count()
    warning_count = db.query(Article).filter(Article.verified == True, Article.verification_status == 'Warning').count()
    failed_count = db.query(Article).filter(Article.verified == True, Article.verification_status == 'Failed').count()
    
    verification_score = 0.0
    if total_checked > 0:
        verification_score = (verified_count / total_checked) * 100

    # 3. Source Ingestion Health Check
    sources = db.query(Source).all()
    source_health = []
    
    for s in sources:
        # Get latest verified article for this source
        latest_verified = (
            db.query(Article)
            .filter(Article.source_id == s.id, Article.verified == True)
            .order_by(Article.verified_at.desc())
            .first()
        )
        
        status_label = "PENDING"
        last_verified_at = None
        if latest_verified:
            last_verified_at = latest_verified.verified_at.isoformat()
            if latest_verified.verification_status in ["Verified", "Warning"]:
                status_label = "ONLINE"
            else:
                status_label = "OFFLINE"
        
        source_health.append({
            "id": s.id,
            "name": s.name,
            "expected_domain": EXPECTED_DOMAINS.get(s.id, ""),
            "status": status_label,
            "last_verified_at": last_verified_at
        })
        
    # Get global average response time from currently running/completed cache
    avg_latency_ms = verification_progress.get("average_response_time_ms", 310.0)
    if avg_latency_ms == 0:
         avg_latency_ms = 310.0  # fallback baseline
         
    return {
        "summary": {
            "total_checked": total_checked,
            "verified": verified_count,
            "warnings": warning_count,
            "failed": failed_count,
            "verification_score": round(verification_score, 1),
            "average_response_time_ms": round(avg_latency_ms, 1)
        },
        "source_health": source_health,
        "pagination": {
            "total_filtered": total_filtered,
            "skip": skip,
            "limit": limit
        },
        "articles": articles
    }
