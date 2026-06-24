import os
import sys

# Add parent directory to path so we can run this directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.database.database import SessionLocal, engine
from app.database.base import Base
from app.models.category import Category
from app.models.source import Source

def seed_database():
    print("Initializing Database tables (if not exist)...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("Seeding Categories...")
        categories = [
            {"id": 1, "name": "Wealth Creation", "description": "Equities, Mutual Funds, SIPs, Bonds, SEBI / AMFI updates"},
            {"id": 2, "name": "Wealth Protection", "description": "Life Insurance, General Insurance, IRDAI updates"},
            {"id": 3, "name": "Wealth Legacy", "description": "Succession Planning, Estate Planning, Wills, Nominations, Inheritance"}
        ]
        for cat_data in categories:
            cat = db.query(Category).filter(Category.id == cat_data["id"]).first()
            if cat:
                cat.name = cat_data["name"]
                cat.description = cat_data["description"]
            else:
                cat = Category(**cat_data)
                db.add(cat)
        db.commit()
        print("Categories seeded successfully.")

        print("Seeding Sources...")
        sources = [
            {"id": 1, "name": "Mint", "website": "https://www.livemint.com", "rss_url": "https://www.livemint.com/rss/money", "is_active": True},
            {"id": 2, "name": "Economic Times", "website": "https://economictimes.indiatimes.com", "rss_url": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms", "is_active": True},
            {"id": 3, "name": "Business Standard", "website": "https://www.business-standard.com", "rss_url": "https://www.business-standard.com/rss/finance-101.rss", "is_active": True},
            {"id": 4, "name": "Moneycontrol", "website": "https://www.moneycontrol.com", "rss_url": "https://www.moneycontrol.com/rss/latestnews.xml", "is_active": True},
            {"id": 5, "name": "Cafemutual", "website": "https://cafemutual.com", "rss_url": "https://cafemutual.com/rss/news", "is_active": True},
            {"id": 6, "name": "Value Research", "website": "https://www.valueresearchonline.com", "rss_url": "https://www.valueresearchonline.com/rss/", "is_active": True},
            {"id": 7, "name": "Freefincal", "website": "https://freefincal.com", "rss_url": "https://freefincal.com/feed/", "is_active": True},
            {"id": 8, "name": "SEBI", "website": "https://www.sebi.gov.in", "rss_url": "https://www.sebi.gov.in/sebiweb/xml/RssAction.do?boardId=1", "is_active": True},
            {"id": 9, "name": "RBI", "website": "https://www.rbi.org.in", "rss_url": "https://www.rbi.org.in/pressreleases_rss.xml", "is_active": True},
            {"id": 10, "name": "IRDAI", "website": "https://irdai.gov.in", "rss_url": "https://irdai.gov.in/rss-feed", "is_active": True},
            {"id": 11, "name": "AMFI", "website": "https://www.amfiindia.com", "rss_url": None, "is_active": True}
        ]
        for src_data in sources:
            src = db.query(Source).filter(Source.id == src_data["id"]).first()
            if src:
                src.name = src_data["name"]
                src.website = src_data["website"]
                src.rss_url = src_data.get("rss_url")
                src.is_active = src_data.get("is_active", True)
            else:
                src = Source(**src_data)
                db.add(src)
        db.commit()
        print("Sources seeded successfully.")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
