import time
import re
import os
import threading
import html
import json
from datetime import datetime, timedelta
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
from difflib import SequenceMatcher
from sqlalchemy.orm import Session
from googlenewsdecoder import gnewsdecoder

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

def normalize_title(title: str) -> str:
    """
    Normalizes a title string before comparison:
    - Decodes HTML entities
    - Converts to lowercase
    - Removes suffixes like "- Economic Times" or "| Livemint"
    - Removes prefixes like "Press Release:" or Hindi prefixes
    - Strips punctuation, emojis, and extra spaces
    """
    if not title:
        return ""
    
    # 1. Decode HTML entities
    t = html.unescape(title)
    
    # 2. Convert to lowercase
    t = t.lower()
    
    # 3. Strip non-ASCII/Hindi mixed prefixes followed by colon/hyphen/separator
    t = re.sub(r'^[^\x00-\x7F]+\s*[:|-]\s*', '', t)
    
    # 4. Strip English prefixes like "Press Release:", "Breaking:", etc.
    t = re.sub(r'^(press\s+release|news|update|breaking|live|exclusive|watch|video|photos)\s*:\s*', '', t)
    
    # 5. Strip common news suffixes
    suffixes = [
        "economic times", "livemint", "business standard", "moneycontrol", 
        "valueresearch", "freefincal", "sebi", "rbi", "irdai", "amfi", "mint",
        "value research", "the economic times", "valueresearchonline", "amfi india"
    ]
    for suffix in suffixes:
        # Match separator + suffix at end
        pattern = r'\s*[-\|/:\\]\s*' + re.escape(suffix) + r'\s*$'
        t = re.sub(pattern, '', t)
        # Match suffix at end word boundary
        pattern2 = r'\b' + re.escape(suffix) + r'\s*$'
        t = re.sub(pattern2, '', t)
        
    # 6. Remove punctuation, emojis, separators
    t = re.sub(r'[^\w\s]', ' ', t)
    
    # 7. Normalize extra spaces
    t = " ".join(t.split())
    
    return t

def calculate_similarity(title_a: str, title_b: str) -> float:
    """Returns sequence similarity percentage [0-100]."""
    norm_a = normalize_title(title_a)
    norm_b = normalize_title(title_b)
    if not norm_a or not norm_b:
        return 0.0
    return SequenceMatcher(None, norm_a, norm_b).ratio() * 100

def extract_metadata_content(soup: BeautifulSoup) -> str:
    """Extracts Open Graph title, Meta description, and JSON-LD text content from the soup."""
    parts = []
    
    # 1. Open Graph Title
    og_title = soup.find("meta", property="og:title") or soup.find("meta", attrs={"name": "og:title"})
    if og_title and og_title.get("content"):
        parts.append(og_title["content"])
        
    # 2. Meta Description / OG Description
    desc = (soup.find("meta", attrs={"name": "description"}) or 
            soup.find("meta", property="og:description") or 
            soup.find("meta", attrs={"name": "og:description"}))
    if desc and desc.get("content"):
        parts.append(desc["content"])
        
    # 3. JSON-LD
    for script in soup.find_all("script", type="application/ld+json"):
        if script.string:
            try:
                data = json.loads(script.string)
                
                def extract_text(obj):
                    if isinstance(obj, str):
                        return [obj]
                    elif isinstance(obj, dict):
                        res = []
                        for k, v in obj.items():
                            if k in ["articleBody", "description", "headline", "name", "text"]:
                                res.extend(extract_text(v))
                        return res
                    elif isinstance(obj, list):
                        res = []
                        for item in obj:
                            res.extend(extract_text(item))
                        return res
                    return []
                
                texts = extract_text(data)
                parts.extend(texts)
            except Exception:
                parts.append(script.string)
                
    # 4. Itemprop descriptions
    for el in soup.find_all(attrs={"itemprop": "description"}):
        if el.get("content"):
            parts.append(el["content"])
        elif el.text:
            parts.append(el.text)
            
    return " ".join(parts).strip()

# Dedicated Validators for regulatory and specific websites
def validate_sebi(soup: BeautifulSoup) -> tuple[str, str]:
    title_el = soup.find(class_="heading") or soup.find("h2") or soup.find("h1")
    title = title_el.get_text().strip() if title_el else ""
    body_el = soup.find(id="paratext") or soup.find(class_="card-body") or soup.find(class_="inner-content")
    body = body_el.get_text().strip() if body_el else ""
    return title, body

def validate_rbi(soup: BeautifulSoup) -> tuple[str, str]:
    title_el = soup.find("td", class_="tableheader") or soup.find(class_="page-title") or soup.find("h1")
    title = title_el.get_text().strip() if title_el else ""
    body_el = soup.find("table", class_="tablebg") or soup.find(id="section_content") or soup.find(class_="table-responsive")
    body = body_el.get_text().strip() if body_el else ""
    return title, body

def validate_irdai(soup: BeautifulSoup) -> tuple[str, str]:
    title_el = soup.find("h1") or soup.find(class_="title")
    title = title_el.get_text().strip() if title_el else ""
    body_el = soup.find(class_="content") or soup.find(id="content") or soup.find(class_="inner-page") or soup.find(class_="main-content")
    body = body_el.get_text().strip() if body_el else ""
    return title, body

