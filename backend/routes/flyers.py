from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from bson import ObjectId
from database import db
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import httpx
import io
import textwrap
import logging
from datetime import datetime

router = APIRouter()
logger = logging.getLogger("server")

# Font paths
FONT_BOLD = "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"

# Event type colors
EVENT_TYPE_COLORS = {
    "Car Meet": (255, 85, 0),
    "Car Show": (255, 193, 7),
    "Cruise": (79, 195, 247),
    "Pop Up": (233, 30, 99),
    "Swap Meet": (156, 39, 176),
    "Drift Event": (255, 152, 0),
    "Drag Race": (244, 67, 54),
    "Other": (150, 150, 150),
}

FLYER_WIDTH = 1080
FLYER_HEIGHT = 1350


def format_flyer_date(date_str: str) -> str:
    """Format date string for flyer display."""
    if not date_str:
        return "TBD"
    try:
        clean = date_str.split("T")[0]
        year, month, day = clean.split("-")
        d = datetime(int(year), int(month), int(day))
        return d.strftime("%A, %B %d, %Y")
    except Exception:
        return date_str


def draw_rounded_rect(draw, xy, radius, fill):
    """Draw a rounded rectangle."""
    x1, y1, x2, y2 = xy
    draw.rectangle([x1 + radius, y1, x2 - radius, y2], fill=fill)
    draw.rectangle([x1, y1 + radius, x2, y2 - radius], fill=fill)
    draw.pieslice([x1, y1, x1 + 2 * radius, y1 + 2 * radius], 180, 270, fill=fill)
    draw.pieslice([x2 - 2 * radius, y1, x2, y1 + 2 * radius], 270, 360, fill=fill)
    draw.pieslice([x1, y2 - 2 * radius, x1 + 2 * radius, y2], 90, 180, fill=fill)
    draw.pieslice([x2 - 2 * radius, y2 - 2 * radius, x2, y2], 0, 90, fill=fill)


def wrap_text(text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list:
    """Wrap text to fit within max_width."""
    words = text.split()
    lines = []
    current_line = ""
    for word in words:
        test_line = f"{current_line} {word}".strip()
        bbox = font.getbbox(test_line)
        if bbox[2] - bbox[0] <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)
    return lines


