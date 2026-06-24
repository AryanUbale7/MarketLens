from fastapi import FastAPI
from app.api.v1.endpoints.articles import router as article_router
from app.api.v1.endpoints.categories import router as category_router
from app.api.v1.endpoints.sources import router as source_router
from app.api.v1.endpoints.news import router as news_router
from app.api.v1.endpoints.ai import router as ai_router
app = FastAPI(
    title="News Platform API",
    version="1.0.0"
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.v1.endpoints.dashboard import router as dashboard_router

@app.get("/")
def home():
    return {
        "message": "News Platform Backend Running 🚀"
    }


app.include_router(
    category_router,
    prefix="/api/v1/categories",
    tags=["Categories"]
)
app.include_router(
    source_router,
    prefix="/api/v1/sources",
    tags=["Sources"]
)
app.include_router(
    article_router,
    prefix="/api/v1/articles",
    tags=["Articles"]
)
app.include_router(
    news_router,
    prefix="/api/v1",
    tags=["News Fetcher"]
)
app.include_router(
    ai_router,
    prefix="/api/v1",
    tags=["AI"]
)
app.include_router(
    dashboard_router,
    prefix="/api/v1/dashboard",
    tags=["Dashboard"]
)