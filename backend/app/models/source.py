from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.database.base import Base

class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    website = Column(String(255))
    rss_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    last_fetch_status = Column(String(50), nullable=True)  # online, blocked, unavailable, no_rss_feed
    last_fetched_at = Column(DateTime, nullable=True)