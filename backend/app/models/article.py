from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
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

    created_at = Column(DateTime, default=datetime.utcnow)