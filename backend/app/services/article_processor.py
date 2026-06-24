from sqlalchemy.orm import Session

from app.models.article import Article
from app.services.groq_service import generate_news_insights


def process_article(article_id: int, db: Session):

    article = (
        db.query(Article)
        .filter(Article.id == article_id)
        .first()
    )

    if not article:
        return {
            "error": "Article not found"
        }

    insights = generate_news_insights(
        article.title
    )

    article.summary = insights["summary"]
    article.why_it_matters = insights["why_it_matters"]
    article.priority_score = insights["priority_score"]

    db.commit()

    return {
        "message": "Article Processed",
        "article_id": article.id
    }


def process_all_articles(db: Session):

    articles = (
        db.query(Article)
        .filter(Article.summary.is_(None))
        .all()
    )

    print(f"Articles Found: {len(articles)}")

    processed_count = 0

    for article in articles:

        print(f"Processing Article ID: {article.id}")

        try:

            insights = generate_news_insights(
                article.title
            )

            print(insights)

            article.summary = insights["summary"]
            article.why_it_matters = insights["why_it_matters"]
            article.priority_score = insights["priority_score"]

            processed_count += 1

        except Exception as e:
            print("ERROR:", e)

    db.commit()

    return {
        "processed": processed_count
    }