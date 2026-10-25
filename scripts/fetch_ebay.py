# scripts/fetch_ebay.py
# Local eBay listing fetcher for the weekly price review (run via npm run prices:scrape)
# Uses SeleniumBase Undetected-Chromedriver with a persistent profile; outputs listings only
import json
import os
import re
import sys
import time

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
from bs4 import BeautifulSoup
from seleniumbase import Driver

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CACHE_DIR = os.path.join(ROOT_DIR, ".cache")
PROFILE_DIR = os.path.join(CACHE_DIR, "ebay_chrome_profile")
COOKIE_FILE = os.path.join(CACHE_DIR, "ebay_cookies.json")

# Search targets (with the live current price) come from scrape_ebay_prices.js via PRICE_TARGETS_FILE

def parse_price(text):
    if not text:
        return None
    m = re.search(r"\$([0-9,]+(?:\.[0-9]{2})?)", text)
    if m:
        return float(m.group(1).replace(",", ""))
    return None

GLOBAL_EXCLUDE_TERMS = [
    "not working", "defective", "no post", "failed", "partially works",
    "for parts", "for part", "parts only", "for repair", "part/repair", "parts/repair",
    "read description", "read desc",
    "as is", "as-is", "broken", "water damage", "damaged",
    "non-working", "non working", "non-functional", "non functional",
    "dead", "no video", "does not boot", "overheating", "rust",
    "board only", "cooler only", "box only", "heatsink only", "shroud only",
    "nvlink", "bridge",
    "gaming pc", "gaming desktop", "custom pc", "desktop pc",
    "lot of"
]

GLOBAL_EXCLUDE_WORDS = {"dead", "rust"}


def matches_exclude_term(title, term):
    if term in GLOBAL_EXCLUDE_WORDS:
        return bool(re.search(rf"\b{re.escape(term)}\b", title, re.IGNORECASE))
    return term in title

ITEM_ID_RE = re.compile(r"/itm/(?:[^/?]*/)?(\d{9,})")
FEWER_WORDS_RE = re.compile(r"matching fewer words", re.IGNORECASE)


def extract_listings_from_html(html, target, is_sold=False, raw=None):
    """Returns the listings that pass the basic filters (as before). If a list is passed as raw,
    every parsed listing is appended to it unfiltered, with its eBay item ID and whether it sits
    below eBay's "Results matching fewer words" divider (padding, not an exact match)."""
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select(".s-card, .s-item")
    valid = []

    for c in cards:
        title_el = c.select_one(".s-card__title, [role='heading'], .s-item__title")
        price_el = c.select_one(".s-card__price, .s-item__price")
        title = title_el.get_text(strip=True) if title_el else ""
        price_raw = price_el.get_text(strip=True) if price_el else ""
        full_text = c.get_text(" | ", strip=True)
        
        # Fallback to full card text if structured classes differ
        if not title or not price_raw:
            m = re.search(r"\$([0-9,]+(?:\.[0-9]{2})?)", full_text)
            if m:
                price_raw = m.group(0)
            parts = [p.strip() for p in full_text.split(" | ") if len(p.strip()) > 5]
            if parts:
                title = parts[0]
                
        if not title or "shop on ebay" in title.lower() or not price_raw:
            continue

        link = c.select_one("a[href*='/itm/']")
        m_id = ITEM_ID_RE.search(link.get("href", "")) if link else None
        item_id = m_id.group(1) if m_id else None
        fewer_words = c.find_previous(string=FEWER_WORDS_RE) is not None
        if raw is not None:
            raw.append({"title": title, "price": parse_price(price_raw), "itemId": item_id, "fewerWords": fewer_words})

        title_lower = re.sub(r"opens in a new window.*", "", title, flags=re.IGNORECASE).strip().lower()
        if any(matches_exclude_term(title_lower, term) for term in GLOBAL_EXCLUDE_TERMS):
            continue
        if any(kw.lower() in title_lower for kw in target["excludeKeywords"]):
            continue
            
        price = parse_price(price_raw)
        if price and target["minSensiblePrice"] <= price <= target["maxSensiblePrice"]:
            sample = {"title": title, "price": price}
            if item_id:
                sample["itemId"] = item_id
            
            # Extract sold date if available
            sold_date = ""
            date_el = c.select_one(".s-item__ended-date, .s-item__endedDate, .POSITIVE")
            if date_el:
                sold_date = date_el.get_text(strip=True)
            else:
                m_date = re.search(r"(?:Sold|Ended)\s+([A-Za-z]{3}\s+\d{1,2}(?:,\s*\d{4})?)", full_text, re.IGNORECASE)
                if m_date:
                    sold_date = m_date.group(0)
            if sold_date:
                sample["soldDate"] = sold_date
                
            valid.append(sample)
            
    return valid

def search_url(target, query, sold, page=1):
    """Search URL for one results page. pageSize / page are only added for targets that set them,
    so every other target keeps its exact original URL."""
    cat_path = f"{target['category']}/" if target["category"] else ""
    if sold:
        url = f"https://www.ebay.com/sch/{cat_path}i.html?_nkw={query}&LH_Sold=1&LH_Complete=1&_sop=13"
    else:
        url = f"https://www.ebay.com/sch/{cat_path}i.html?_nkw={query}&LH_BIN=1&_sop=15"
    if target.get("pageSize"):
        url += f"&_ipg={target['pageSize']}"
    if page > 1:
        url += f"&_pgn={page}"
    return url