def validate_amfi(soup: BeautifulSoup) -> tuple[str, str]:
    title_el = soup.find("h1") or soup.find(class_="title") or soup.find(class_="heading")
    title = title_el.get_text().strip() if title_el else ""
    body_el = soup.find(class_="content") or soup.find(id="content") or soup.find(class_="main-content") or soup.find(class_="inner-content")
    body = body_el.get_text().strip() if body_el else ""
    return title, body

def validate_business_standard(soup: BeautifulSoup) -> tuple[str, str]:
    title_el = soup.find("h1") or soup.find(class_="story-title")
    title = title_el.get_text().strip() if title_el else ""
    body_el = soup.find(class_="p-content") or soup.find(class_="story-content") or soup.find(class_="story-text") or soup.find(id="story-content")
    body = body_el.get_text().strip() if body_el else ""
    return title, body

def get_best_title_similarity(article_title: str, soup: BeautifulSoup) -> tuple[str, float]:
    """
    Extracts all candidate titles from various tags and metadata fields,
    calculates their normalized similarity against the article title,
    and returns the best candidate title and the highest similarity score.
    """
    candidates = []
    
    # 1. HTML Title
    if soup.title and soup.title.string:
        candidates.append(soup.title.string.strip())
        
    # 2. OpenGraph Title
    og_title = soup.find("meta", property="og:title") or soup.find("meta", attrs={"name": "og:title"})
    if og_title and og_title.get("content"):
        candidates.append(og_title["content"].strip())
        
    # 3. Twitter Title
    tw_title = soup.find("meta", property="twitter:title") or soup.find("meta", attrs={"name": "twitter:title"}) or soup.find("meta", property="twitter:image:alt")
    if tw_title and tw_title.get("content"):
        candidates.append(tw_title["content"].strip())
        
    # 4. JSON-LD Headline / Name
    for script in soup.find_all("script", type="application/ld+json"):
        if script.string:
            try:
                data = json.loads(script.string)
                def extract_titles(obj):
                    res = []
                    if isinstance(obj, str):
                        res.append(obj)
                    elif isinstance(obj, dict):
                        for k, v in obj.items():
                            if k in ["headline", "name", "alternativeHeadline"]:
                                if isinstance(v, str):
                                    res.append(v)
                            elif isinstance(v, (dict, list)):
                                res.extend(extract_titles(v))
                    elif isinstance(obj, list):
                        for item in obj:
                            res.extend(extract_titles(item))
                    return res
                candidates.extend(extract_titles(data))
            except Exception:
                pass
                
    # 5. First H1
    h1 = soup.find("h1")
    if h1:
        candidates.append(h1.get_text().strip())
        
    # 6. First H2
    h2 = soup.find("h2")
    if h2:
        candidates.append(h2.get_text().strip())

    if not candidates:
        return "", 0.0
        
    best_title = ""
    best_similarity = -1.0
    
    for cand in candidates:
        if not cand:
            continue
        sim = calculate_similarity(article_title, cand)
        if sim > best_similarity:
            best_similarity = sim
            best_title = cand
            
    return best_title, max(0.0, best_similarity)

