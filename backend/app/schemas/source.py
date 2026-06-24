from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SourceCreate(BaseModel):
    name: str
    website: Optional[str] = None
    rss_url: Optional[str] = None
    is_active: Optional[bool] = True

class SourceResponse(BaseModel):
    id: int
    name: str
    website: Optional[str] = None
    rss_url: Optional[str] = None
    is_active: Optional[bool] = True
    last_fetch_status: Optional[str] = None
    last_fetched_at: Optional[datetime] = None
    class Config:
        from_attributes = True