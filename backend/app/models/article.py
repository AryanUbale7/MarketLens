from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean, Float
from app.database.base import Base
from datetime import datetime

class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(500), nullable=False)
    url = Column(String(1000), unique=True)

    source_id = Column(Integer, ForeignKey("sources.id"))
    category_id = Column(Integer, ForeignKey("categories.id"))

    published_date = Column(DateTime)

    summary = Column(Text)
    why_it_matters = Column(Text)

    priority_score = Column(Integer, default=0)

    # Verification columns
    verified = Column(Boolean, default=False)
    verified_at = Column(DateTime, nullable=True)
    verification_status = Column(String(50), default="Pending")
    http_status = Column(Integer, nullable=True)
    resolved_domain = Column(String(250), nullable=True)
    title_similarity = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    @property
    def is_fresh(self) -> bool:
        ref_date = self.published_date or self.created_at
        if not ref_date:
            return False
        return (datetime.utcnow() - ref_date).total_seconds() < 86400