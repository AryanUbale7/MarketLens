import os
import sys

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.database.database import SessionLocal
from app.models.category import Category
from app.models.source import Source
from app.models.article import Article

def remove_legacy_seeds():
    db = SessionLocal()
    try:
        # Delete only the specific seeded URLs we introduced
        urls_to_delete = [
            "https://www.livemint.com/money/personal-finance/succession-planning-how-to-draft-a-bulletproof-will-for-your-estate-11718000000000.html",
            "https://cafemutual.com/news/industry/mutual-fund-nominations-why-opting-out-can-lead-to-legal-hurdles-for-heirs-1171800000001.html",
            "https://www.valueresearchonline.com/stories/joint-accounts-vs-nominations-which-is-better-for-estate-transmission-1171800000002.html",
            "https://economictimes.indiatimes.com/wealth/plan/inheritance-tax-in-india-myths-facts-and-estate-planning-structures-1171800000003.html",
            "https://freefincal.com/how-to-handle-digital-assets-like-crypto-and-email-accounts-in-your-will-1171800000004.html",
            "https://www.sebi.gov.in/sebiweb/xml/RssAction.do?boardId=1&dec=1171800000005.html",
            "https://www.rbi.org.in/pressreleases_rss.xml&dec=1171800000006.html"
        ]
        
        deleted = 0
        for url in urls_to_delete:
            art = db.query(Article).filter(Article.url == url).first()
            if art:
                db.delete(art)
                deleted += 1
                
        db.commit()
        print(f"Successfully deleted {deleted} seeded Wealth Legacy articles.")
    except Exception as e:
        print("Error during deletion:", e)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    remove_legacy_seeds()
