#!/usr/bin/env python3
"""Generate genre card and DJ promo images for Deck Salone."""
import os
import math
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops
import numpy as np

random.seed(42)

# Colors matching the site theme
BG = (10, 10, 10)          # near-black
GOLD = (212, 162, 74)      # gold
GOLD_LIGHT = (240, 200, 120)
WHITE = (245, 245, 245)
GRAY = (120, 120, 120)

GENRES = [
    ("Salone Mix", "salone-mix", (180, 130, 50), "Sierra Leone vibes"),
    ("Throwbacks", "throwbacks", (140, 90, 180), "Classic hits"),
    ("Afrobeats", "afrobeats", (200, 100, 60), "Naija & African hits"),
    ("Amapiano", "amapiano", (80, 140, 120), "South African piano"),
    ("Dancehall", "dancehall", (160, 50, 70), "Caribbean vibes"),
    ("Club Mixes", "club-mixes", (50, 100, 160), "High energy sets"),
    ("Wedding Mixes", "wedding-mixes", (180, 140, 140), "Celebration sets"),
    ("Gospel", "gospel", (120, 120, 60), "Inspirational mixes"),
]


def get_font(size):
    """Return a usable font, falling back to default if needed."""
    try:
        return ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size)
    except Exception:
        try:
            return ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", size)
        except Exception:
            return ImageFont.load_default()


def gradient_background(width, height, color1, color2, direction="vertical"):
    """Create a smooth gradient background."""
    img = Image.new("RGB", (width, height), color1)
    draw = ImageDraw.Draw(img)
    for i in range(height if direction == "vertical" else width):
        ratio = i / (height if direction == "vertical" else width)
        r = int(color1[0] + (color2[0] - color1[0]) * ratio)
        g = int(color1[1] + (color2[1] - color1[1]) * ratio)
        b = int(color1[2] + (color2[2] - color1[2]) * ratio)
        if direction == "vertical":
            draw.line([(0, i), (width, i)], fill=(r, g, b))
        else:
            draw.line([(i, 0), (i, height)], fill=(r, g, b))
    return img


def add_vignette(img, strength=0.6):
    """Darken edges to focus attention in center."""
    width, height = img.size
    overlay = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(overlay)
    center_x, center_y = width // 2, height // 2
    max_dist = math.sqrt(center_x**2 + center_y**2)
    for y in range(0, height, 4):
        for x in range(0, width, 4):
            dist = math.sqrt((x - center_x) ** 2 + (y - center_y) ** 2)
            val = int(255 * (1 - strength * (dist / max_dist)))
            draw.rectangle([x, y, x + 4, y + 4], fill=max(0, min(255, val)))
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=20))
    img = img.copy()
    img.paste(Image.new("RGB", (width, height), (0, 0, 0)), mask=ImageChops.invert(overlay))
    return img


def add_noise(img, intensity=8):
    """Add subtle film grain."""
    arr = np.array(img).astype(np.int16)
    noise = np.random.randint(-intensity, intensity + 1, arr.shape, dtype=np.int16)
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def draw_waveform(draw, width, height, y_center, color, bars=60, amp=40):
    """Draw a stylized audio waveform."""
    bar_width = width // bars
    for i in range(bars):
        x = i * bar_width + bar_width // 4
        h = random.randint(10, amp) + (amp // 3 if i % 3 == 0 else 0)
        top = max(0, y_center - h)
        bottom = min(height, y_center + h)
        alpha_overlay = Image.new("RGBA", (bar_width // 2, bottom - top), (*color, 120))
        draw.bitmap((x, top), alpha_overlay, fill=color)


def generate_genre_image(name, slug, accent, subtitle, width=800, height=600):
    """Generate one genre card image."""
    # Dark gradient based on accent color
    c1 = tuple(max(5, min(40, c // 5)) for c in accent)
    c2 = tuple(max(5, min(60, c // 3)) for c in accent)
    img = gradient_background(width, height, c1, c2, direction="diagonal")

    draw = ImageDraw.Draw(img)

    # Decorative circles
    for _ in range(5):
        cx = random.randint(0, width)
        cy = random.randint(0, height)
        r = random.randint(80, 250)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=tuple(min(255, c + 40) for c in accent), width=2)

    # Abstract waveform lines
    for i in range(8):
        y = 100 + i * 60
        points = []
        for x in range(0, width + 20, 20):
            wave = int(math.sin(x / 60 + i) * 20 + random.randint(-5, 5))
            points.append((x, y + wave))
        if len(points) > 1:
            draw.line(points, fill=tuple(min(255, c + 60) for c in accent), width=2)

    # Vignette and noise
    img = add_vignette(img, strength=0.5)
    img = add_noise(img, intensity=5)
    draw = ImageDraw.Draw(img)

    # Keep images as abstract backgrounds only; the UI will overlay text.
    return img


def generate_dj_promo_images(width=420, height=720):
    """Generate two phone-shaped promo images for the 'Are you a DJ?' section."""
    images = []
    for idx, accent in enumerate([(GOLD, (30, 30, 30)), ((200, 160, 100), (25, 25, 25))]):
        img = Image.new("RGB", (width, height), accent[1])
        draw = ImageDraw.Draw(img)

        # Rounded phone frame
        frame_color = accent[0]
        margin = 20
        draw.rounded_rectangle(
            [margin, margin, width - margin, height - margin],
            radius=40,
            outline=frame_color,
            width=4,
        )

        # Inner content area
        draw.rounded_rectangle(
            [margin + 12, margin + 12, width - margin - 12, height - margin - 12],
            radius=32,
            fill=(18, 18, 18),
        )

        # Decorative elements
        for i in range(5):
            y = 120 + i * 90
            draw.rounded_rectangle([60, y, width - 60, y + 50], radius=8, fill=(40, 40, 40))
            draw.rounded_rectangle([60, y, 60 + random.randint(100, 250), y + 50], radius=8, fill=tuple(max(0, c - 40) for c in frame_color))

        # Equalizer bars at bottom
        bar_y = height - 180
        bar_w = 16
        gap = 8
        start_x = (width - (12 * (bar_w + gap))) // 2
        for i in range(12):
            h = random.randint(30, 100)
            x = start_x + i * (bar_w + gap)
            draw.rounded_rectangle([x, bar_y - h, x + bar_w, bar_y], radius=8, fill=frame_color)

        # Glow at top
        glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        gdraw = ImageDraw.Draw(glow)
        gdraw.ellipse([width // 2 - 150, -100, width // 2 + 150, 200], fill=(*frame_color, 60))
        img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")

        images.append(img)
    return images


def main():
    base_dir = "/Users/djfredmax/Desktop/Deck Salone/app/public/images"
    genres_dir = os.path.join(base_dir, "genres")
    promo_dir = os.path.join(base_dir, "dj-promo")
    os.makedirs(genres_dir, exist_ok=True)
    os.makedirs(promo_dir, exist_ok=True)

    print("Generating genre card images...")
    for name, slug, accent, subtitle in GENRES:
        img = generate_genre_image(name, slug, accent, subtitle)
        path = os.path.join(genres_dir, f"{slug}.jpg")
        img.save(path, "JPEG", quality=90)
        print(f"  Saved {path}")

    print("\nGenerating DJ promo images...")
    promo_images = generate_dj_promo_images()
    for i, img in enumerate(promo_images, 1):
        path = os.path.join(promo_dir, f"promo-{i}.jpg")
        img.save(path, "JPEG", quality=90)
        print(f"  Saved {path}")

    print("\nDone.")


if __name__ == "__main__":
    main()