def search_plan(target):
    """(query, page) pairs to fetch: every query variant (default: the one query) times its pages."""
    queries = target.get("queries") or [target["query"]]
    pages = int(target.get("pages") or 1)
    return [(q, p) for q in queries for p in range(1, pages + 1)]


def dedupe(listings):
    """One entry per eBay item across query variants and pages. Only the item ID is trusted: two
    real sales can share a title and price, so a listing without an ID is always kept."""
    seen = set()
    out = []
    for l in listings:
        key = l.get("itemId")
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        out.append(l)
    return out


def fetch_listings(driver, target, sold):
    """Fetches every page of the target's search plan. Returns (valid, raw, error)."""
    valid, raw, error = [], [], None
    for query, page in search_plan(target):
        url = search_url(target, query, sold, page)
        driver.uc_open_with_reconnect(url, reconnect_time=3)
        time.sleep(1)
        if sold:
            cur_url = driver.current_url.lower()
            title = driver.title.lower()
            if "signin.ebay.com" in cur_url or "sign in" in title or "security measure" in title:
                return valid, raw, "sold search redirected to sign-in"
        valid += extract_listings_from_html(driver.page_source, target, is_sold=sold, raw=raw)
    return dedupe(valid), dedupe(raw), error


def load_targets():
    """Targets (search terms plus the live current price) written by scrape_ebay_prices.js."""
    path = os.environ.get("PRICE_TARGETS_FILE")
    if not path or not os.path.exists(path):
        print("❌ PRICE_TARGETS_FILE is not set. Run this through: npm run prices:scrape")
        sys.exit(2)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    print("====================================================")
    print("🤖 AI RIG BUILDER — HEADLESS CHROME LISTING FETCHER")
    print("====================================================")

    targets = load_targets()
    out_path = os.environ.get("PRICE_LISTINGS_FILE") or os.path.join(CACHE_DIR, "price_listings.json")
    os.makedirs(CACHE_DIR, exist_ok=True)

    has_profile = os.path.exists(PROFILE_DIR) and len(os.listdir(PROFILE_DIR)) > 0
    has_cookies = os.path.exists(COOKIE_FILE)

    if has_profile:
        print(f"🔑 Using persistent authenticated Chrome profile: {PROFILE_DIR}")
    elif has_cookies:
        print(f"🔑 Found saved eBay session cookies in: {COOKIE_FILE}")
    else:
        print("ℹ️ No saved eBay session found. Attempting live search.")

    print("\nInitializing Undetected Chrome Driver (headless)...")
    driver_kwargs = {"uc": True, "headless": True}
    if has_profile:
        driver_kwargs["user_data_dir"] = PROFILE_DIR

    driver = Driver(**driver_kwargs)
    results = []

    try:
        # If no persistent profile but cookies exist, inject them
        if not has_profile and has_cookies:
            try:
                driver.uc_open_with_reconnect("https://www.ebay.com", reconnect_time=2)
                with open(COOKIE_FILE, "r", encoding="utf-8") as f:
                    cookies = json.load(f)
                    for c in cookies:
                        try:
                            cd = {
                                "name": c["name"],
                                "value": c["value"],
                                "path": c.get("path", "/")
                            }
                            if "domain" in c:
                                cd["domain"] = c["domain"]
                            if "expiry" in c:
                                cd["expiry"] = int(c["expiry"])
                            driver.add_cookie(cd)
                        except Exception:
                            pass
                print("✓ Successfully injected eBay session cookies.")
            except Exception as e:
                print(f"⚠️ Could not inject cookies ({e}). Continuing with live search.")

        for idx, target in enumerate(targets, 1):
            print(f"\n[{idx}/{len(targets)}] Fetching: {target['name']}...")
            valid_listings = []
            raw_listings = []
            source_type = "NO_DATA"
            error = None

            # Step A: real sold listings (needs a signed-in session)
            try:
                valid_listings, raw_listings, error = fetch_listings(driver, target, sold=True)
                if error:
                    print("  ⚠️ eBay redirected the sold search to sign-in. A signed-in session is required.")
                elif len(valid_listings) >= 3:
                    source_type = "REAL_EBAY_SOLD"
                    print(f"  ✓ Found {len(valid_listings)} sold listings")
                else:
                    print(f"  ℹ️ Found {len(valid_listings)} sold listings (need >= 3).")
            except Exception as e:
                error = f"sold search error: {e}"
                print(f"  ⚠️ Sold retrieval error: {e}")

            # Step B: otherwise, active Buy-It-Now listings (skipped in sold-only runs, e.g. the
            # search experiment, which measures sold results)
            if len(valid_listings) < 3 and os.environ.get("PRICE_SOLD_ONLY") != "1":
                try:
                    valid_listings, raw_listings, _ = fetch_listings(driver, target, sold=False)
                    source_type = "REAL_EBAY_ACTIVE_COMPS"
                    print(f"  ✓ Found {len(valid_listings)} active listings")
                except Exception as e:
                    error = f"active search error: {e}"
                    print(f"  ⚠️ Live search error: {e}")

            # Prices, the minimum-listings rule and the review files are worked out in
            # scripts/price_review.js; this engine only reports what it found. rawListings is
            # everything parsed, unfiltered, for audits and the search experiment.
            results.append({"id": target["id"], "source": source_type, "listings": valid_listings, "rawListings": raw_listings, "error": error})

    finally:
        driver.quit()
        print("\nUndetected Chrome Driver shutdown successfully.")

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\n✓ Listings written to {out_path}")


if __name__ == "__main__":
    main()
