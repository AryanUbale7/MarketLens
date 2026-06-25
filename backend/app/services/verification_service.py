import time
import re
import os
import threading
from datetime import datetime, timedelta
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
from difflib import SequenceMatcher
from sqlalchemy.orm import Session

from app.database.database import SessionLocal
from app.models.article import Article
from app.models.source import Source

# Expected root domains for source matching
EXPECTED_DOMAINS = {
    1: "livemint.com",
    2: "economictimes.indiatimes.com",
    3: "business-standard.com",
    4: "moneycontrol.com",
    5: "cafemutual.com",
    6: "valueresearchonline.com",
    7: "freefincal.com",
    8: "sebi.gov.in",
    9: "rbi.org.in",
    10: "irdai.gov.in",
    11: "amfiindia.com",
}

# Global verification progress cache
verification_progress = {
    "is_running": False,
    "current_index": 0,
    "total_to_check": 0,
    "current_article_title": "",
    "verified_count": 0,
    "warning_count": 0,
    "failed_count": 0,
    "start_time": None,
    "end_time": None,
    "average_response_time_ms": 0.0,
    "total_response_time_ms": 0.0,
    "last_successful_run": None
}

def clean_title(title: str) -> str:
    """Helper to clean common news site suffixes for fair similarity matching."""
    t = title.lower()
    suffixes = [
        " - livemint", " - the economic times", " - economic times", 
        " - business standard", "moneycontrol", "valueresearch", 
        "freefincal", "sebi", "rbi", "irdai", "amfi", 
        " | livemint", " | economic times", " | business standard"
    ]
    for suffix in suffixes:
        if suffix in t:
            t = t.split(suffix)[0]
    
    # Strip any ending pipes or hyphens
    t = re.sub(r'\s*[\-|\|]\s*$', '', t)
    # Strip non-alphanumeric chars for similarity safety
    t = "".join(c for c in t if c.isalnum() or c.isspace())
    return t.strip()

def calculate_similarity(title_a: str, title_b: str) -> float:
    """Returns sequence similarity percentage [0-100]."""
    clean_a = clean_title(title_a)
    clean_b = clean_title(title_b)
    if not clean_a or not clean_b:
        return 0.0
    return SequenceMatcher(None, clean_a, clean_b).ratio() * 100

def verify_single_article(article_id: int, db: Session) -> dict:
    """
    Core verification engine logic for an individual article record.
    Returns audit details for logging and saving.
    """
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        return {"status": "Failed", "errors": ["Article record not found in database"]}

    errors = []
    status = "Verified"
    http_status = None
    resolved_domain = None
    similarity = None
    start_time = time.time()
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
    }

    try:
        # 1. Execute request following redirects
        response = requests.get(article.url, headers=headers, timeout=6, allow_redirects=True)
        http_status = response.status_code
        latency_ms = (time.time() - start_time) * 1000
        
        # 2. Extract domain
        final_url = response.url
        parsed = urlparse(final_url)
        resolved_domain = parsed.netloc.lower()

        # Check expected domain match
        expected = EXPECTED_DOMAINS.get(article.source_id)
        if expected:
            # Match domain endings (e.g. moneycontrol.com matches www.moneycontrol.com)
            if expected not in resolved_domain:
                status = "Failed"
                errors.append("Wrong Domain")
        
        # 3. Handle status codes
        if response.status_code == 404:
            status = "Failed"
            errors.append("404")
        elif response.status_code == 403:
            status = "Warning"
            errors.append("403")
        elif response.status_code >= 500:
            status = "Failed"
            errors.append("500")
        elif response.status_code != 200:
            status = "Failed"
            errors.append(f"HTTP Status {response.status_code}")

        # 4. Check for soft 404s
        soup = BeautifulSoup(response.content, "html.parser")
        page_title = ""
        if soup.title and soup.title.string:
            page_title = soup.title.string.strip()
        
        if "404" in page_title or "page not found" in page_title.lower() or "error" in page_title.lower():
            status = "Failed"
            errors.append("404")

        # 5. Extract body content and validate length
        for element in soup(["script", "style", "header", "footer", "nav"]):
            element.decompose()
        body_text = soup.get_text()
        body_text = " ".join(body_text.split())
        
        if len(body_text) < 500:
            # Let's check if the status wasn't already failed
            if status != "Failed":
                status = "Warning"
            errors.append("Empty Content")

        # 6. Calculate Title Similarity
        if page_title:
            similarity = calculate_similarity(article.title, page_title)
            if similarity < 80.0:
                if status == "Verified":
                    status = "Warning"
                errors.append("Title Mismatch")
        else:
            similarity = 0.0
            status = "Warning"
            errors.append("Empty Title")

        # 7. Check for duplicate final url
        duplicate = db.query(Article).filter(Article.url == final_url, Article.id != article.id).first()
        if duplicate:
            if status == "Verified":
                status = "Warning"
            errors.append("Duplicate Article")

    except requests.exceptions.Timeout:
        status = "Failed"
        errors.append("Timeout")
        latency_ms = 6000.0
    except requests.exceptions.SSLError:
        status = "Failed"
        errors.append("SSL Error")
        latency_ms = 0.0
    except requests.exceptions.TooManyRedirects:
        status = "Failed"
        errors.append("Redirect Loop")
        latency_ms = 0.0
    except Exception as e:
        status = "Failed"
        errors.append("Broken URL")
        latency_ms = 0.0

    # 8. Check for publication date
    if not article.published_date:
        if status == "Verified":
            status = "Warning"
        errors.append("Missing PubDate")

    # Update database model fields
    article.verified = True
    article.verified_at = datetime.utcnow()
    article.verification_status = status
    article.http_status = http_status
    article.resolved_domain = resolved_domain
    article.title_similarity = similarity
    article.verification_errors = ", ".join(errors) if errors else None
    
    db.commit()

    return {
        "status": status,
        "http_status": http_status,
        "resolved_domain": resolved_domain,
        "title_similarity": similarity,
        "latency_ms": latency_ms,
        "errors": errors
    }