async def generate_flyer(event: dict) -> bytes:
    """Generate a professional flyer image for an event."""
    
    # Create base image
    img = Image.new("RGB", (FLYER_WIDTH, FLYER_HEIGHT), (12, 12, 12))
    draw = ImageDraw.Draw(img)
    
    # Try to load event image as background
    image_url = event.get("imageUrl")
    has_bg = False
    if image_url and image_url.startswith("http"):
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(image_url)
                if resp.status_code == 200:
                    bg = Image.open(io.BytesIO(resp.content)).convert("RGB")
                    # Resize to cover the top portion
                    bg_ratio = max(FLYER_WIDTH / bg.width, (FLYER_HEIGHT * 0.55) / bg.height)
                    bg = bg.resize((int(bg.width * bg_ratio), int(bg.height * bg_ratio)), Image.LANCZOS)
                    # Center crop
                    left = (bg.width - FLYER_WIDTH) // 2
                    top = (bg.height - int(FLYER_HEIGHT * 0.55)) // 2
                    bg = bg.crop((left, top, left + FLYER_WIDTH, top + int(FLYER_HEIGHT * 0.55)))
                    # Apply slight blur for readability
                    bg = bg.filter(ImageFilter.GaussianBlur(radius=2))
                    img.paste(bg, (0, 0))
                    has_bg = True
        except Exception as e:
            logger.warning(f"Failed to load event image for flyer: {e}")
    
    # Draw gradient overlay from top to bottom
    overlay = Image.new("RGBA", (FLYER_WIDTH, FLYER_HEIGHT), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    
    if has_bg:
        # Top: subtle dark overlay for readability
        for y in range(int(FLYER_HEIGHT * 0.55)):
            alpha = int(80 + (y / (FLYER_HEIGHT * 0.55)) * 140)
            overlay_draw.line([(0, y), (FLYER_WIDTH, y)], fill=(12, 12, 12, min(alpha, 255)))
        # Bottom: solid dark
        overlay_draw.rectangle([0, int(FLYER_HEIGHT * 0.55), FLYER_WIDTH, FLYER_HEIGHT], fill=(12, 12, 12, 255))
    
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)
    
    # Load fonts
    try:
        font_title = ImageFont.truetype(FONT_BOLD, 64)
        font_subtitle = ImageFont.truetype(FONT_BOLD, 36)
        font_detail = ImageFont.truetype(FONT_REGULAR, 30)
        font_badge = ImageFont.truetype(FONT_BOLD, 28)
        font_brand = ImageFont.truetype(FONT_BOLD, 24)
        font_small = ImageFont.truetype(FONT_REGULAR, 22)
    except Exception:
        font_title = ImageFont.load_default()
        font_subtitle = font_title
        font_detail = font_title
        font_badge = font_title
        font_brand = font_title
        font_small = font_title
    
    margin = 60
    y_pos = 60 if not has_bg else int(FLYER_HEIGHT * 0.55) - 200
    
    # ===== EVENT TYPE BADGE =====
    event_type = event.get("eventType", "Event")
    type_color = EVENT_TYPE_COLORS.get(event_type, (150, 150, 150))
    badge_text = event_type.upper()
    badge_bbox = font_badge.getbbox(badge_text)
    badge_w = badge_bbox[2] - badge_bbox[0] + 40
    badge_h = badge_bbox[3] - badge_bbox[1] + 20
    
    if has_bg:
        # Position badge near top of image
        badge_y = 50
    else:
        badge_y = y_pos
    
    draw_rounded_rect(draw, (margin, badge_y, margin + badge_w, badge_y + badge_h), 12, type_color)
    draw.text((margin + 20, badge_y + 6), badge_text, fill=(255, 255, 255), font=font_badge)
    
    if not has_bg:
        y_pos = badge_y + badge_h + 30
    
    # ===== ACCENT LINE =====
    accent_y = y_pos if not has_bg else int(FLYER_HEIGHT * 0.55) + 20
    draw.rectangle([margin, accent_y, margin + 80, accent_y + 6], fill=(255, 85, 0))
    
    # ===== TITLE =====
    title = event.get("title", "Untitled Event")
    title_y = accent_y + 24
    title_lines = wrap_text(title, font_title, FLYER_WIDTH - margin * 2)
    for i, line in enumerate(title_lines[:3]):  # Max 3 lines
        draw.text((margin, title_y + i * 78), line, fill=(255, 255, 255), font=font_title)
    title_bottom = title_y + len(title_lines[:3]) * 78
    
    # ===== DATE & TIME =====
    y_pos = title_bottom + 40
    
    # Date
    date_str = format_flyer_date(event.get("date", ""))
    draw.text((margin + 44, y_pos), date_str, fill=(255, 255, 255), font=font_subtitle)
    # Calendar icon placeholder (orange square)
    draw.rectangle([margin, y_pos + 4, margin + 32, y_pos + 36], fill=(255, 85, 0))
    draw.text((margin + 6, y_pos + 4), "📅", fill=(255, 255, 255), font=font_small)
    y_pos += 56
    
    # Time
    time_str = event.get("time", "")
    if time_str:
        draw.rectangle([margin, y_pos + 4, margin + 32, y_pos + 36], fill=(255, 85, 0))
        draw.text((margin + 6, y_pos + 4), "🕐", fill=(255, 255, 255), font=font_small)
        draw.text((margin + 44, y_pos), time_str, fill=(200, 200, 200), font=font_subtitle)
        y_pos += 56
    
    # ===== DIVIDER =====
    y_pos += 10
    draw.line([(margin, y_pos), (FLYER_WIDTH - margin, y_pos)], fill=(40, 40, 40), width=2)
    y_pos += 30
    
    # ===== LOCATION =====
    location = event.get("location", "")
    if location:
        draw.rectangle([margin, y_pos + 2, margin + 32, y_pos + 34], fill=(255, 85, 0))
        draw.text((margin + 6, y_pos + 2), "📍", fill=(255, 255, 255), font=font_small)
        loc_lines = wrap_text(location, font_detail, FLYER_WIDTH - margin * 2 - 50)
        for i, line in enumerate(loc_lines[:2]):
            draw.text((margin + 44, y_pos + i * 38), line, fill=(180, 180, 180), font=font_detail)
        y_pos += len(loc_lines[:2]) * 38 + 20
    
    # ===== COST =====
    cost = event.get("cost", "")
    if cost:
        draw.rectangle([margin, y_pos + 2, margin + 32, y_pos + 34], fill=(255, 85, 0))
        draw.text((margin + 6, y_pos + 2), "💰", fill=(255, 255, 255), font=font_small)
        cost_display = "FREE" if cost.lower() in ["free", "0", "$0"] else cost
        cost_color = (76, 175, 80) if cost_display == "FREE" else (200, 200, 200)
        draw.text((margin + 44, y_pos), cost_display, fill=cost_color, font=font_detail)
        y_pos += 50
    
    # ===== DESCRIPTION (if room) =====
    description = event.get("description", "")
    if description and y_pos < FLYER_HEIGHT - 200:
        y_pos += 10
        draw.line([(margin, y_pos), (FLYER_WIDTH - margin, y_pos)], fill=(40, 40, 40), width=2)
        y_pos += 20
        desc_lines = wrap_text(description, font_small, FLYER_WIDTH - margin * 2)
        max_desc_lines = min(4, (FLYER_HEIGHT - 140 - y_pos) // 30)
        for i, line in enumerate(desc_lines[:max_desc_lines]):
            draw.text((margin, y_pos + i * 30), line, fill=(120, 120, 120), font=font_small)
        y_pos += min(len(desc_lines), max_desc_lines) * 30
    
    # ===== BOTTOM BRANDING BAR =====
    bar_height = 70
    draw.rectangle([0, FLYER_HEIGHT - bar_height, FLYER_WIDTH, FLYER_HEIGHT], fill=(18, 18, 18))
    draw.line([(0, FLYER_HEIGHT - bar_height), (FLYER_WIDTH, FLYER_HEIGHT - bar_height)], fill=(255, 85, 0), width=3)
    
    brand_text = "OKLAHOMA CAR MEETS"
    brand_bbox = font_brand.getbbox(brand_text)
    brand_w = brand_bbox[2] - brand_bbox[0]
    draw.text(((FLYER_WIDTH - brand_w) // 2, FLYER_HEIGHT - bar_height + 22), brand_text, fill=(255, 85, 0), font=font_brand)
    
    # ===== RECURRING BADGE =====
    if event.get("isRecurring"):
        rec_text = "RECURRING EVENT"
        rec_bbox = font_small.getbbox(rec_text)
        rec_w = rec_bbox[2] - rec_bbox[0] + 30
        rec_x = FLYER_WIDTH - margin - rec_w
        rec_y = 50 if has_bg else 60
        draw_rounded_rect(draw, (rec_x, rec_y, rec_x + rec_w, rec_y + 34), 8, (79, 195, 247))
        draw.text((rec_x + 15, rec_y + 4), rec_text, fill=(255, 255, 255), font=font_small)
    
    # Convert to bytes
    output = io.BytesIO()
    img.save(output, format="JPEG", quality=85, optimize=True)
    output.seek(0)
    return output.getvalue()


@router.get("/events/{event_id}/flyer")
async def get_event_flyer(event_id: str):
    """Generate and return a flyer image for an event."""
    
    # Handle recurring event IDs (e.g., "abc123__20260415")
    base_id = event_id.split("__")[0] if "__" in event_id else event_id
    
    if not ObjectId.is_valid(base_id):
        raise HTTPException(status_code=400, detail="Invalid event ID")
    
    event = await db.events.find_one({"_id": ObjectId(base_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event_data = dict(event)
    
    # For recurring events with a specific date
    if "__" in event_id:
        date_part = event_id.split("__")[1]
        event_data["date"] = f"{date_part[:4]}-{date_part[4:6]}-{date_part[6:8]}"
    
    try:
        flyer_bytes = await generate_flyer(event_data)
        return Response(
            content=flyer_bytes,
            media_type="image/jpeg",
            headers={
                "Cache-Control": "public, max-age=3600",
                "Content-Disposition": f"inline; filename=flyer-{event_id}.jpg"
            }
        )
    except Exception as e:
        logger.error(f"Failed to generate flyer: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate flyer")
