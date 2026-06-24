import feedparser
import requests
import re
import logging
import email.utils
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.article import Article
from app.models.source import Source
from app.models.category import Category

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =========================
# HELPER FUNCTIONS
# =========================

def parse_feed_with_ua(url: str):
    """
    Downloads and parses an RSS feed using a standard browser User-Agent
    to bypass potential bot-blocking mechanisms.
    Returns (parsed_feed_or_None, status_string).
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        }
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code == 200:
            feed = feedparser.parse(response.content)
            if feed and feed.entries:
                return feed, "online"
            else:
                logger.warning(f"Feed parsed but no entries found: {url}")
                return None, "unavailable"
        elif response.status_code in [403, 503]:
            logger.warning(f"Feed blocked (HTTP {response.status_code}): {url}")
            return None, "blocked"
        else:
            logger.warning(f"Feed error (HTTP {response.status_code}): {url}")
            return None, "unavailable"
    except requests.exceptions.Timeout:
        logger.error(f"Feed timeout: {url}")
        return None, "unavailable"
    except Exception as e:
        logger.error(f"Failed to fetch feed for {url}: {e}")
        return None, "unavailable"


def parse_published_date(entry) -> datetime:
    """
    Parses the published or updated date from a feed entry.
    Returns a timezone-naive datetime object. Defaults to datetime.utcnow() on failure.
    """
    struct_time = entry.get('published_parsed') or entry.get('updated_parsed')
    if struct_time:
        try:
            return datetime(*struct_time[:6])
        except Exception:
            pass

    for key in ['published', 'updated', 'created']:
        val = entry.get(key)
        if val:
            try:
                dt = email.utils.parsedate_to_datetime(val)
                if dt:
                    return dt.replace(tzinfo=None)
            except Exception:
                pass
    
    return datetime.utcnow()


# =========================
# GENERIC FETCH FUNCTION & SCRAPING FALLBACKS
# =========================

GOOGLE_NEWS_BACKUPS = {
    3: "https://news.google.com/rss/search?q=site:business-standard.com+finance&hl=en-IN&gl=IN&ceid=IN:en",
    5: "https://news.google.com/rss/search?q=site:cafemutual.com&hl=en-IN&gl=IN&ceid=IN:en",
    8: "https://news.google.com/rss/search?q=site:sebi.gov.in&hl=en-IN&gl=IN&ceid=IN:en",
    9: "https://news.google.com/rss/search?q=site:rbi.org.in&hl=en-IN&gl=IN&ceid=IN:en",
    10: "https://news.google.com/rss/search?q=site:irdai.gov.in&hl=en-IN&gl=IN&ceid=IN:en",
    11: "https://news.google.com/rss/search?q=site:amfiindia.com&hl=en-IN&gl=IN&ceid=IN:en",
}

FALLBACK_SCRAPER_CONFIGS = {
    8: { # SEBI
        "url": "https://www.sebi.gov.in/media/press-releases",
        "patterns": ["/media/press-releases/"]
    },
    9: { # RBI
        "url": "https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx",
        "patterns": ["pressreleases"]
    },
    10: { # IRDAI
        "url": "https://www.irdai.gov.in/press-releases",
        "patterns": ["/press-releases/", "/circulars/", "/circular-details/"]
    },
    11: { # AMFI
        "url": "https://www.amfiindia.com/press-releases",
        "patterns": ["/press-releases", "/circulars"]
    }
}

def scrape_fallback_page(url: str, source_id: int, url_patterns: list, min_title_len: int = 25) -> list:
    """
    Scrapes official web pages for circulars/press releases if RSS is unavailable.
    """
    logger.info(f"Fallback web scraping triggered for source {source_id} on {url}")
    try:
        from bs4 import BeautifulSoup
        from urllib.parse import urljoin
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://www.google.com/',
        }
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code != 200:
            logger.warning(f"Fallback scraper received HTTP {response.status_code} for {url}")
            return []
            
        soup = BeautifulSoup(response.content, 'html.parser')
        articles = []
        seen_urls = set()
        
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href'].strip()
            title = a_tag.get_text().strip()
            
            title = re.sub(r'\s+', ' ', title)
            if len(title) < min_title_len:
                continue
                
            lower_title = title.lower()
            ignore_keywords = [
                'home', 'contact', 'about us', 'sitemap', 'disclaimer', 'terms', 'privacy policy',
                'read more', 'click here', 'download', 'back', 'next', 'previous', 'terms & conditions',
                'subscribe', 'cookie policy'
            ]
            if any(k in lower_title for k in ignore_keywords) or len(lower_title.split()) < 4:
                continue
                
            absolute_url = urljoin(url, href)
            if not absolute_url.startswith('http'):
                continue
                
            match = False
            if not url_patterns:
                match = True
            else:
                for pattern in url_patterns:
                    if pattern in absolute_url or pattern in href:
                        match = True
                        break
                        
            if match and absolute_url not in seen_urls:
                seen_urls.add(absolute_url)
                articles.append({
                    "title": title,
                    "url": absolute_url,
                    "source_id": source_id,
                    "published_date": datetime.utcnow()
                })
                
        logger.info(f"Fallback scraper successfully extracted {len(articles)} headlines for source {source_id}")
        return articles
    except Exception as e:
        logger.error(f"Fallback scraper failed for source {source_id}: {e}")
        return []

def fetch_source_articles(rss_url: str, source_id: int, limit: int = 15):
    """
    Ingests source articles using RSS parsing first. If RSS is offline or unconfigured,
    falls back to a web scraper targeting official notification/press release pages.
    As a final bulletproof fallback, triggers Google News search feeds for the domain.
    """
    articles = []
    status = "no_rss_feed"

    if rss_url:
        feed, status = parse_feed_with_ua(rss_url)
        if feed and feed.entries:
            for entry in feed.entries[:limit]:
                articles.append({
                    "title": entry.title,
                    "url": entry.link,
                    "source_id": source_id,
                    "published_date": parse_published_date(entry)
                })

    # 1st Fallback: BeautifulSoup Web Scraper
    if status != "online" and source_id in FALLBACK_SCRAPER_CONFIGS:
        config = FALLBACK_SCRAPER_CONFIGS[source_id]
        logger.info(f"RSS failed (status: {status}). Invoking BS4 scraper fallback for source {source_id}.")
        scraped = scrape_fallback_page(config["url"], source_id, config["patterns"])
        if scraped:
            articles = scraped[:limit]
            status = "online"

    # 2nd Fallback: Google News Domain Search RSS (Bulletproof Backup)
    if status != "online" and source_id in GOOGLE_NEWS_BACKUPS:
        backup_url = GOOGLE_NEWS_BACKUPS[source_id]
        logger.info(f"BS4 Scraper failed. Invoking Google News proxy fallback for source {source_id} on {backup_url}.")
        feed, status_backup = parse_feed_with_ua(backup_url)
        if feed and feed.entries:
            for entry in feed.entries[:limit]:
                clean_title = entry.title
                source_suffix_match = re.search(r'\s+-\s+[^(-]+$', entry.title)
                if source_suffix_match:
                    clean_title = entry.title[:source_suffix_match.start()]
                
                articles.append({
                    "title": clean_title,
                    "url": entry.link,
                    "source_id": source_id,
                    "published_date": parse_published_date(entry)
                })
            status = "online"

    return articles, status


# =========================
# SOURCE REGISTRY
# =========================

SOURCE_FEEDS = {
    1:  {"name": "Mint",              "rss_url": "https://www.livemint.com/rss/money"},
    2:  {"name": "Economic Times",    "rss_url": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms"},
    3:  {"name": "Business Standard", "rss_url": "https://news.google.com/rss/search?q=site:business-standard.com+finance&hl=en-IN&gl=IN&ceid=IN:en"},
    4:  {"name": "Moneycontrol",      "rss_url": "https://www.moneycontrol.com/rss/latestnews.xml"},
    5:  {"name": "Cafemutual",        "rss_url": "https://news.google.com/rss/search?q=site:cafemutual.com&hl=en-IN&gl=IN&ceid=IN:en"},
    6:  {"name": "Value Research",    "rss_url": "https://www.valueresearchonline.com/rss/"},
    7:  {"name": "Freefincal",        "rss_url": "https://freefincal.com/feed/"},
    8:  {"name": "SEBI",              "rss_url": "https://www.sebi.gov.in/sebiweb/xml/RssAction.do?boardId=1"},
    9:  {"name": "RBI",               "rss_url": "https://www.rbi.org.in/pressreleases_rss.xml"},
    10: {"name": "IRDAI",             "rss_url": "https://irdai.gov.in/rss-feed"},
    11: {"name": "AMFI",              "rss_url": None},
}


# =========================
# CATEGORY MAPPING & DETECTION
# =========================

def detect_category(title: str, source_id: int = None) -> int:
    """
    Classifies a news headline into Wealth Creation (1), Wealth Protection (2),
    or Wealth Legacy (3) using refined keyword matching and source defaults.
    """
    if source_id in [8, 11]:  # SEBI, AMFI -> Wealth Creation
        return 1
    if source_id == 10:       # IRDAI -> Wealth Protection
        return 2
    if source_id == 9:        # RBI -> Wealth Creation
        return 1

    t = title.lower()

    # Category 3: Wealth Legacy
    wealth_legacy_keywords = [
        r"wills?", r"estate\s+planning", r"inheritance",
        r"nomination", r"succession", r"legacy"
    ]
    for pattern in wealth_legacy_keywords:
        if re.search(pattern, t):
            return 3

    # Category 2: Wealth Protection
    wealth_protection_keywords = [
        "insurance", "life insurance", "general insurance", "term plan",
        "health insurance", "irdai"
    ]
    for keyword in wealth_protection_keywords:
        if keyword in t:
            return 2

    # Category 1: Wealth Creation
    wealth_creation_keywords = [
        "equity", "stock", "share", "mutual fund", "sip", "bond",
        "amfi", "nfo", "investment"
    ]
    for keyword in wealth_creation_keywords:
        if keyword in t:
            return 1

    return 1  # Default fallback


# =========================
# SAVE FUNCTION
# =========================

def save_articles(db: Session, articles: list) -> tuple:
    saved = 0
    skipped = 0

    for item in articles:
        existing = db.query(Article).filter(Article.url == item["url"]).first()
        if existing:
            skipped += 1
            continue

        category_id = detect_category(item["title"], item["source_id"])

        article = Article(
            title=item["title"],
            url=item["url"],
            source_id=item["source_id"],
            category_id=category_id,
            published_date=item.get("published_date")
        )

        db.add(article)
        saved += 1

    db.commit()
    return saved, skipped


# =========================
# MASTER FUNCTION
# =========================

def fetch_all_news(db: Session) -> dict:
    logger.info("Executing comprehensive news fetch from all 11 sources...")

    source_results = {}
    all_articles = []
    failed_sources = 0
    online_sources = 0

    for source_id, source_info in SOURCE_FEEDS.items():
        name = source_info["name"]
        rss_url = source_info["rss_url"]
        
        logger.info(f"Fetching: {name} ({rss_url or 'NO RSS'})")
        articles, status = fetch_source_articles(rss_url, source_id)
        
        source_results[name] = {
            "count": len(articles),
            "status": status
        }
        
        if status == "online":
            online_sources += 1
        else:
            failed_sources += 1
            logger.warning(f"Source '{name}' status: {status} (0 articles fetched)")
        
        all_articles.extend(articles)

        # Update source health in database
        db_source = db.query(Source).filter(Source.id == source_id).first()
        if db_source:
            db_source.last_fetch_status = status
            db_source.last_fetched_at = datetime.utcnow()
    
    db.commit()

    saved, skipped = save_articles(db, all_articles)

    return {
        "source_results": source_results,
        "total_fetched": len(all_articles),
        "saved": saved,
        "skipped": skipped,
        "online_sources": online_sources,
        "failed_sources": failed_sources
    }
