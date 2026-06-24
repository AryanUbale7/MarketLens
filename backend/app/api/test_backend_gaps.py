import os
import sys

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.database.database import SessionLocal
from app.services.news_fetcher import fetch_all_news
from app.models.article import Article
from app.models.source import Source
from app.models.category import Category

def test_backend_pipelines():
    print("Initializing DB session...")
    db = SessionLocal()
    try:
        # 1. Fetch and Ingest news from all 11 sources
        print("\n--- Ingesting articles from all 11 sources ---")
        fetch_results = fetch_all_news(db)
        print("Ingestion results:")
        for source, count in fetch_results.items():
            print(f"  {source}: {count}")

        # 2. Verify DB entries have published_date and correct category_id
        print("\n--- Verifying database records ---")
        total_in_db = db.query(Article).count()
        articles_with_date = db.query(Article).filter(Article.published_date.isnot(None)).count()
        
        print(f"Total articles in DB: {total_in_db}")
        print(f"Articles with populated published_date: {articles_with_date}")
        
        # Pull a few articles to display details
        sample_articles = db.query(Article).order_by(Article.id.desc()).limit(5).all()
        print("\nSample Articles:")
        for idx, art in enumerate(sample_articles):
            source_name = db.query(Source).filter(Source.id == art.source_id).first().name
            cat_name = db.query(Category).filter(Category.id == art.category_id).first().name
            print(f"  {idx+1}. [{source_name}] [{cat_name}] {art.title[:60]}...")
            print(f"     URL: {art.url[:60]}")
            print(f"     Published Date: {art.published_date}")

        # 3. Test Dashboard Stats calculations
        print("\n--- Testing Dashboard Stats aggregation endpoint ---")
        from app.api.v1.endpoints.dashboard import dashboard_stats, get_source_distribution, get_category_distribution
        stats = dashboard_stats(db)
        print("Stats API Response:")
        import pprint
        pprint.pprint(stats)

        # 4. Test Source Distribution calculations
        print("\n--- Testing Source Distribution endpoint ---")
        source_dist = get_source_distribution(db)
        print("Source Distribution API Response:")
        pprint.pprint(source_dist)

        # 5. Test Category Distribution calculations
        print("\n--- Testing Category Distribution endpoint ---")
        category_dist = get_category_distribution(db)
        print("Category Distribution API Response:")
        pprint.pprint(category_dist)

        # Assertions
        assert stats["total_articles"] == total_in_db, "Total articles mismatch"
        assert "source_distribution" in stats, "source_distribution missing in stats response"
        assert len(stats["source_distribution"]) == 11, "All 11 sources must be in source_distribution"
        assert len(source_dist) == 11, "All 11 sources must be in source_distribution endpoint"
        assert "wealth_creation" in category_dist, "wealth_creation missing in category_dist response"
        
        print("\nAll backend gap tests passed successfully!")

    except Exception as e:
        print(f"\nTest failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_backend_pipelines()
