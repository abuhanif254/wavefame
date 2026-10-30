"""
High-Speed Visual Composer for Waveframe Render Engine
Handles 1-to-4 AI Grid quadrant slicing, camera motions, procedural motion graphics,
bilingual typography (Hind Siliguri / Plus Jakarta Sans), and dynamic captions.
"""

import math
import os
import re
from pathlib import Path
from io import BytesIO
import httpx
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from engine.config import FONTS_DIR, VIDEO_WIDTH, VIDEO_HEIGHT

# Cache for downloaded master grid images
IMAGE_CACHE: dict[str, Image.Image] = {}

# Bengali Unicode Range Detection
BENGALI_RE = re.compile(r"[\u0980-\u09FF]")


def is_bengali_text(text: str) -> bool:
    """Returns True if text contains Bengali Unicode characters."""
    return bool(BENGALI_RE.search(text or ""))


def get_scene_hues(index: int) -> tuple[tuple[int, int, int], tuple[int, int, int]]:
    """Generates high-contrast neon/violet color pairs based on scene index."""
    palette = [
        ((99, 102, 241), (168, 85, 247)),   # Indigo -> Purple
        ((14, 165, 233), (99, 102, 241)),   # Sky -> Indigo
        ((168, 85, 247), (236, 72, 153)),   # Purple -> Pink
        ((6, 182, 212), (59, 130, 246)),    # Cyan -> Blue
        ((244, 63, 94), (168, 85, 247)),    # Rose -> Purple
    ]
    return palette[index % len(palette)]


def ensure_fonts():
    """
    Downloads Hind Siliguri (Bangla) and Plus Jakarta Sans (English) .ttf fonts
    from official CDN if not present in engine/fonts/.
    """
    FONTS_DIR.mkdir(parents=True, exist_ok=True)
    font_urls = {
        "HindSiliguri-Bold.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/hindsiliguri/HindSiliguri-Bold.ttf",
        "PlusJakartaSans-ExtraBold.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf",
    }

    for font_name, url in font_urls.items():
        font_path = FONTS_DIR / font_name
        if not font_path.exists() or font_path.stat().st_size == 0:
            try:
                with httpx.Client(timeout=15.0, follow_redirects=True) as client:
                    resp = client.get(url)
                    if resp.status_code == 200:
                        with open(font_path, "wb") as f:
                            f.write(resp.content)
            except Exception as e:
                print(f"[Visuals] Font download notice: {e}")


