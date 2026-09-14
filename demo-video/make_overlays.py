#!/usr/bin/env python3
"""Generate styled text-overlay PNGs (transparent) for the Deck Salone demo video."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

OUT = "/Users/djfredmax/Desktop/Deck Salone/demo-video/overlays"
os.makedirs(OUT, exist_ok=True)

GOLD_LIGHT = (253, 241, 134)   # #fdf186
GOLD       = (244, 224, 89)    # #f4e059
GOLD_DARK  = (206, 177, 0)     # #ceb100
WHITE      = (245, 245, 245)

FONT_BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
FONT_COND  = "/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf"
FONT_ALT   = "/System/Library/Fonts/Supplemental/DIN Alternate Bold.ttf"

def font(path, size):
    return ImageFont.truetype(path, size)

def gradient_text(size, text, fnt, top, bottom, stroke=0):
    """Render text filled with a vertical gradient, with dark stroke/shadow."""
    # measure
    tmp = Image.new("RGBA", (10, 10))
    d = ImageDraw.Draw(tmp)
    bbox = d.textbbox((0, 0), text, font=fnt, stroke_width=stroke)
    w = bbox[2] - bbox[0] + stroke*2 + 8
    h = bbox[3] - bbox[1] + stroke*2 + 8
    pad = 20
    img = Image.new("RGBA", (w + pad*2, h + pad*2), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # stroke (dark outline for readability)
    if stroke > 0:
        d.text((pad, pad), text, font=fnt, fill=(0, 0, 0, 255),
               stroke_width=stroke, stroke_fill=(0, 0, 0, 230))
    else:
        d.text((pad, pad), text, font=fnt, fill=(0, 0, 0, 255))

    # soft drop shadow
    shadow = img.filter(ImageFilter.GaussianBlur(6))
    base = Image.new("RGBA", img.size, (0, 0, 0, 0))
    base.alpha_composite(shadow)

    # gradient fill clipped to text alpha
    grad = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for y in range(img.size[1]):
        t = y / max(1, img.size[1]-1)
        r = int(top[0] + (bottom[0]-top[0])*t)
        g = int(top[1] + (bottom[1]-top[1])*t)
        b = int(top[2] + (bottom[2]-top[2])*t)
        gd.line([(0, y), (img.size[0], y)], fill=(r, g, b, 255))
    mask = img.split()[3].point(lambda a: a)  # text+stroke alpha
    grad.putalpha(mask)

    base.alpha_composite(grad)
    return base

def centered(img, overlay, cy):
    ix, iy = img.size
    ox, oy = overlay.size
    img.alpha_composite(overlay, ((ix-ox)//2, int(cy - oy/2)))

def lower_third(img, overlay, bottom_pad=150):
    ix, iy = img.size
    ox, oy = overlay.size
    img.alpha_composite(overlay, ((ix-ox)//2, iy - oy - bottom_pad))

def make(scene, lines, W=1920, H=1080, kind="lower", bottom_pad=140):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rendered = []
    total_h = 0
    for (text, fnt, grad, stroke, gap_after) in lines:
        ov = gradient_text((W, H), text, fnt, grad[0], grad[1], stroke)
        rendered.append((ov, gap_after))
        total_h += ov.size[1] + gap_after
    total_h -= rendered[-1][1]  # drop trailing gap
    if kind == "center":
        y = H*0.5 - total_h/2
    else:
        y = H - total_h - bottom_pad  # lower third
    for ov, gap in rendered:
        ix = (W - ov.size[0]) // 2
        img.alpha_composite(ov, (ix, int(y)))
        y += ov.size[1] + gap
    path = f"{OUT}/{scene}.png"
    img.save(path)
    print(f"  {scene}.png ({W}x{H})")

# ---- Build overlays ----
def build_all(W, H, s, outdir, bottom_pad):
    global OUT
    OUT = outdir
    os.makedirs(OUT, exist_ok=True)
    print(f"Building {W}x{H} overlays -> {outdir}")
    f_big   = font(FONT_BLACK, int(120*s))
    f_med   = font(FONT_BLACK, int(78*s))
    f_sub   = font(FONT_ALT, int(46*s))
    f_sub2  = font(FONT_ALT, int(40*s))

    G = (GOLD_LIGHT, GOLD_DARK)

    make("01-intro", [
        ("DECK SALONE", f_big, G, 3, 6),
        ("THE HOME OF DJS", f_sub, ((255,255,255),(220,220,220)), 2, 0),
    ], W=W, H=H, kind="center")

    make("02-discover", [
        ("Upload. Connect. Get Discovered. Grow.", f_med, G, 3, 0),
    ], W=W, H=H, kind="lower", bottom_pad=bottom_pad)

    make("03-dj-profile", [
        ("BUILD YOUR DJ PROFILE", f_med, G, 3, 0),
    ], W=W, H=H, kind="lower", bottom_pad=bottom_pad)

    make("04-upload", [
        ("UPLOAD YOUR MIXES", f_med, G, 3, 0),
    ], W=W, H=H, kind="lower", bottom_pad=bottom_pad)

    make("05-listening", [
        ("LET FANS HEAR YOUR SOUND", f_med, G, 3, 0),
    ], W=W, H=H, kind="lower", bottom_pad=bottom_pad)

    make("06-discovery", [
        ("GET DISCOVERED", f_med, G, 3, 0),
    ], W=W, H=H, kind="lower", bottom_pad=bottom_pad)

    make("07-growth", [
        ("BUILD YOUR AUDIENCE.", f_med, G, 3, 4),
        ("GROW YOUR PRESENCE.", f_med, G, 3, 0),
    ], W=W, H=H, kind="lower", bottom_pad=bottom_pad)

    make("08-mobile", [
        ("YOUR DJ PLATFORM. ANYWHERE.", f_med, G, 3, 0),
    ], W=W, H=H, kind="lower", bottom_pad=bottom_pad)

    make("09-cta", [
        ("YOUR NEXT LISTENER IS WAITING", f_med, G, 3, 6),
        ("UPLOAD YOUR MIX TODAY", f_sub, ((255,255,255),(220,220,220)), 2, 8),
        ("JOIN DECK SALONE  •  decksalone.com", f_sub2, G, 2, 0),
    ], W=W, H=H, kind="center")

if __name__ == "__main__":
    import sys
    BASE_DIR = "/Users/djfredmax/Desktop/Deck Salone/demo-video"
    build_all(1920, 1080, 1.0, f"{BASE_DIR}/overlays", 140)
    build_all(1080, 1920, 0.56, f"{BASE_DIR}/overlays-vertical", 300)
    print("Done.")
