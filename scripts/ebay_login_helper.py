# scripts/ebay_login_helper.py
# Interactive helper to capture authenticated eBay session cookies
import json
import os
import sys
import time

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from seleniumbase import Driver

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CACHE_DIR = os.path.join(ROOT_DIR, ".cache")
COOKIE_FILE = os.path.join(CACHE_DIR, "ebay_cookies.json")

def main():
    print("====================================================")
    print("🔑 AI RIG BUILDER — EBAY AUTHENTICATED SESSION HELPER")
    print("====================================================")
    print("Opening a headful Chrome window to: https://signin.ebay.com/ ...")
    print("👉 Please log into your eBay account in the opened Chrome browser.")
    print("The helper will automatically detect when you finish signing in.")
    print("----------------------------------------------------")
    
    os.makedirs(CACHE_DIR, exist_ok=True)
    driver = Driver(uc=True, headless=False)
    
    try:
        driver.uc_open_with_reconnect("https://signin.ebay.com/", reconnect_time=3)
        print("\n⏳ Browser opened. Waiting for eBay login completion...")
        
        logged_in = False
        start_time = time.time()
        timeout_seconds = 300  # 5 minutes
        
        while time.time() - start_time < timeout_seconds:
            time.sleep(2)
            try:
                current_url = driver.current_url.lower()
                cookies = driver.get_cookies()
                cookie_names = [c.get("name", "") for c in cookies]
                
                # Check for successful signin indicators
                has_auth_cookies = any(k in cookie_names for k in ["nonsession", "dp1", "s", "userid", "user_auth"])
                left_signin_page = "signin.ebay.com" not in current_url and "ebay.com" in current_url
                
                if (left_signin_page and len(cookies) >= 8) or (has_auth_cookies and len(cookies) >= 10):
                    print("\n🎉 Detected successful eBay authentication!")
                    logged_in = True
                    break
                    
                # On Windows, also allow manual keypress via msvcrt
                if sys.platform == "win32":
                    import msvcrt
                    if msvcrt.kbhit():
                        msvcrt.getch()
                        print("\n[Manual trigger received]")
                        logged_in = True
                        break
            except Exception:
                pass
                
        cookies = driver.get_cookies()
        if not cookies or len(cookies) < 3:
            print("⚠️ Warning: Few cookies detected. Ensure sign in was completed.")
            
        with open(COOKIE_FILE, "w", encoding="utf-8") as f:
            json.dump(cookies, f, indent=2)
            
        print(f"\n✅ Successfully captured and saved {len(cookies)} session cookies to:")
        print(f"   {COOKIE_FILE}")
        print("\nSubsequent `npm run prices:fetch` calls will use your authenticated session")
        print("to query real eBay sold listings directly!")
        
    finally:
        driver.quit()
        print("\nBrowser closed cleanly.")

if __name__ == "__main__":
    main()
