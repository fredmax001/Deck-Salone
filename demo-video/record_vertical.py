#!/usr/bin/env python3
"""
Deck Salone — Vertical (9:16) Demo Recorder.
Viewport 540x960 CSS @ dsf=2 -> native 1080x1920 recordings.
Scene 8 = Feed page (mobile-first feature). Scene 3 uses <a> VIEW selector.
"""
from playwright.sync_api import sync_playwright
import os, time, glob, shutil

BASE = "https://decksalone.com"
RECORDINGS = "/Users/djfredmax/Desktop/Deck Salone/demo-video/recordings-vertical"
os.makedirs(RECORDINGS, exist_ok=True)

INIT = """
localStorage.setItem('deck-salone-terms-accepted', 'true');
localStorage.setItem('deck-salone-location-preference', 'declined');
"""

VP = {"width": 540, "height": 960}


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


def wait_content(page, seconds=5):
    time.sleep(seconds)
    try:
        page.evaluate("""
            () => Promise.all(
                Array.from(document.querySelectorAll('img')).map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(res => {
                        img.addEventListener('load', res);
                        img.addEventListener('error', res);
                        setTimeout(res, 3000);
                    });
                })
            )
        """)
    except Exception:
        pass
    time.sleep(1)


def record_scene(p, scene_name, record_fn):
    scene_dir = f"/tmp/dsv-rec-{scene_name}"
    profile_dir = f"/tmp/dsv-prof-{scene_name}"
    os.makedirs(scene_dir, exist_ok=True)

    ctx = p.chromium.launch_persistent_context(
        profile_dir,
        headless=True,
        viewport=VP,
        is_mobile=True,
        has_touch=True,
        device_scale_factor=2,
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        record_video_dir=scene_dir,
        record_video_size={"width": 1080, "height": 1920},
        ignore_https_errors=True,
    )
    ctx.add_init_script(INIT)
    page = ctx.new_page()
    try:
        record_fn(page)
    except Exception as e:
        print(f"    ⚠️ Error: {e}")
    ctx.close()
    time.sleep(2)
    videos = glob.glob(f"{scene_dir}/*.webm")
    if videos:
        src = max(videos, key=os.path.getsize)
        shutil.copy2(src, f"{RECORDINGS}/{scene_name}.webm")
        print(f"    💾 {scene_name}.webm ({os.path.getsize(src)/1024/1024:.1f} MB)")
    shutil.rmtree(scene_dir, ignore_errors=True)
    shutil.rmtree(profile_dir, ignore_errors=True)


def scene_intro(page):
    page.goto(BASE, wait_until="networkidle", timeout=45000)
    wait_content(page, 6)
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(2)
    smooth_scroll(page, 400, 2000)
    time.sleep(1)
    time.sleep(7)

def scene_discover(page):
    page.goto(BASE, wait_until="networkidle", timeout=45000)
    wait_content(page, 5)
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(1.5)
    smooth_scroll(page, 600, 1800)
    time.sleep(0.5)
    smooth_scroll(page, 1200, 1800)
    time.sleep(0.5)
    smooth_scroll(page, 1800, 1800)
    time.sleep(0.5)
    time.sleep(8)

def scene_dj_profile(page):
    page.goto(f"{BASE}/rankings", wait_until="networkidle", timeout=45000)
    wait_content(page, 5)
    view = page.locator('a:has-text("VIEW")').first
    if view.is_visible(timeout=6000):
        view.click()
        time.sleep(4)
    wait_content(page, 3)
    smooth_scroll(page, 500, 1500)
    time.sleep(0.5)
    smooth_scroll(page, 1000, 1500)
    time.sleep(0.5)
    time.sleep(8)

def scene_upload(page):
    page.goto(f"{BASE}/register", wait_until="networkidle", timeout=45000)
    wait_content(page, 5)
    time.sleep(3)
    smooth_scroll(page, 400, 1500)
    time.sleep(1)
    time.sleep(7)

def scene_listening(page):
    page.goto(f"{BASE}/mixes", wait_until="networkidle", timeout=45000)
    wait_content(page, 6)
    play = page.locator('button:has-text("PLAY SPOTLIGHT MIX")').first
    if play.is_visible(timeout=6000):
        play.click()
        time.sleep(3)
    smooth_scroll(page, 600, 1500)
    time.sleep(1)
    time.sleep(8)

def scene_discovery(page):
    page.goto(f"{BASE}/discover", wait_until="networkidle", timeout=45000)
    wait_content(page, 5)
    smooth_scroll(page, 500, 1500)
    time.sleep(0.5)
    smooth_scroll(page, 1000, 1500)
    time.sleep(0.5)
    time.sleep(7)

def scene_growth(page):
    page.goto(f"{BASE}/rankings", wait_until="networkidle", timeout=45000)
    wait_content(page, 5)
    smooth_scroll(page, 400, 1500)
    time.sleep(0.5)
    smooth_scroll(page, 800, 1500)
    time.sleep(0.5)
    time.sleep(7)

def scene_feed(page):
    page.goto(f"{BASE}/feed", wait_until="networkidle", timeout=45000)
    wait_content(page, 5)
    smooth_scroll(page, 500, 1500)
    time.sleep(0.5)
    smooth_scroll(page, 1000, 1500)
    time.sleep(0.5)
    time.sleep(8)

def scene_cta(page):
    page.goto(BASE, wait_until="networkidle", timeout=45000)
    wait_content(page, 6)
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(2)
    time.sleep(8)


def main():
    scenes = [
        ("v01-intro", scene_intro),
        ("v02-discover", scene_discover),
        ("v03-dj-profile", scene_dj_profile),
        ("v04-upload", scene_upload),
        ("v05-listening", scene_listening),
        ("v06-discovery", scene_discovery),
        ("v07-growth", scene_growth),
        ("v08-feed", scene_feed),
        ("v09-cta", scene_cta),
    ]
    with sync_playwright() as p:
        for name, fn in scenes:
            print(f"\n🎬 {name}...")
            record_scene(p, name, fn)
    print("\n✅ Done!")

if __name__ == "__main__":
    main()
