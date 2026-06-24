from app.database.database import engine
from app.database.base import Base

from app.models.category import Category
from app.models.source import Source
from app.models.article import Article

Base.metadata.create_all(bind=engine)

print("Tables Created Successfully 🚀")