#!/usr/bin/env python3
"""Re-record scene 3 (DJ Profile) with fixed VIEW selector."""
from playwright.sync_api import sync_playwright
import os, time, glob, shutil

BASE = "https://decksalone.com"
RECORDINGS = "/Users/djfredmax/Desktop/Deck Salone/demo-video/recordings"
INIT = """
localStorage.setItem('deck-salone-terms-accepted', 'true');
localStorage.setItem('deck-salone-location-preference', 'declined');
"""

def smooth_scroll(page, pixels, duration_ms=1500):
    page.evaluate(f"""
        () => {{
            const start = window.scrollY;
            const target = {pixels};
            const duration = {duration_ms};
            const startTime = performance.now();
            function easeOutCubic(t) {{ return 1 - Math.pow(1 - t, 3); }}
            function animate(currentTime) {{
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                window.scrollTo(0, start + (target - start) * easeOutCubic(progress));
                if (progress < 1) requestAnimationFrame(animate);
            }}
            requestAnimationFrame(animate);
        }}
    """)

def scene_dj_profile(page):
    page.goto(f"{BASE}/rankings", wait_until="networkidle", timeout=45000)
    time.sleep(6)
    # Try both button and link selectors for VIEW
    clicked = False
    for sel in ['a:has-text("VIEW")', 'button:has-text("VIEW")']:
        try:
            btn = page.locator(sel).first
            if btn.is_visible(timeout=3000):
                btn.click()
                clicked = True
                print(f"    Clicked VIEW via: {sel}")
                break
        except Exception as e:
            print(f"    {sel} failed: {e}")
    if not clicked:
        # Fallback: click DJ name
        try:
            dj = page.locator('text=FRED MAX').first
            dj.click()
            clicked = True
            print("    Clicked FRED MAX text")
        except Exception as e:
            print(f"    Fallback failed: {e}")

    time.sleep(5)
    print(f"    Current URL: {page.url}")
    page.screenshot(path="/tmp/scene3_check.png")

    # Scroll through profile
    smooth_scroll(page, 400, 1500)
    time.sleep(0.5)
    smooth_scroll(page, 800, 1500)
    time.sleep(0.5)
    time.sleep(8)

scene_dir = "/tmp/ds-rec-03b"
profile_dir = "/tmp/ds-prof-03b"
os.makedirs(scene_dir, exist_ok=True)

with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(
        profile_dir, headless=True,
        viewport={"width":1920,"height":1080},
        record_video_dir=scene_dir,
        record_video_size={"width":1920,"height":1080},
        ignore_https_errors=True,
    )
    ctx.add_init_script(INIT)
    page = ctx.new_page()
    try:
        scene_dj_profile(page)
    except Exception as e:
        print(f"Error: {e}")
    ctx.close()
    time.sleep(2)

    videos = glob.glob(f"{scene_dir}/*.webm")
    if videos:
        src = max(videos, key=os.path.getsize)
        shutil.copy2(src, f"{RECORDINGS}/03-dj-profile.webm")
        print(f"Saved 03-dj-profile.webm ({os.path.getsize(src)/1024/1024:.1f} MB)")

shutil.rmtree(scene_dir, ignore_errors=True)
shutil.rmtree(profile_dir, ignore_errors=True)
