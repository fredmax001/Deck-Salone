#!/usr/bin/env python3
"""Audit Deck Salone platform — capture screenshots of key pages."""

from playwright.sync_api import sync_playwright
import os
import time

BASE = "https://decksalone.com"
SHOTS_DIR = "/Users/djfredmax/Desktop/Deck Salone/demo-video/audit"
os.makedirs(SHOTS_DIR, exist_ok=True)

# Credentials from conversation
ADMIN_EMAIL = "admin@decksalone.com"
ADMIN_PASS = "VT1jKN6n6zPi2JvinZ9LiY01wB936cQx"

def shot(page, name, delay=2):
    time.sleep(delay)
    page.screenshot(path=f"{SHOTS_DIR}/{name}.png", full_page=False)
    print(f"  📸 {name}")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=2,
            ignore_https_errors=True,
        )
        page = ctx.new_page()

        # 1. Landing page
        print("🌐 Landing page...")
        page.goto(BASE, wait_until="networkidle", timeout=30000)
        shot(page, "01-landing", 3)

        # Handle welcome/terms popup
        try:
            accept_btn = page.locator('button:has-text("Accept"), button:has-text("I Agree"), button:has-text("Got it")').first
            if accept_btn.is_visible(timeout=3000):
                accept_btn.click()
                print("  ✅ Accepted welcome/terms popup")
                time.sleep(1)
                shot(page, "01-landing-after-accept", 2)
        except Exception as e:
            print(f"  ℹ️ No popup: {e}")

        # Scroll through landing sections
        for i, pct in enumerate([25, 50, 75]):
            page.evaluate(f"window.scrollTo({{top: document.body.scrollHeight * {pct}/100, behavior: 'smooth'}})")
            shot(page, f"01-landing-scroll-{pct}", 2)

        # 2. Mix Hub
        print("🎵 Mix Hub...")
        page.goto(f"{BASE}/mix-hub", wait_until="networkidle", timeout=30000)
        shot(page, "02-mixhub", 3)

        # 3. DJs page
        print("🎧 DJs page...")
        page.goto(f"{BASE}/djs", wait_until="networkidle", timeout=30000)
        shot(page, "03-djs", 3)

        # 4. Events page
        print("📅 Events page...")
        page.goto(f"{BASE}/events", wait_until="networkidle", timeout=30000)
        shot(page, "04-events", 3)

        # 5. Feed page
        print("📰 Feed page...")
        page.goto(f"{BASE}/feed", wait_until="networkidle", timeout=30000)
        shot(page, "05-feed", 3)

        # 6. Rankings
        print("🏆 Rankings...")
        page.goto(f"{BASE}/rankings", wait_until="networkidle", timeout=30000)
        shot(page, "06-rankings", 3)

        # 7. Discover page
        print("🔍 Discover...")
        page.goto(f"{BASE}/discover", wait_until="networkidle", timeout=30000)
        shot(page, "07-discover", 3)

        # 8. Playlists
        print("📋 Playlists...")
        page.goto(f"{BASE}/playlists", wait_until="networkidle", timeout=30000)
        shot(page, "08-playlists", 3)

        # 9. Hall of Fame
        print("⭐ Hall of Fame...")
        page.goto(f"{BASE}/hall-of-fame", wait_until="networkidle", timeout=30000)
        shot(page, "09-hall-of-fame", 3)

        # 10. Try to open a DJ profile (from DJs page)
        print("👤 DJ Profile...")
        page.goto(f"{BASE}/djs", wait_until="networkidle", timeout=30000)
        time.sleep(2)
        dj_links = page.locator('a[href*="/dj/"]')
        if dj_links.count() > 0:
            href = dj_links.first.get_attribute("href")
            print(f"  Found DJ: {href}")
            page.goto(f"{BASE}{href}", wait_until="networkidle", timeout=30000)
            shot(page, "10-dj-profile", 3)
            # Scroll on profile
            page.evaluate("window.scrollTo({top: 400, behavior: 'smooth'})")
            shot(page, "10-dj-profile-scroll", 2)
        else:
            print("  ❌ No DJ profiles found")

        # 11. Try to open a mix
        print("🎵 Mix detail...")
        page.goto(f"{BASE}/mix-hub", wait_until="networkidle", timeout=30000)
        time.sleep(2)
        mix_links = page.locator('a[href*="/mix/"]')
        if mix_links.count() > 0:
            href = mix_links.first.get_attribute("href")
            print(f"  Found mix: {href}")
            page.goto(f"{BASE}{href}", wait_until="networkidle", timeout=30000)
            shot(page, "11-mix-detail", 3)
        else:
            print("  ❌ No mix links found")

        # 12. Login page
        print("🔐 Login page...")
        page.goto(f"{BASE}/login", wait_until="networkidle", timeout=30000)
        shot(page, "12-login", 3)

        # 13. Signup page
        print("📝 Signup page...")
        page.goto(f"{BASE}/signup", wait_until="networkidle", timeout=30000)
        shot(page, "13-signup", 3)

        # 14. Try DJ Dashboard (admin login)
        print("📊 Admin Dashboard...")
        page.goto(f"{BASE}/login", wait_until="networkidle", timeout=30000)
        time.sleep(2)
        try:
            email_input = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first
            pass_input = page.locator('input[type="password"]').first
            if email_input.is_visible(timeout=5000):
                email_input.fill(ADMIN_EMAIL)
                pass_input.fill(ADMIN_PASS)
                submit = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login"), button:has-text("Log in")').first
                submit.click()
                time.sleep(5)
                shot(page, "14-after-login", 3)
                print(f"  Current URL: {page.url}")
        except Exception as e:
            print(f"  ❌ Login failed: {e}")

        # Mobile viewport samples
        print("📱 Mobile viewport...")
        ctx_m = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True,
            ignore_https_errors=True,
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        )
        page_m = ctx_m.new_page()
        page_m.goto(BASE, wait_until="networkidle", timeout=30000)
        shot(page_m, "15-mobile-landing", 3)
        page_m.goto(f"{BASE}/mix-hub", wait_until="networkidle", timeout=30000)
        shot(page_m, "15-mobile-mixhub", 3)
        page_m.goto(f"{BASE}/feed", wait_until="networkidle", timeout=30000)
        shot(page_m, "15-mobile-feed", 3)

        ctx_m.close()
        ctx.close()
        browser.close()
        print("\n✅ Audit complete!")

if __name__ == "__main__":
    main()
