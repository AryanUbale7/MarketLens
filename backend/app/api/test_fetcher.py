from app.services.news_fetcher import fetch_mint_news

articles = fetch_mint_news()

for article in articles:
    print(article)