def verify_single_article(article_id: int, db: Session) -> dict:
    """
    Core verification engine logic for an individual article record.
    Returns audit details for logging and saving.
    """
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        return {"status": "Failed", "errors": ["Article record not found in database"]}

    errors = []
    http_status = None
    resolved_domain = None
    similarity = None
    start_time = time.time()
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
    }

    url_to_verify = article.url
    is_google_news = "news.google.com" in urlparse(article.url).netloc.lower()
    gnews_decoded_ok = False
    
    # 1. Resolve Google News Redirect
    if is_google_news:
        try:
            dec_res = gnewsdecoder(article.url)
            if dec_res.get("status") and dec_res.get("decoded_url"):
                url_to_verify = dec_res["decoded_url"]
                gnews_decoded_ok = True
            else:
                errors.append(f"Google News Decode Failed: {dec_res.get('message', 'Unknown error')}")
        except Exception as e:
            errors.append(f"Google News Decode Exception: {str(e)}")
    else:
        gnews_decoded_ok = True

    # Initialize domain variables
    parsed = urlparse(url_to_verify)
    resolved_domain = parsed.netloc.lower()
    if resolved_domain.startswith("www."):
        resolved_domain = resolved_domain[4:]
        
    expected = EXPECTED_DOMAINS.get(article.source_id)
    domain_correct = False
    if expected and resolved_domain:
        if expected in resolved_domain or resolved_domain in expected:
            domain_correct = True

    has_content = False
    metadata_text = ""
    body_text = ""
    best_extracted_title = ""
    similarity = 0.0
    latency_ms = 0.0

    try:
        # 2. Execute request following redirects
        response = requests.get(url_to_verify, headers=headers, timeout=8, allow_redirects=True)
        http_status = response.status_code
        latency_ms = (time.time() - start_time) * 1000
        
        # Extract domain from redirected URL
        final_url = response.url
        parsed_final = urlparse(final_url)
        resolved_domain = parsed_final.netloc.lower()
        if resolved_domain.startswith("www."):
            resolved_domain = resolved_domain[4:]
            
        if expected and resolved_domain:
            if expected in resolved_domain or resolved_domain in expected:
                domain_correct = True
            else:
                domain_correct = False
                errors.append("Wrong Domain")
        
        # Parse content if page loaded (even on 403 or other codes since some servers block bots but return HTML with meta tags)
        soup = BeautifulSoup(response.content, "html.parser")
        
        # Apply dedicated parser adapters (NO generic parsing for these 5 sources)
        is_regulatory_or_bs = False
        if article.source_id == 8: # SEBI
            is_regulatory_or_bs = True
            page_title, body_text = validate_sebi(soup)
        elif article.source_id == 9: # RBI
            is_regulatory_or_bs = True
            page_title, body_text = validate_rbi(soup)
        elif article.source_id == 10: # IRDAI
            is_regulatory_or_bs = True
            page_title, body_text = validate_irdai(soup)
        elif article.source_id == 11: # AMFI
            is_regulatory_or_bs = True
            page_title, body_text = validate_amfi(soup)
        elif expected == "business-standard.com" or resolved_domain == "business-standard.com":
            is_regulatory_or_bs = True
            page_title, body_text = validate_business_standard(soup)

        # Fallback to general parsing ONLY for other sources
        if not is_regulatory_or_bs:
            temp_soup = BeautifulSoup(response.content, "html.parser")
            if temp_soup.title and temp_soup.title.string:
                page_title = temp_soup.title.string.strip()
            
            for element in temp_soup(["script", "style", "header", "footer", "nav"]):
                element.decompose()
            body_text = temp_soup.get_text()
            body_text = " ".join(body_text.split())
            
        # Extract metadata fallback content (for all sources)
        metadata_text = extract_metadata_content(soup)
        total_content = body_text + " " + metadata_text
        total_content = " ".join(total_content.split())
        
        has_content = len(total_content) >= 500
        
        # Calculate best title matching similarity
        best_extracted_title, similarity = get_best_title_similarity(article.title, soup)
        
        # Soft 404 check
        if best_extracted_title and ("404" in best_extracted_title or "page not found" in best_extracted_title.lower() or "error" in best_extracted_title.lower()):
            errors.append("404")

        # Check HTTP Status code
        if http_status != 200:
            errors.append(f"HTTP Status {http_status}")
            
        if not has_content:
            errors.append("Empty Content")
            
        if similarity < 80.0:
            errors.append("Title Mismatch")
            
        # Check for duplicate final url
        duplicate = db.query(Article).filter(Article.url == final_url, Article.id != article.id).first()
        if duplicate:
            errors.append("Duplicate Article")

    except requests.exceptions.Timeout:
        errors.append("Timeout")
        latency_ms = 8000.0
    except requests.exceptions.SSLError:
        errors.append("SSL Error")
    except requests.exceptions.TooManyRedirects:
        errors.append("Redirect Loop")
    except Exception as e:
        errors.append("Broken URL")

    # Missing publication date check
    if not article.published_date:
        errors.append("Missing PubDate")

    # Determine status & weights
    http_ok = (http_status == 200)
    metadata_ok = (len(metadata_text) > 50 or has_content or bool(best_extracted_title))
    
    is_failed = False
    if not http_ok and http_status != 403:
        if not domain_correct:
            if not metadata_ok:
                is_failed = True

    # Special rule: Business Standard 403 Metadata check
    is_bs_metadata_pass = False
    if (expected == "business-standard.com" or resolved_domain == "business-standard.com") and http_status == 403:
        if gnews_decoded_ok and domain_correct and metadata_ok:
            is_bs_metadata_pass = True

    # 4. Calculate status category
    if is_failed:
        status = "Failed"
    elif is_bs_metadata_pass:
        status = "Verified via Publisher Metadata"
    elif http_status == 200 and domain_correct and has_content and similarity >= 80.0:
        status = "Verified"
    elif http_status == 200 and domain_correct and has_content and similarity < 80.0:
        status = "Verified with Minor Differences"
    elif domain_correct and metadata_ok:
        status = "Verified via Metadata"
    else:
        status = "Needs Review"

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
            art = db.query(Article).filter(Article.id == art_id).first()
            if not art:
                continue
                
            verification_progress["current_index"] = idx + 1
            verification_progress["current_article_title"] = art.title
            
            res = verify_single_article(art_id, db)
            
            # Update counters
            if res["status"] in ["Verified", "Verified with Minor Differences", "Verified via Publisher Metadata", "Verified via Metadata"]:
                verification_progress["verified_count"] += 1
            elif res["status"] in ["Needs Review", "Warning"]:
                verification_progress["warning_count"] += 1
            elif res["status"] == "Failed":
                verification_progress["failed_count"] += 1
                
            latency = res.get("latency_ms", 0.0)
            verification_progress["total_response_time_ms"] += latency
            
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