def run_batch_verification_task(article_ids: list):
    """Background task runner to check a list of article IDs and update progress cache."""
    global verification_progress
    
    db = SessionLocal()
    try:
        verification_progress["is_running"] = True
        verification_progress["current_index"] = 0
        verification_progress["total_to_check"] = len(article_ids)
        verification_progress["verified_count"] = 0
        verification_progress["warning_count"] = 0
        verification_progress["failed_count"] = 0
        verification_progress["total_response_time_ms"] = 0.0
        verification_progress["average_response_time_ms"] = 0.0
        verification_progress["start_time"] = datetime.utcnow().isoformat()
        verification_progress["end_time"] = None
        
        for idx, art_id in enumerate(article_ids):
            # Fetch article title for progress bar
            art = db.query(Article).filter(Article.id == art_id).first()
            if not art:
                continue
                
            verification_progress["current_index"] = idx + 1
            verification_progress["current_article_title"] = art.title
            
            res = verify_single_article(art_id, db)
            
            # Update counters
            if res["status"] == "Verified":
                verification_progress["verified_count"] += 1
            elif res["status"] == "Warning":
                verification_progress["warning_count"] += 1
            elif res["status"] == "Failed":
                verification_progress["failed_count"] += 1
                
            # Log response time
            latency = res.get("latency_ms", 0.0)
            verification_progress["total_response_time_ms"] += latency
            
            # Simple rate limiting delay to avoid triggering server blocks
            time.sleep(0.3)

        total_checked = verification_progress["verified_count"] + verification_progress["warning_count"] + verification_progress["failed_count"]
        if total_checked > 0:
            verification_progress["average_response_time_ms"] = verification_progress["total_response_time_ms"] / total_checked
            
        verification_progress["end_time"] = datetime.utcnow().isoformat()
        verification_progress["last_successful_run"] = datetime.utcnow().isoformat()
        
    except Exception as e:
        print("Error during batch verification task:", e)
    finally:
        verification_progress["is_running"] = False
        db.close()

def auto_verify_cron():
    """Background scheduler thread routine that verifies new articles every 6 hours."""
    print("Starting news auto-verification background scheduler loop...")
    while True:
        try:
            # Sleep 6 hours
            time.sleep(21600)
            
            db = SessionLocal()
            try:
                # Find all unverified articles
                unverified = db.query(Article.id).filter(Article.verified == False).order_by(Article.created_at.desc()).all()
                unverified_ids = [row[0] for row in unverified]
                
                if unverified_ids:
                    print(f"Auto-scheduler: Queuing verification for {len(unverified_ids)} unverified articles...")
                    # Run synchronously inside this background thread
                    run_batch_verification_task(unverified_ids)
            finally:
                db.close()
        except Exception as e:
            print("Error in auto-verify scheduler loop:", e)

def start_auto_scheduler():
    """Launches the auto verification daemon thread."""
    t = threading.Thread(target=auto_verify_cron, daemon=True)
    t.start()
