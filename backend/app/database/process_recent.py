import os
import sys

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.database.database import SessionLocal
from app.models.article import Article
from app.models.category import Category
from app.models.source import Source
from app.services.article_processor import process_article

def process_recent():
    db = SessionLocal()
    try:
        # Get 25 recent articles without summaries
        articles = db.query(Article).filter(Article.summary.is_(None)).order_by(Article.created_at.desc()).limit(25).all()
        print(f"Found {len(articles)} recent articles to process.")
        
        processed = 0
        for art in articles:
            print(f"Processing ID {art.id}: {art.title}...")
            try:
                res = process_article(art.id, db)
                if "error" not in res:
                    processed += 1
                    print("Success!")
                else:
                    print("Error:", res["error"])
            except Exception as e:
                print("Exception:", e)
        print(f"Completed processing. Total successful: {processed}")
    finally:
        db.close()

if __name__ == "__main__":
    process_recent()
