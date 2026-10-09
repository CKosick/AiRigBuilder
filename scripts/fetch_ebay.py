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
    "for parts", "parts only", "for repair", "read description",
    "as is", "as-is", "broken", "water damage", "damaged",
    "board only", "cooler only", "box only", "heatsink only", "shroud only",
    "gaming pc", "gaming desktop", "custom pc", "desktop pc"
]

def extract_listings_from_html(html, target, is_sold=False):
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
            
        title_lower = title.lower()
        if any(term in title_lower for term in GLOBAL_EXCLUDE_TERMS):
            continue
        if any(kw.lower() in title_lower for kw in target["excludeKeywords"]):
            continue
            
        price = parse_price(price_raw)
        if price and target["minSensiblePrice"] <= price <= target["maxSensiblePrice"]:
            sample = {"title": title, "price": price}
            
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
            cat_path = f"{target['category']}/" if target["category"] else ""
            valid_listings = []
            source_type = "NO_DATA"
            error = None

            # Step A: real sold listings (needs a signed-in session)
            sold_url = f"https://www.ebay.com/sch/{cat_path}i.html?_nkw={target['query']}&LH_Sold=1&LH_Complete=1&_sop=13"
            try:
                driver.uc_open_with_reconnect(sold_url, reconnect_time=3)
                time.sleep(1)
                cur_url = driver.current_url.lower()
                title = driver.title.lower()
                if "signin.ebay.com" not in cur_url and "sign in" not in title and "security measure" not in title:
                    valid_listings = extract_listings_from_html(driver.page_source, target, is_sold=True)
                    if len(valid_listings) >= 3:
                        source_type = "REAL_EBAY_SOLD"
                        print(f"  ✓ Found {len(valid_listings)} sold listings")
                    else:
                        print(f"  ℹ️ Found {len(valid_listings)} sold listings (need >= 3).")
                else:
                    error = "sold search redirected to sign-in"
                    print("  ⚠️ eBay redirected the sold search to sign-in. A signed-in session is required.")
            except Exception as e:
                error = f"sold search error: {e}"
                print(f"  ⚠️ Sold retrieval error: {e}")

            # Step B: otherwise, active Buy-It-Now listings
            if len(valid_listings) < 3:
                bin_url = f"https://www.ebay.com/sch/{cat_path}i.html?_nkw={target['query']}&LH_BIN=1&_sop=15"
                try:
                    driver.uc_open_with_reconnect(bin_url, reconnect_time=3)
                    time.sleep(1)
                    valid_listings = extract_listings_from_html(driver.page_source, target, is_sold=False)
                    source_type = "REAL_EBAY_ACTIVE_COMPS"
                    print(f"  ✓ Found {len(valid_listings)} active listings")
                except Exception as e:
                    error = f"active search error: {e}"
                    print(f"  ⚠️ Live search error: {e}")

            # Prices, the minimum-listings rule and the review files are worked out in
            # scripts/price_review.js; this engine only reports what it found
            results.append({"id": target["id"], "source": source_type, "listings": valid_listings, "error": error})

    finally:
        driver.quit()
        print("\nUndetected Chrome Driver shutdown successfully.")

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\n✓ Listings written to {out_path}")


if __name__ == "__main__":
    main()
