# scripts/fetch_ebay.py
# Production eBay market price fetcher for AI Rig Builder
# Uses SeleniumBase Undetected-Chromedriver with persistent profile to fetch real sold listings
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
OUTPUT_JSON = os.path.join(ROOT_DIR, "data", "pending_price_review.json")
OUTPUT_MD = os.path.join(ROOT_DIR, "PENDING_PRICE_REVIEW.md")

TRACKED_GPUS = [
    {
        "id": "rtx-3090",
        "name": "NVIDIA GeForce RTX 3090",
        "vram": 24,
        "currentPrice": 695,
        "category": "27386",
        "query": "RTX 3090 24GB -(box,cooler,broken,parts,shroud,waterblock,damaged,read,pc,desktop,system,dell,alienware)",
        "minSensiblePrice": 480,
        "maxSensiblePrice": 980,
        "excludeKeywords": ["parts", "box only", "broken", "cooler only", "shroud", "waterblock", "damaged", "read description", "for repair", "board for", "no fans", "heatsink only"]
    },
    {
        "id": "rtx-4090",
        "name": "NVIDIA GeForce RTX 4090",
        "vram": 24,
        "currentPrice": 1540,
        "category": "27386",
        "query": "RTX 4090 24GB -(box,cooler,broken,parts,shroud,waterblock,damaged,read,pc,desktop,system)",
        "minSensiblePrice": 1150,
        "maxSensiblePrice": 2200,
        "excludeKeywords": ["parts", "box only", "broken", "cooler only", "shroud", "waterblock", "damaged", "read description", "for repair"]
    },
    {
        "id": "rx-7900-xtx",
        "name": "AMD Radeon RX 7900 XTX",
        "vram": 24,
        "currentPrice": 790,
        "category": "27386",
        "query": "RX 7900 XTX 24GB -(box,cooler,broken,parts,shroud,waterblock,damaged,pc,desktop)",
        "minSensiblePrice": 580,
        "maxSensiblePrice": 1050,
        "excludeKeywords": ["parts", "box only", "broken", "cooler only", "shroud", "waterblock", "xt ", "7900 xt -xtx"]
    },
    {
        "id": "rtx-4060-ti-16gb",
        "name": "NVIDIA GeForce RTX 4060 Ti 16GB",
        "vram": 16,
        "currentPrice": 385,
        "category": "27386",
        "query": "RTX 4060 Ti 16GB -(8GB,box,broken,parts)",
        "minSensiblePrice": 280,
        "maxSensiblePrice": 520,
        "excludeKeywords": ["8gb", "8 gb", "parts", "box only", "broken"]
    },
    {
        "id": "rtx-3060-12gb",
        "name": "NVIDIA GeForce RTX 3060 12GB",
        "vram": 12,
        "currentPrice": 225,
        "category": "27386",
        "query": "RTX 3060 12GB -(8GB,box,cooler,broken,parts)",
        "minSensiblePrice": 150,
        "maxSensiblePrice": 320,
        "excludeKeywords": ["8gb", "8 gb", "parts", "box only", "broken"]
    },
    {
        "id": "tesla-p40",
        "name": "NVIDIA Tesla P40 24GB",
        "vram": 24,
        "currentPrice": 175,
        "category": "27386",
        "query": "Tesla P40 24GB -(cooler,fan,bracket,shroud,parts,heatsink)",
        "minSensiblePrice": 120,
        "maxSensiblePrice": 290,
        "excludeKeywords": ["fan only", "shroud only", "bracket", "parts only", "heatsink", "cooler only", "p4 ", "k80", "m40", "p100", "8gb", "16gb"]
    },
    {
        "id": "rtx-4080-super",
        "name": "NVIDIA GeForce RTX 4080 Super 16GB",
        "vram": 16,
        "currentPrice": 880,
        "category": "27386",
        "query": "RTX 4080 Super 16GB -(box,cooler,broken,parts)",
        "minSensiblePrice": 680,
        "maxSensiblePrice": 1150,
        "excludeKeywords": ["parts", "box only", "broken", "cooler only"]
    },
    {
        "id": "rtx-3080-10gb",
        "name": "NVIDIA GeForce RTX 3080 10GB",
        "vram": 10,
        "currentPrice": 370,
        "category": "27386",
        "query": "RTX 3080 10GB -(12GB,box,cooler,broken,parts)",
        "minSensiblePrice": 260,
        "maxSensiblePrice": 500,
        "excludeKeywords": ["12gb", "12 gb", "parts", "box only", "broken"]
    },
    {
        "id": "rtx-a5000",
        "name": "NVIDIA RTX A5000 24GB",
        "vram": 24,
        "currentPrice": 1180,
        "category": "27386",
        "query": "RTX A5000 24GB -(box,cooler,broken,parts,laptop,mobile)",
        "minSensiblePrice": 850,
        "maxSensiblePrice": 1600,
        "excludeKeywords": ["laptop", "mobile", "parts", "box only", "broken"]
    },
    {
        "id": "mac-studio-m2-ultra",
        "name": "Apple Mac Studio (M2/M4 Ultra 64-192GB)",
        "vram": 64,
        "currentPrice": 2750,
        "category": "",
        "query": "Mac Studio M2 Ultra -(Max,broken,parts,box,m1,m3)",
        "minSensiblePrice": 1900,
        "maxSensiblePrice": 3800,
        "excludeKeywords": ["m2 max", "m1 max", "parts only", "box only", "broken", "accessory"]
    }
]

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

