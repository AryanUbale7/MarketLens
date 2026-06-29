from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ArticleCreate(BaseModel):
    title: str
    url: str
    source_id: int
    category_id: int
    summary: Optional[str] = None
    why_it_matters: Optional[str] = None
    priority_score: Optional[int] = 0
    published_date: Optional[datetime] = None


class ArticleResponse(BaseModel):
    id: int
    title: str
    url: str
    source_id: int
    category_id: int
    summary: Optional[str]
    why_it_matters: Optional[str]
    priority_score: int
    published_date: Optional[datetime]
    created_at: datetime
    
    # Verification details
    verified: bool = False
    verified_at: Optional[datetime] = None
    verification_status: str = "Pending"
    http_status: Optional[int] = None
    resolved_domain: Optional[str] = None
    title_similarity: Optional[float] = None
    verification_errors: Optional[str] = None
    is_fresh: bool = False

    class Config:
        from_attributes = True


class AISearchResponse(BaseModel):
    filters: dict
    articles: list[ArticleResponse]


class SourceHealthItem(BaseModel):
    id: int
    name: str
    expected_domain: str
    status: str
    last_verified_at: Optional[str] = None


class VerificationSummary(BaseModel):
    total_checked: int
    verified: int
    warnings: int
    failed: int
    verification_score: float
    average_response_time_ms: float


class VerificationPagination(BaseModel):
    total_filtered: int
    skip: int
    limit: int


class VerificationResultsResponse(BaseModel):
    summary: VerificationSummary
    source_health: list[SourceHealthItem]
    pagination: VerificationPagination
    articles: list[ArticleResponse]