# scripts/ebay_login_helper.py
# Interactive helper to capture authenticated eBay session in persistent Chrome profile
import json
import os
import sys
import time
import urllib.parse
from bs4 import BeautifulSoup

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from seleniumbase import Driver

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CACHE_DIR = os.path.join(ROOT_DIR, ".cache")
PROFILE_DIR = os.path.join(CACHE_DIR, "ebay_chrome_profile")
COOKIE_FILE = os.path.join(CACHE_DIR, "ebay_cookies.json")

def verify_sold_access(driver):
    """Checks if sold listings can be loaded without redirecting to sign in."""
    test_url = "https://www.ebay.com/sch/i.html?_nkw=RTX+3060&LH_Sold=1&LH_Complete=1&_sop=13"
    print("\n[Verification] Testing sold-listing URL in browser...")
    try:
        driver.uc_open_with_reconnect(test_url, reconnect_time=2)
        time.sleep(2)
        cur_url = driver.current_url.lower()
        title = driver.title.lower()
        
        if "signin.ebay.com" in cur_url or "sign in" in title or "security measure" in title:
            return False, "Redirected to sign-in page. Session is not yet fully authenticated."
            
        soup = BeautifulSoup(driver.page_source, "html.parser")
        items = soup.select(".s-card, .s-item")
        sold_markers = soup.select(".s-item__ended-date, .s-item__endedDate, .POSITIVE")
        
        if len(items) > 0 and len(sold_markers) > 0:
            return True, f"Found {len(items)} items and {len(sold_markers)} sold date markers!"
        if len(items) > 5:
            return True, f"Found {len(items)} listings on sold results page!"
            
        return False, f"Page loaded but only found {len(items)} listings."
    except Exception as e:
        return False, str(e)

def check_user_greeting(driver):
    """Passively checks if the current page header displays a signed-in username without reloading."""
    try:
        soup = BeautifulSoup(driver.page_source, "html.parser")
        gh_ug = soup.select_one("#gh-ug")
        if gh_ug:
            text = gh_ug.get_text().strip().lower()
            if "hi " in text and "sign in" not in text:
                return True, gh_ug.get_text().strip()
    except Exception:
        pass
    return False, ""

def main():
    print("====================================================")
    print("🔑 AI RIG BUILDER — EBAY AUTHENTICATED SESSION HELPER")
    print("====================================================")
    print(f"Profile: {PROFILE_DIR}")
    print("\nOpening headful Chrome window to: https://signin.ebay.com/ ...")
    print("👉 Log into your eBay account in the Chrome browser.")
    print("👉 When you are logged in, press [ENTER] in this terminal.")
    print("----------------------------------------------------")
    
    os.makedirs(CACHE_DIR, exist_ok=True)
    os.makedirs(PROFILE_DIR, exist_ok=True)

    driver = Driver(uc=True, user_data_dir=PROFILE_DIR, headless=False)
    
    try:
        driver.uc_open_with_reconnect("https://signin.ebay.com/", reconnect_time=3)
        print("\n⏳ Browser opened. Waiting for your login...")
        print("👉 Complete your sign-in, then press [ENTER] in this terminal when finished.")
        
        start_time = time.time()
        timeout_seconds = 600  # 10 minutes
        last_log_time = 0
        
        while time.time() - start_time < timeout_seconds:
            time.sleep(1)
            
            # Check for non-blocking manual Enter keypress on Windows
            enter_pressed = False
            if sys.platform == "win32":
                import msvcrt
                while msvcrt.kbhit():
                    ch = msvcrt.getch()
                    if ch in [b"\r", b"\n", b" "]:
                        enter_pressed = True

            # Check passively without navigating away
            signed_in, greeting = check_user_greeting(driver)
            
            now = time.time()
            if now - last_log_time > 20:
                last_log_time = now
                status_str = f"Greeting: '{greeting}'" if signed_in else "Not yet signed in"
                print(f"   [Status: {status_str}] (Press [ENTER] in this terminal once logged in)")
            
            if enter_pressed or signed_in:
                print(f"\n👉 Trigger received! (Greeting: '{greeting}')")
                print("Running verification test to confirm sold listings access...")
                ok, msg = verify_sold_access(driver)
                if ok:
                    print(f"\n🎉 SUCCESS: {msg}")
                    print("eBay sold listings are unlocked and accessible!")
                    break
                else:
                    print(f"⚠️ Verification check: {msg}")
                    print("If you just finished 2FA or captcha, please ensure you're on eBay, then press [ENTER] again.")
                    # Return driver to eBay homepage so user can continue if needed
                    time.sleep(1)

        # Save cookies to JSON as backup
        cookies = driver.get_cookies()
        with open(COOKIE_FILE, "w", encoding="utf-8") as f:
            json.dump(cookies, f, indent=2)
            
        print(f"\n✅ Session profile and {len(cookies)} cookies saved successfully.")
        print(f"   Profile: {PROFILE_DIR}")
        print(f"   Cookies: {COOKIE_FILE}")
        print("\nNext step: Run `npm run prices:fetch` to pull real sold listings!")
        
    finally:
        driver.quit()
        print("\nBrowser closed cleanly.")
        sys.exit(0)

if __name__ == "__main__":
    main()