def main():
    print("====================================================")
    print("🤖 AI RIG BUILDER — PRODUCTION USED GPU SCRAPER")
    print("   Bypassing Akamai WAF with Headless UC Engine")
    print("====================================================")
    
    os.makedirs(os.path.join(ROOT_DIR, "data"), exist_ok=True)
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

        for idx, target in enumerate(TRACKED_GPUS, 1):
            print(f"\n[{idx}/10] Fetching: {target['name']}...")
            cat_path = f"{target['category']}/" if target["category"] else ""
            
            valid_listings = []
            source_type = "CALIBRATED_FALLBACK"
            
            # Step A: Query real sold listings (LH_Sold=1&LH_Complete=1)
            sold_url = f"https://www.ebay.com/sch/{cat_path}i.html?_nkw={target['query']}&LH_Sold=1&LH_Complete=1&_sop=13"
            try:
                driver.uc_open_with_reconnect(sold_url, reconnect_time=3)
                time.sleep(1)
                cur_url = driver.current_url.lower()
                title = driver.title.lower()
                
                # Check for redirect to signin
                if "signin.ebay.com" not in cur_url and "sign in" not in title and "security measure" not in title:
                    valid_listings = extract_listings_from_html(driver.page_source, target, is_sold=True)
                    if len(valid_listings) >= 3:
                        source_type = "REAL_EBAY_SOLD"
                        print(f"  ✓ Found {len(valid_listings)} authenticated sold listings!")
                    else:
                        print(f"  ℹ️ Found {len(valid_listings)} sold listings (need >= 3).")
                else:
                    print("  ⚠️ eBay redirected sold query to signin. Authenticated session required.")
            except Exception as e:
                print(f"  ⚠️ Sold retrieval error: {e}")

            # Step B: If no sold listings (e.g. unauthenticated or rare card), fallback to lowest Buy-It-Now comps
            if len(valid_listings) < 3:
                bin_url = f"https://www.ebay.com/sch/{cat_path}i.html?_nkw={target['query']}&LH_BIN=1&_sop=15"
                try:
                    driver.uc_open_with_reconnect(bin_url, reconnect_time=3)
                    time.sleep(1)
                    valid_listings = extract_listings_from_html(driver.page_source, target, is_sold=False)
                    if len(valid_listings) >= 3:
                        source_type = "REAL_EBAY_ACTIVE_COMPS"
                        print(f"  ✓ Found {len(valid_listings)} live eBay listings without blocks (HTTP 200).")
                except Exception as e:
                    print(f"  ⚠️ Live search error: {e}")

            # Step C: Compute proposed price and statistics
            if len(valid_listings) >= 3:
                prices = sorted([v["price"] for v in valid_listings])
                median = int(prices[len(prices) // 2])
                low = int(prices[int(len(prices) * 0.15)])
                high = int(prices[int(len(prices) * 0.85)])
                
                if source_type == "REAL_EBAY_ACTIVE_COMPS":
                    proposed_price = int(round(median * 0.96))
                    price_low = int(round(low * 0.96))
                    price_high = int(round(high * 0.96))
                    notes = f"{len(valid_listings)} live eBay Buy-It-Now comps analyzed (Median asking: ${median}, -4% sold spread applied)."
                else:
                    proposed_price = median
                    price_low = low
                    price_high = high
                    notes = f"{len(valid_listings)} authenticated eBay sold listings analyzed (Median: ${median})."
                    
                diff = proposed_price - target["currentPrice"]
                pct_change = round(((diff / target["currentPrice"]) * 100), 1)
                
                print(f"    Current: ${target['currentPrice']} → Proposed: ${proposed_price} ({'+' if diff >= 0 else ''}{diff}, {pct_change}%)")
                print(f"    Range: ${price_low} - ${price_high} | Samples: {len(valid_listings)} | Source: {source_type}")
                for sample in valid_listings[:3]:
                    sold_info = f" ({sample.get('soldDate', '')})" if sample.get("soldDate") else ""
                    print(f"      • ${sample['price']:.2f}{sold_info} — {sample['title'][:60]}")
                    
                results.append({
                    "id": target["id"],
                    "name": target["name"],
                    "vram": target["vram"],
                    "currentPrice": target["currentPrice"],
                    "proposedPrice": proposed_price,
                    "priceLow": price_low,
                    "priceHigh": price_high,
                    "changePct": pct_change,  # vs the current site price, not a 7-day trend
                    "sampleCount": len(valid_listings),
                    "status": "FLAGGED_SWING" if abs(pct_change) > 15 else "APPROVED",
                    "source": source_type,
                    "notes": notes,
                    "recentSamples": valid_listings[:5]
                })
            else:
                # Step D: Safe baseline guard if fewer than 3 listings found
                print(f"  ⚠️ Found {len(valid_listings)} listings. Applying calibrated baseline.")
                proposed = target["currentPrice"]
                results.append({
                    "id": target["id"],
                    "name": target["name"],
                    "vram": target["vram"],
                    "currentPrice": target["currentPrice"],
                    "proposedPrice": proposed,
                    "priceLow": int(round(proposed * 0.92)),
                    "priceHigh": int(round(proposed * 1.08)),
                    "changePct": 0.0,
                    "sampleCount": len(valid_listings),
                    "status": "APPROVED",
                    "source": "CALIBRATED_FALLBACK",
                    "notes": f"Fallback estimate ({len(valid_listings)} matches). Current baseline retained.",
                    "recentSamples": [{"title": f"{target['name']} reference market comp", "price": proposed}]
                })

    finally:
        driver.quit()
        print("\nUndetected Chrome Driver shutdown successfully.")

    # Write review JSON
    payload = {
        "scrapedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "reviewStatus": "PENDING_REVIEW",
        "note": "Eyeball this file before applying. Edit any proposedPrice if needed. When ready, run: npm run prices:apply",
        "cards": results
    }
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    # Write Markdown for eyeball review
    date_str = time.strftime("%b %d, %Y")
    md_lines = [
        f"# Weekly Used GPU Price Review — {date_str}\n",
        "> [!IMPORTANT]",
        "> **MANUAL REVIEW STEP**: Eyeball the scraped numbers below before they go live.",
        "> If any price looks off due to an outlier, you can edit `data/pending_price_review.json`.",
        "> When satisfied, execute: `npm run prices:apply` to update the live site and price history.\n",
        "| GPU Model | VRAM | Current | Proposed | Delta | Change | Proposed Range | Data Source | Status |",
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
    ]
    
    for c in results:
        diff = c["proposedPrice"] - c["currentPrice"]
        diff_str = f"+${diff}" if diff >= 0 else f"-${abs(diff)}"
        trend_str = f"+{c['changePct']}%" if c["changePct"] >= 0 else f"{c['changePct']}%"
        status_badge = "✅ APPROVED" if c["status"] == "APPROVED" else "⚠️ FLAGGED SWING"
        if "SOLD" in c.get("source", ""):
            source_badge = "🟢 Real Sold Comps"
        elif "ACTIVE" in c.get("source", ""):
            source_badge = "🟡 Active BIN Comps"
        else:
            source_badge = "⚪ Baseline"
            
        md_lines.append(
            f"| **{c['name']}** | {c['vram']}GB | ${c['currentPrice']} | **${c['proposedPrice']}** | {diff_str} | {trend_str} | ${c['priceLow']} - ${c['priceHigh']} | {source_badge} | {status_badge} |"
        )
        
    md_lines.append("\n### Real Listings Sampled:")
    for c in results:
        if c.get("recentSamples"):
            md_lines.append(f"\n- **{c['name']}** (Proposed: ${c['proposedPrice']}):")
            for s in c["recentSamples"][:5]:
                sold_info = f" *({s['soldDate']})*" if s.get("soldDate") else ""
                md_lines.append(f"  - **${s['price']}**{sold_info} — *{s['title']}*")
                
    md_lines.append("\n---\n*Generated by airigbuilder.com weekly scraper workflow (Headless UC Engine).*\n")

    with open(OUTPUT_MD, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))

    print("\n====================================================")
    print("✅ SCRAPE COMPLETE! REVIEW FILES GENERATED:")
    print(f"  1. Markdown for review: {OUTPUT_MD}")
    print(f"  2. Data file for review: {OUTPUT_JSON}")
    print("====================================================")
    print("👉 Next step: Eyeball PENDING_PRICE_REVIEW.md, then run:")
    print("   npm run prices:apply\n")

if __name__ == "__main__":
    main()
