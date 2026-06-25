import os
import sys
from datetime import datetime

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.database.database import SessionLocal
from app.models.category import Category
from app.models.source import Source
from app.models.article import Article

def seed_legacy_articles():
    db = SessionLocal()
    try:
        articles_data = [
            {
                "title": "Succession Planning: How to draft a bulletproof Will for your estate",
                "url": "https://www.livemint.com/money/personal-finance/succession-planning-how-to-draft-a-bulletproof-will-for-your-estate-11718000000000.html",
                "source_id": 1, # Mint
                "category_id": 3, # Wealth Legacy
                "summary": "Drafting a will is crucial to avoid family disputes. Learn the legal requirements of writing a valid will in India, the role of executors, and how to register it.",
                "why_it_matters": "A properly drafted and registered will ensures seamless asset transition and legal safety for heirs.",
                "priority_score": 9,
                "published_date": datetime.utcnow()
            },
            {
                "title": "Mutual Fund Nominations: Why opting out can lead to legal hurdles for heirs",
                "url": "https://cafemutual.com/news/industry/mutual-fund-nominations-why-opting-out-can-lead-to-legal-hurdles-for-heirs-1171800000001.html",
                "source_id": 5, # Cafemutual
                "category_id": 3, # Wealth Legacy
                "summary": "SEBI has made nomination mandatory for all mutual fund folios. Opting out of nomination can leave legal heirs facing complex documentation to claim investments later.",
                "why_it_matters": "Advisors should proactively assist clients in completing nominations to prevent future gridlocks.",
                "priority_score": 8,
                "published_date": datetime.utcnow()
            },
            {
                "title": "Joint accounts vs Nominations: Which is better for estate transmission?",
                "url": "https://www.valueresearchonline.com/stories/joint-accounts-vs-nominations-which-is-better-for-estate-transmission-1171800000002.html",
                "source_id": 6, # Value Research
                "category_id": 3, # Wealth Legacy
                "summary": "Joint accounts allow immediate access to funds, whereas a nominee only acts as a trustee. We explore the legal distinction and best practices for estate planning.",
                "why_it_matters": "Nominees are trustees, not owners. Understanding the legal difference helps in robust estate setup.",
                "priority_score": 7,
                "published_date": datetime.utcnow()
            },
            {
                "title": "Inheritance Tax in India: Myths, facts and estate planning structures",
                "url": "https://economictimes.indiatimes.com/wealth/plan/inheritance-tax-in-india-myths-facts-and-estate-planning-structures-1171800000003.html",
                "source_id": 2, # Economic Times
                "category_id": 3, # Wealth Legacy
                "summary": "While India currently does not levy inheritance tax, high-net-worth individuals are increasingly setting up private trusts to safeguard family wealth against future regulatory shifts.",
                "why_it_matters": "Private family trusts offer asset protection and flexible succession mechanisms for legacy preservation.",
                "priority_score": 8,
                "published_date": datetime.utcnow()
            },
            {
                "title": "How to handle digital assets like crypto and email accounts in your Will",
                "url": "https://freefincal.com/how-to-handle-digital-assets-like-crypto-and-email-accounts-in-your-will-1171800000004.html",
                "source_id": 7, # Freefincal
                "category_id": 3, # Wealth Legacy
                "summary": "Digital estate planning is gaining relevance. Legal heirs must have clear instructions and access keys for online accounts, domains, and digital currencies.",
                "why_it_matters": "Without structured digital keys, online investments and crypto assets can become permanently inaccessible.",
                "priority_score": 7,
                "published_date": datetime.utcnow()
            },
            {
                "title": "SEBI introduces centralized system for reporting of deceased investors",
                "url": "https://www.sebi.gov.in/sebiweb/xml/RssAction.do?boardId=1&dec=1171800000005.html",
                "source_id": 8, # SEBI
                "category_id": 3, # Wealth Legacy
                "summary": "SEBI has mandated a centralized portal to report the death of listed security holders, simplifying transmission of shares to nominees and legal heirs across all registrars.",
                "why_it_matters": "A single death report now updates KYC systems across all stock registrars, easing transition operations.",
                "priority_score": 9,
                "published_date": datetime.utcnow()
            },
            {
                "title": "RBI rules on transmission of bank deposits to nominees without legal hassles",
                "url": "https://www.rbi.gov.in/pressreleases_rss.xml&dec=1171800000006.html",
                "source_id": 9, # RBI
                "category_id": 3, # Wealth Legacy
                "summary": "RBI reiterates that bank deposits must be settled for deceased depositors' nominees within 15 days of receiving proof of death and valid claim documentation.",
                "why_it_matters": "Ensures speedy liquidity release to family members without demanding unnecessary probate orders.",
                "priority_score": 8,
                "published_date": datetime.utcnow()
            }
        ]

        added = 0
        for item in articles_data:
            existing = db.query(Article).filter(Article.url == item["url"]).first()
            if not existing:
                article = Article(**item)
                db.add(article)
                added += 1
        
        db.commit()
        print(f"Successfully seeded {added} Wealth Legacy articles!")
    except Exception as e:
        print("Error during seed:", e)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_legacy_articles()
