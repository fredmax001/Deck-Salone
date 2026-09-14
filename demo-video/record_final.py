#!/usr/bin/env python3
"""
Deck Salone — Demo Video Recorder (FINAL)
Correct navigation: rankings→VIEW for DJ profile, mixes→PLAY for listening.
"""

from playwright.sync_api import sync_playwright
import os
import time
import glob
import shutil

BASE = "https://decksalone.com"
RECORDINGS = "/Users/djfredmax/Desktop/Deck Salone/demo-video/recordings"
os.makedirs(RECORDINGS, exist_ok=True)

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


def record_scene(p, scene_name, record_fn, viewport, is_mobile=False):
    scene_dir = f"/tmp/ds-rec-{scene_name}"
    profile_dir = f"/tmp/ds-prof-{scene_name}"
    os.makedirs(scene_dir, exist_ok=True)

    kwargs = dict(
        headless=True,
        viewport=viewport,
        record_video_dir=scene_dir,
        record_video_size=viewport,
        ignore_https_errors=True,
    )
    if is_mobile:
        kwargs["is_mobile"] = True
        kwargs["has_touch"] = True
        kwargs["device_scale_factor"] = 2
        kwargs["user_agent"] = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"

    ctx = p.chromium.launch_persistent_context(profile_dir, **kwargs)
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
        size_mb = os.path.getsize(src) / 1024 / 1024
        shutil.copy2(src, f"{RECORDINGS}/{scene_name}.webm")
        print(f"    💾 {scene_name}.webm ({size_mb:.1f} MB)")

    shutil.rmtree(scene_dir, ignore_errors=True)
    shutil.rmtree(profile_dir, ignore_errors=True)


# ─── SCENES ───

def scene_intro(page):
    """SCENE 1: Landing page hero + branding"""
    page.goto(BASE, wait_until="networkidle", timeout=45000)
    wait_content(page, 6)
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(2)
    # Slow scroll down slightly to show trending mixes
    smooth_scroll(page, 300, 2000)
    time.sleep(1)
    time.sleep(7)


def scene_discover(page):
    """SCENE 2: Homepage sections - scroll through"""
    page.goto(BASE, wait_until="networkidle", timeout=45000)
    wait_content(page, 5)
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(1.5)
    smooth_scroll(page, 500, 2000)
    time.sleep(0.5)
    smooth_scroll(page, 1000, 2000)
    time.sleep(0.5)
    smooth_scroll(page, 1500, 2000)
    time.sleep(0.5)
    time.sleep(8)


def scene_dj_profile(page):
    """SCENE 3: Rankings → click VIEW → DJ profile"""
    page.goto(f"{BASE}/rankings", wait_until="networkidle", timeout=45000)
    wait_content(page, 5)
    # Click VIEW on #1 DJ
    view_btn = page.locator('button:has-text("VIEW")').first
    if view_btn.is_visible(timeout=5000):
        view_btn.click()
        time.sleep(4)
    wait_content(page, 3)
    # Scroll through profile
    smooth_scroll(page, 400, 1500)
    time.sleep(0.5)
    smooth_scroll(page, 800, 1500)
    time.sleep(0.5)
    time.sleep(8)


def scene_upload(page):
    """SCENE 4: Registration/signup → becoming a DJ"""
    page.goto(f"{BASE}/register", wait_until="networkidle", timeout=45000)
    wait_content(page, 5)
    time.sleep(3)
    # Scroll to show form fields
    smooth_scroll(page, 300, 1500)
    time.sleep(1)
    time.sleep(7)


def scene_listening(page):
    """SCENE 5: Mix hub → click PLAY SPOTLIGHT → player appears"""
    page.goto(f"{BASE}/mixes", wait_until="networkidle", timeout=45000)
    wait_content(page, 6)
    # Click PLAY SPOTLIGHT MIX
    play_btn = page.locator('button:has-text("PLAY SPOTLIGHT MIX")').first
    if play_btn.is_visible(timeout=5000):
        play_btn.click()
        time.sleep(3)
    # Scroll to show mix list with waveforms
    smooth_scroll(page, 500, 1500)
    time.sleep(1)
    time.sleep(8)


def scene_discovery(page):
    """SCENE 6: Discover page - find your perfect DJ"""
    page.goto(f"{BASE}/discover", wait_until="networkidle", timeout=45000)
    wait_content(page, 5)
    # Scroll through DJ listings
    smooth_scroll(page, 400, 1500)
    time.sleep(0.5)
    smooth_scroll(page, 800, 1500)
    time.sleep(0.5)
    time.sleep(7)


def scene_growth(page):
    """SCENE 7: Rankings - Sierra Leone DJ Rankings"""
    page.goto(f"{BASE}/rankings", wait_until="networkidle", timeout=45000)
    wait_content(page, 5)
    # Scroll through rankings
    smooth_scroll(page, 300, 1500)
    time.sleep(0.5)
    smooth_scroll(page, 600, 1500)
    time.sleep(0.5)
    time.sleep(7)


def scene_mobile(page):
    """SCENE 8: Mobile viewport - landing + mixes"""
    page.goto(BASE, wait_until="networkidle", timeout=45000)
    wait_content(page, 5)
    smooth_scroll(page, 500, 1500)
    time.sleep(0.5)
    smooth_scroll(page, 1000, 1500)
    time.sleep(0.5)
    page.goto(f"{BASE}/mixes", wait_until="networkidle", timeout=45000)
    wait_content(page, 4)
    smooth_scroll(page, 400, 1500)
    time.sleep(1)
    time.sleep(10)


def scene_cta(page):
    """SCENE 9: Landing hero - final branding"""
    page.goto(BASE, wait_until="networkidle", timeout=45000)
    wait_content(page, 6)
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(2)
    time.sleep(8)


def main():
    web_vp = {"width": 1920, "height": 1080}
    mobile_vp = {"width": 390, "height": 844}

    scenes = [
        ("01-intro", scene_intro, web_vp, False),
        ("02-discover", scene_discover, web_vp, False),
        ("03-dj-profile", scene_dj_profile, web_vp, False),
        ("04-upload", scene_upload, web_vp, False),
        ("05-listening", scene_listening, web_vp, False),
        ("06-discovery", scene_discovery, web_vp, False),
        ("07-growth", scene_growth, web_vp, False),
        ("08-mobile", scene_mobile, mobile_vp, True),
        ("09-cta", scene_cta, web_vp, False),
    ]

    with sync_playwright() as p:
        for name, fn, vp, mobile in scenes:
            print(f"\n🎬 {name}...")
            record_scene(p, name, fn, vp, mobile)

    print("\n✅ Done!")
    for f in sorted(os.listdir(RECORDINGS)):
        if f.endswith('.webm'):
            size = os.path.getsize(f"{RECORDINGS}/{f}") / 1024 / 1024
            print(f"   {f}: {size:.1f} MB")


if __name__ == "__main__":
    main()
