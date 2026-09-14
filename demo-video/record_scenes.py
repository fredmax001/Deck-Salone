#!/usr/bin/env python3
"""
Deck Salone — Demo Video Recorder v3
Pre-seeds localStorage to skip popups. Waits for real content.
"""

from playwright.sync_api import sync_playwright
import os
import time
import glob
import shutil

BASE = "https://decksalone.com"
RECORDINGS = "/Users/djfredmax/Desktop/Deck Salone/demo-video/recordings"
os.makedirs(RECORDINGS, exist_ok=True)

INIT_SCRIPT = """
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


def wait_for_content(page, min_seconds=4):
    """Wait for skeleton screens to be replaced with real content."""
    time.sleep(min_seconds)
    # Wait for images to finish loading
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
    ctx.add_init_script(INIT_SCRIPT)
    page = ctx.new_page()

    try:
        record_fn(page)
    except Exception as e:
        print(f"    ⚠️ Scene error: {e}")

    ctx.close()
    time.sleep(2)

    videos = glob.glob(f"{scene_dir}/*.webm")
    if videos:
        src = max(videos, key=os.path.getsize)
        size_mb = os.path.getsize(src) / 1024 / 1024
        dest = f"{RECORDINGS}/{scene_name}.webm"
        shutil.copy2(src, dest)
        print(f"    💾 {scene_name}.webm ({size_mb:.1f} MB)")
    else:
        print(f"    ❌ No video for {scene_name}")

    shutil.rmtree(scene_dir, ignore_errors=True)
    shutil.rmtree(profile_dir, ignore_errors=True)


# ─── Scenes ───

def scene_intro(page):
    page.goto(BASE, wait_until="networkidle", timeout=45000)
    wait_for_content(page, 5)
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(1)
    time.sleep(7)


def scene_discover(page):
    page.goto(BASE, wait_until="networkidle", timeout=45000)
    wait_for_content(page, 5)
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(1.5)
    smooth_scroll(page, 600, 2000)
    time.sleep(0.5)
    smooth_scroll(page, 1200, 2000)
    time.sleep(0.5)
    time.sleep(8)


def scene_dj_profile(page):
    page.goto(f"{BASE}/djs", wait_until="networkidle", timeout=45000)
    wait_for_content(page, 5)

    clicked = False
    for sel in ['a[href*="/dj/"]']:
        try:
            links = page.locator(sel)
            count = links.count()
            for i in range(min(count, 5)):
                href = links.nth(i).get_attribute("href")
                if href and "/dj/" in href:
                    print(f"    DJ link: {href}")
                    links.nth(i).click()
                    clicked = True
                    break
        except Exception:
            pass
        if clicked:
            break

    if not clicked:
        for url in ["/dj/dj-fred-max", "/dj/dj-babz-232", "/dj/fred-max", "/dj/dj-fred-max-1"]:
            try:
                resp = page.goto(f"{BASE}{url}", wait_until="domcontentloaded", timeout=10000)
                if resp and resp.status < 400:
                    body = page.content()
                    if len(body) > 2000 and "404" not in body[:500]:
                        print(f"    Loaded: {url}")
                        clicked = True
                        break
            except Exception:
                continue

    wait_for_content(page, 4)
    smooth_scroll(page, 400, 1500)
    time.sleep(0.5)
    smooth_scroll(page, 800, 1500)
    time.sleep(0.5)
    time.sleep(8)


def scene_upload(page):
    page.goto(f"{BASE}/dashboard/mixes", wait_until="networkidle", timeout=45000)
    wait_for_content(page, 5)
    try:
        btn = page.locator('button:has-text("Upload"), a:has-text("Upload")').first
        if btn.is_visible(timeout=3000):
            btn.click()
            time.sleep(2)
    except Exception:
        pass
    time.sleep(7)


def scene_listening(page):
    page.goto(f"{BASE}/mix-hub", wait_until="networkidle", timeout=45000)
    wait_for_content(page, 5)

    clicked = False
    for sel in ['a[href*="/mix/"]', 'a[href*="/mixes/"]']:
        try:
            links = page.locator(sel)
            count = links.count()
            for i in range(min(count, 5)):
                href = links.nth(i).get_attribute("href")
                if href and "/mix" in href:
                    print(f"    Mix link: {href}")
                    links.nth(i).click()
                    clicked = True
                    break
        except Exception:
            pass
        if clicked:
            break

    wait_for_content(page, 4)
    try:
        play = page.locator('button[aria-label*="play" i], button:has-text("Play")').first
        if play.is_visible(timeout=3000):
            play.click()
            time.sleep(1)
    except Exception:
        pass
    time.sleep(8)


def scene_discovery(page):
    page.goto(f"{BASE}/discover", wait_until="networkidle", timeout=45000)
    wait_for_content(page, 5)
    smooth_scroll(page, 500, 1500)
    time.sleep(0.5)
    smooth_scroll(page, 1000, 1500)
    time.sleep(0.5)
    time.sleep(7)


def scene_growth(page):
    page.goto(f"{BASE}/rankings", wait_until="networkidle", timeout=45000)
    wait_for_content(page, 5)
    smooth_scroll(page, 400, 1500)
    time.sleep(0.5)
    time.sleep(7)


def scene_mobile(page):
    page.goto(BASE, wait_until="networkidle", timeout=45000)
    wait_for_content(page, 5)
    smooth_scroll(page, 600, 1500)
    time.sleep(0.5)
    smooth_scroll(page, 1200, 1500)
    time.sleep(0.5)
    page.goto(f"{BASE}/mix-hub", wait_until="networkidle", timeout=45000)
    wait_for_content(page, 4)
    smooth_scroll(page, 500, 1500)
    time.sleep(0.5)
    time.sleep(10)


def scene_cta(page):
    page.goto(BASE, wait_until="networkidle", timeout=45000)
    wait_for_content(page, 5)
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(2)
    time.sleep(7)


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
            print(f"\n🎬 Recording {name}...")
            record_scene(p, name, fn, vp, mobile)

    print("\n✅ All scenes recorded!")
    for f in sorted(os.listdir(RECORDINGS)):
        if f.endswith('.webm'):
            size = os.path.getsize(f"{RECORDINGS}/{f}") / 1024 / 1024
            print(f"   {f}: {size:.1f} MB")


if __name__ == "__main__":
    main()