def get_font(is_bangla: bool, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Loads appropriate font with graceful fallback."""
    ensure_fonts()
    font_file = "HindSiliguri-Bold.ttf" if is_bangla else "PlusJakartaSans-ExtraBold.ttf"
    font_path = FONTS_DIR / font_file

    if font_path.exists():
        try:
            return ImageFont.truetype(str(font_path), size)
        except Exception:
            pass

    # System fallbacks
    fallbacks = ["arialbd.ttf", "arial.ttf", "DejaVuSans-Bold.ttf", "DejaVuSans.ttf"]
    for fb in fallbacks:
        try:
            return ImageFont.truetype(fb, size)
        except Exception:
            continue

    return ImageFont.load_default()


def download_image_cached(url: str) -> Image.Image | None:
    """Downloads image and stores in memory cache."""
    if not url:
        return None
    if url in IMAGE_CACHE:
        return IMAGE_CACHE[url]

    try:
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            resp = client.get(url)
            if resp.status_code == 200:
                img = Image.open(BytesIO(resp.content)).convert("RGB")
                IMAGE_CACHE[url] = img
                return img
    except Exception as e:
        print(f"[Visuals] Image download warning ({url[:60]}...): {e}")

    return None


def draw_procedural_fallback(width: int, height: int, scene_index: int, progress: float) -> Image.Image:
    """Renders a sleek dark-slate procedural fallback with animated concentric rings."""
    img = Image.new("RGB", (width, height), (2, 6, 23))
    draw = ImageDraw.Draw(img)
    cx, cy = width // 2, height // 2

    c1, c2 = get_scene_hues(scene_index)

    # Concentric glowing rings
    radius = int(width * 0.22 + math.sin(progress * math.pi) * 15)
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], outline=c1, width=4)
    draw.ellipse([cx - radius // 2, cy - radius // 2, cx + radius // 2, cy + radius // 2], outline=c2, width=2)

    # Tech crosshairs
    draw.line([cx - int(width * 0.35), cy, cx + int(width * 0.35), cy], fill=(c2[0], c2[1], c2[2]), width=2)
    draw.line([cx, cy - int(height * 0.35), cx, cy + int(height * 0.35)], fill=(c2[0], c2[1], c2[2]), width=2)

    return img


def draw_motion_graphic(width: int, height: int, scene: dict, progress: float) -> Image.Image:
    """
    Renders 1080p procedural motion graphic templates (Comparison Bars, Radial Dial, Neural Flow).
    """
    img = Image.new("RGB", (width, height), (3, 7, 18))
    draw = ImageDraw.Draw(img)
    scene_index = scene.get("index", 0)
    template_type = scene_index % 3
    cx, cy = width // 2, height // 2
    c1, c2 = get_scene_hues(scene_index)

    if template_type == 0:
        # Template A: Animated Comparison Bar Chart
        bars = [42, 68, 91, 55, 78]
        chart_w = int(width * 0.70)
        chart_h = int(height * 0.50)
        start_x = (width - chart_w) // 2
        start_y = int(height * 0.75)
        bar_w = chart_w // (len(bars) * 2)

        font_pct = get_font(False, int(width * 0.020))
        font_lbl = get_font(False, int(width * 0.014))

        for i, val in enumerate(bars):
            growth = min(1.0, progress * 1.8)
            cur_h = int((val / 100.0) * chart_h * growth)
            bx = start_x + i * bar_w * 2 + bar_w // 2
            by = start_y - cur_h

            draw.rectangle([bx, by, bx + bar_w, start_y], fill=c1)
            pct_str = f"{int(val * growth)}%"
            draw.text((bx + bar_w // 2, by - 24), pct_str, fill=(224, 242, 254), font=font_pct, anchor="mm")
            draw.text((bx + bar_w // 2, start_y + 24), f"METRIC {i+1}", fill=(148, 163, 184), font=font_lbl, anchor="mm")

    elif template_type == 1:
        # Template B: Glowing Radial Stat Dial
        r = int(height * 0.28)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(30, 41, 59), width=18)

        # Progress Arc
        growth = min(1.0, progress * 1.6)
        end_angle = -90 + int(360 * 0.84 * growth)
        draw.arc([cx - r, cy - r, cx + r, cy + r], start=-90, end=end_angle, fill=c2, width=18)

        font_val = get_font(False, int(width * 0.070))
        font_tag = get_font(False, int(width * 0.016))
        draw.text((cx, cy - 20), f"{int(84 * growth)}%", fill=(255, 255, 255), font=font_val, anchor="mm")
        draw.text((cx, cy + int(height * 0.07)), "RETENTION PEAK", fill=(56, 189, 248), font=font_tag, anchor="mm")

    else:
        # Template C: Process Flow / Neural Nodes
        nodes = ["01 AUDIO", "02 AI ENGINE", "03 1080P VIDEO"]
        spacing = int(width * 0.65) // 2
        start_x = cx - spacing
        box_size = int(width * 0.09)

        font_num = get_font(False, int(width * 0.024))
        font_txt = get_font(False, int(width * 0.012))

        # Connecting line
        draw.line([start_x, cy, cx + spacing, cy], fill=(129, 140, 248), width=3)

        for i, label in enumerate(nodes):
            nx = start_x + i * spacing
            draw.rectangle(
                [nx - box_size // 2, cy - box_size // 2, nx + box_size // 2, cy + box_size // 2],
                fill=(15, 23, 42),
                outline=(56, 189, 248),
                width=3,
            )
            draw.text((nx, cy), f"0{i+1}", fill=(56, 189, 248), font=font_num, anchor="mm")
            draw.text((nx, cy + box_size // 2 + 20), label, fill=(203, 213, 225), font=font_txt, anchor="mm")

    return img


def apply_camera_motion(base_img: Image.Image, effect: str, progress: float, width: int, height: int) -> Image.Image:
    """Applies smooth interpolated camera motion (pan/zoom) to visual."""
    progress = max(0.0, min(1.0, progress))

    if effect == "zoom_in_slow":
        scale = 1.0 + progress * 0.16
    elif effect == "punch_in_fast":
        scale = 1.0 + min(1.0, progress * 3.5) * 0.20
    elif effect == "pan_left":
        scale = 1.10
    elif effect == "pan_right":
        scale = 1.10
    else:
        scale = 1.0

    if scale > 1.001:
        new_w = int(width * scale)
        new_h = int(height * scale)
        resized = base_img.resize((new_w, new_h), Image.Resampling.BILINEAR)

        # Center crop with pan offset
        dx = 0
        if effect == "pan_left":
            dx = int((progress - 0.5) * width * 0.08)
        elif effect == "pan_right":
            dx = -int((progress - 0.5) * width * 0.08)

        left = max(0, min((new_w - width) // 2 + dx, new_w - width))
        top = (new_h - height) // 2
        return resized.crop((left, top, left + width, top + height))

    return base_img


def compose_frame(
    scene: dict,
    scene_elapsed: float,
    scene_duration: float,
    width: int = VIDEO_WIDTH,
    height: int = VIDEO_HEIGHT,
    caption_style: str = "youtube_yellow",
    is_watermarked: bool = False,
) -> Image.Image:
    """
    Composes a complete 1080p frame including camera transforms, visuals,
    bilingual kinetic typography, and styled dynamic captions.
    """
    progress = max(0.0, min(1.0, scene_elapsed / max(0.1, scene_duration)))
    visual_type = scene.get("visualType", "ai_grid_panel")
    img_url = scene.get("gridMasterUrl") or scene.get("previewUrl")

    # 1. Base Visual Layer
    if visual_type == "motion_graphic":
        frame = draw_motion_graphic(width, height, scene, progress)
    else:
        cached_img = download_image_cached(img_url) if img_url else None

        if cached_img:
            if visual_type == "ai_grid_panel" and scene.get("quadrantIndex") is not None:
                q = int(scene["quadrantIndex"]) % 4
                qw = cached_img.width // 2
                qh = cached_img.height // 2
                sx = (q % 2) * qw
                sy = (q // 2) * qh
                quad = cached_img.crop((sx, sy, sx + qw, sy + qh))
                frame = quad.resize((width, height), Image.Resampling.LANCZOS)
            else:
                frame = cached_img.resize((width, height), Image.Resampling.LANCZOS)
        else:
            frame = draw_procedural_fallback(width, height, scene.get("index", 0), progress)

    # 2. Camera Motion
    effect = scene.get("cameraEffect", "zoom_in_slow")
    frame = apply_camera_motion(frame, effect, progress, width, height)

    # 3. Stock Footage letterbox overlay
    draw = ImageDraw.Draw(frame)
    if visual_type == "stock_footage":
        bar_h = int(height * 0.08)
        draw.rectangle([0, 0, width, bar_h], fill=(2, 6, 23))
        draw.rectangle([0, height - bar_h, width, height], fill=(2, 6, 23))

        # Red recording dot + HDR text
        badge_y = bar_h // 2
        draw.ellipse([int(width * 0.88), badge_y - 5, int(width * 0.88) + 10, badge_y + 5], fill=(239, 68, 68))
        font_badge = get_font(False, int(width * 0.012))
        draw.text((int(width * 0.90), badge_y), "STOCK 4K · HDR", fill=(255, 255, 255), font=font_badge, anchor="lm")

    # 4. Kinetic On-Screen Text
    on_screen_text = scene.get("onScreenText", "").strip()
    if on_screen_text:
        is_bangla = is_bengali_text(on_screen_text)
        is_kinetic = visual_type == "kinetic_text"
        font_size = int(width * 0.058) if is_kinetic else int(width * 0.035)
        font = get_font(is_bangla, font_size)

        text_str = on_screen_text if is_bangla else on_screen_text.upper()
        cx = width // 2
        text_y = int(height * 0.48) if is_kinetic else int(height * 0.68)

        if not is_kinetic:
            # Pill Backdrop
            bbox = draw.textbbox((cx, text_y), text_str, font=font, anchor="mm")
            pad_x = int(width * 0.025)
            pad_y = int(height * 0.016)
            pill_box = [bbox[0] - pad_x, bbox[1] - pad_y, bbox[2] + pad_x, bbox[3] + pad_y]
            draw.rounded_rectangle(pill_box, radius=12, fill=(2, 6, 23, 200), outline=(255, 255, 255, 40), width=2)

        # Shadow + Main Text
        draw.text((cx + 2, text_y + 2), text_str, fill=(0, 0, 0), font=font, anchor="mm")
        draw.text((cx, text_y), text_str, fill=(255, 255, 255), font=font, anchor="mm")

    # 5. Dynamic Captions / Subtitles
    transcript = scene.get("transcriptSegment", "").strip()
    if transcript:
        is_bangla_cap = is_bengali_text(transcript)
        cap_size = int(width * 0.022)
        font_cap = get_font(is_bangla_cap, cap_size)
        cx = width // 2
        cap_y = int(height * 0.92)

        bbox = draw.textbbox((cx, cap_y), transcript, font=font_cap, anchor="mm")
        pad_x = int(width * 0.022)
        pad_y = int(height * 0.012)
        pill = [bbox[0] - pad_x, bbox[1] - pad_y, bbox[2] + pad_x, bbox[3] + pad_y]

        if caption_style == "classic":
            draw.rounded_rectangle(pill, radius=8, fill=(0, 0, 0, 190), outline=(255, 255, 255, 50), width=1)
            draw.text((cx, cap_y), transcript, fill=(255, 255, 255), font=font_cap, anchor="mm")
        elif caption_style == "minimal_glass":
            draw.rounded_rectangle(pill, radius=16, fill=(15, 23, 42, 160), outline=(148, 163, 184, 60), width=1)
            draw.text((cx, cap_y), transcript, fill=(248, 250, 252), font=font_cap, anchor="mm")
        else:
            # YouTube Yellow
            draw.rounded_rectangle(pill, radius=10, fill=(0, 0, 0, 220), outline=(250, 204, 21, 100), width=2)
            draw.text((cx, cap_y), transcript, fill=(250, 204, 21), font=font_cap, anchor="mm")

    # 6. Watermark enforcement
    if is_watermarked:
        font_wm = get_font(False, int(width * 0.038))
        draw.text((width // 2, height // 2), "WAVEFRAME STUDIO — PREVIEW", fill=(255, 255, 255, 60), font=font_wm, anchor="mm")

    return frame
