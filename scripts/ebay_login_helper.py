# scripts/ebay_login_helper.py
# One-time interactive helper to capture authenticated eBay session cookies
import json
import os
import sys
import time
from seleniumbase import Driver

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CACHE_DIR = os.path.join(ROOT_DIR, ".cache")
COOKIE_FILE = os.path.join(CACHE_DIR, "ebay_cookies.json")

def main():
    print("====================================================")
    print("🔑 AI RIG BUILDER — EBAY AUTHENTICATED SESSION HELPER")
    print("====================================================")
    print("Opening a headful browser window to https://signin.ebay.com/ ...")
    print("Please log into your eBay account in the browser.")
    print("Once logged in, return to this terminal and press ENTER to save session cookies.")
    print("----------------------------------------------------")
    
    os.makedirs(CACHE_DIR, exist_ok=True)
    driver = Driver(uc=True, headless=False)
    
    try:
        driver.uc_open_with_reconnect("https://signin.ebay.com/", reconnect_time=2)
        input("\n👉 Press [ENTER] in this terminal AFTER you have logged into eBay...")
        
        cookies = driver.get_cookies()
        if not cookies or len(cookies) < 3:
            print("⚠️ Warning: Few cookies detected. Ensure you completed sign in.")
            
        with open(COOKIE_FILE, "w", encoding="utf-8") as f:
            json.dump(cookies, f, indent=2)
            
        print(f"\n✅ Successfully saved {len(cookies)} session cookies to:")
        print(f"   {COOKIE_FILE}")
        print("\nSubsequent `npm run prices:fetch` calls will use your authenticated session")
        print("to query eBay sold listings directly!")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
