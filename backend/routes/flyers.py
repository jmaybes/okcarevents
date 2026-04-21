from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from bson import ObjectId
from database import db
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import httpx
import io
import base64
import logging
from datetime import datetime

router = APIRouter()
logger = logging.getLogger("server")

# Font paths
FONT_BOLD = "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FONT_ITALIC = "/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf"

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
ACCENT = (255, 85, 0)
BG_DARK = (12, 12, 12)
BG_CARD = (22, 22, 22)


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


def draw_icon_calendar(draw, x, y, size, color):
    """Draw a simple calendar icon."""
    s = size
    # Calendar body
    draw.rectangle([x, y + s//5, x + s, y + s], outline=color, width=2)
    # Top bar
    draw.rectangle([x, y + s//5, x + s, y + s//3], fill=color)
    # Hooks
    draw.line([(x + s//4, y), (x + s//4, y + s//4)], fill=color, width=2)
    draw.line([(x + 3*s//4, y), (x + 3*s//4, y + s//4)], fill=color, width=2)


def draw_icon_clock(draw, x, y, size, color):
    """Draw a simple clock icon."""
    s = size
    cx, cy = x + s//2, y + s//2
    r = s//2 - 2
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=2)
    draw.line([(cx, cy), (cx, cy - r + 4)], fill=color, width=2)
    draw.line([(cx, cy), (cx + r - 6, cy)], fill=color, width=2)


def draw_icon_pin(draw, x, y, size, color):
    """Draw a simple location pin icon."""
    s = size
    cx = x + s//2
    # Pin body (circle)
    r = s//3
    draw.ellipse([cx - r, y + 2, cx + r, y + 2 + 2*r], outline=color, width=2)
    # Pin point
    draw.polygon([(cx - r + 2, y + 2 + r + 2), (cx, y + s - 2), (cx + r - 2, y + 2 + r + 2)], fill=color)
    # Center dot
    draw.ellipse([cx - 3, y + 2 + r - 3, cx + 3, y + 2 + r + 3], fill=color)


def draw_icon_dollar(draw, x, y, size, color):
    """Draw a simple dollar icon."""
    s = size
    cx, cy = x + s//2, y + s//2
    r = s//2 - 2
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=2)
    # Dollar sign S
    font = ImageFont.truetype(FONT_BOLD, size - 6)
    bbox = font.getbbox("$")
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((cx - tw//2, cy - th//2 - 2), "$", fill=color, font=font)


def draw_icon_people(draw, x, y, size, color):
    """Draw a simple people icon."""
    s = size
    # Person 1
    cx1 = x + s//3
    draw.ellipse([cx1 - 4, y + 2, cx1 + 4, y + 10], fill=color)
    draw.arc([cx1 - 8, y + 12, cx1 + 8, y + s - 2], 0, 180, fill=color, width=2)
    # Person 2
    cx2 = x + 2*s//3
    draw.ellipse([cx2 - 4, y + 2, cx2 + 4, y + 10], fill=color)
    draw.arc([cx2 - 8, y + 12, cx2 + 8, y + s - 2], 0, 180, fill=color, width=2)


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


async def load_event_image(image_source: str) -> Image.Image | None:
    """Load event image from URL or base64 data."""
    try:
        if image_source.startswith("http"):
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(image_source)
                if resp.status_code == 200:
                    return Image.open(io.BytesIO(resp.content)).convert("RGB")
        elif image_source.startswith("data:image"):
            # base64 data URI
            _, raw_b64 = image_source.split(",", 1)
            img_bytes = base64.b64decode(raw_b64)
            return Image.open(io.BytesIO(img_bytes)).convert("RGB")
        elif len(image_source) > 200:
            # Raw base64 without data URI prefix
            img_bytes = base64.b64decode(image_source)
            return Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception as e:
        logger.warning(f"Failed to load event image for flyer: {e}")
    return None


def draw_decorative_bg(img: Image.Image, draw: ImageDraw.Draw, event_type: str):
    """Draw a decorative background when no event image is available."""
    type_color = EVENT_TYPE_COLORS.get(event_type, ACCENT)

    # Draw subtle diagonal stripes in the top area
    for i in range(-FLYER_HEIGHT, FLYER_WIDTH + FLYER_HEIGHT, 60):
        alpha = 18
        stripe_color = (type_color[0], type_color[1], type_color[2])
        draw.line([(i, 0), (i + FLYER_HEIGHT//2, FLYER_HEIGHT//2)],
                  fill=(stripe_color[0]//8, stripe_color[1]//8, stripe_color[2]//8), width=2)

    # Draw a large accent circle as a design element
    cx, cy = FLYER_WIDTH - 150, 200
    for r in range(180, 0, -3):
        opacity = max(5, 30 - r // 6)
        c = (type_color[0] * opacity // 255, type_color[1] * opacity // 255, type_color[2] * opacity // 255)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)


async def generate_flyer(event: dict) -> bytes:
    """Generate a professional flyer image for an event."""

    # Create base image
    img = Image.new("RGB", (FLYER_WIDTH, FLYER_HEIGHT), BG_DARK)
    draw = ImageDraw.Draw(img)

    # Try to load event image as background
    image_source = None
    # Check for photos array first, then imageUrl
    photos = event.get("photos", [])
    main_idx = event.get("mainPhotoIndex", 0)
    if photos and len(photos) > 0:
        idx = min(main_idx, len(photos) - 1)
        image_source = photos[idx]
    elif event.get("imageUrl"):
        image_source = event["imageUrl"]

    has_bg = False
    if image_source:
        bg_img = await load_event_image(image_source)
        if bg_img:
            # Resize to cover the top portion (55% of flyer)
            target_h = int(FLYER_HEIGHT * 0.55)
            bg_ratio = max(FLYER_WIDTH / bg_img.width, target_h / bg_img.height)
            bg_img = bg_img.resize((int(bg_img.width * bg_ratio), int(bg_img.height * bg_ratio)), Image.LANCZOS)
            # Center crop
            left = (bg_img.width - FLYER_WIDTH) // 2
            top = (bg_img.height - target_h) // 2
            bg_img = bg_img.crop((left, top, left + FLYER_WIDTH, top + target_h))
            img.paste(bg_img, (0, 0))
            has_bg = True

    if not has_bg:
        # Draw decorative background
        draw_decorative_bg(img, draw, event.get("eventType", "Other"))

    # Draw gradient overlay
    overlay = Image.new("RGBA", (FLYER_WIDTH, FLYER_HEIGHT), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)

    if has_bg:
        split_y = int(FLYER_HEIGHT * 0.55)
        # Gradient over photo for text readability
        for y in range(split_y):
            alpha = int(40 + (y / split_y) * 180)
            overlay_draw.line([(0, y), (FLYER_WIDTH, y)], fill=(12, 12, 12, min(alpha, 255)))
        # Solid dark bottom
        overlay_draw.rectangle([0, split_y, FLYER_WIDTH, FLYER_HEIGHT], fill=(12, 12, 12, 255))
    else:
        # Slight gradient for depth
        for y in range(FLYER_HEIGHT):
            alpha = int((y / FLYER_HEIGHT) * 30)
            overlay_draw.line([(0, y), (FLYER_WIDTH, y)], fill=(0, 0, 0, alpha))

    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)

    # Load fonts
    try:
        font_title = ImageFont.truetype(FONT_BOLD, 60)
        font_subtitle = ImageFont.truetype(FONT_BOLD, 34)
        font_detail = ImageFont.truetype(FONT_REGULAR, 28)
        font_badge = ImageFont.truetype(FONT_BOLD, 26)
        font_brand = ImageFont.truetype(FONT_BOLD, 24)
        font_small = ImageFont.truetype(FONT_REGULAR, 22)
        font_desc = ImageFont.truetype(FONT_REGULAR, 24)
    except Exception:
        font_title = ImageFont.load_default()
        font_subtitle = font_title
        font_detail = font_title
        font_badge = font_title
        font_brand = font_title
        font_small = font_title
        font_desc = font_title

    margin = 60
    icon_size = 28

    # ===== EVENT TYPE BADGE =====
    event_type = event.get("eventType", "Event")
    type_color = EVENT_TYPE_COLORS.get(event_type, (150, 150, 150))
    badge_text = event_type.upper()
    badge_bbox = font_badge.getbbox(badge_text)
    badge_w = badge_bbox[2] - badge_bbox[0] + 40
    badge_h = badge_bbox[3] - badge_bbox[1] + 20

    badge_y = 50
    draw_rounded_rect(draw, (margin, badge_y, margin + badge_w, badge_y + badge_h), 12, type_color)
    draw.text((margin + 20, badge_y + 6), badge_text, fill=(255, 255, 255), font=font_badge)

    # ===== RECURRING BADGE =====
    if event.get("isRecurring"):
        rec_text = "RECURRING"
        rec_bbox = font_small.getbbox(rec_text)
        rec_w = rec_bbox[2] - rec_bbox[0] + 30
        rec_x = FLYER_WIDTH - margin - rec_w
        rec_y = 50
        draw_rounded_rect(draw, (rec_x, rec_y, rec_x + rec_w, rec_y + 34), 8, (79, 195, 247))
        draw.text((rec_x + 15, rec_y + 4), rec_text, fill=(255, 255, 255), font=font_small)

    # Content start position
    content_y = int(FLYER_HEIGHT * 0.55) + 20 if has_bg else badge_y + badge_h + 50

    # ===== ACCENT LINE =====
    draw.rectangle([margin, content_y, margin + 80, content_y + 5], fill=ACCENT)
    content_y += 24

    # ===== TITLE =====
    title = event.get("title", "Untitled Event")
    title_lines = wrap_text(title, font_title, FLYER_WIDTH - margin * 2)
    for i, line in enumerate(title_lines[:3]):
        draw.text((margin, content_y + i * 72), line, fill=(255, 255, 255), font=font_title)
    content_y += len(title_lines[:3]) * 72 + 30

    # ===== INFO CARD BACKGROUND =====
    card_top = content_y
    # We'll draw the card background after calculating height

    info_items = []

    # Date
    date_str = format_flyer_date(event.get("date", ""))
    info_items.append(("calendar", date_str, font_subtitle, (255, 255, 255)))

    # Time
    time_str = event.get("time", "")
    if time_str:
        info_items.append(("clock", time_str, font_detail, (200, 200, 200)))

    # Location
    location = event.get("location", "")
    address = event.get("address", "")
    city = event.get("city", "")
    loc_parts = [p for p in [location, address, city] if p]
    loc_display = " | ".join(loc_parts) if loc_parts else ""
    if loc_display:
        info_items.append(("pin", loc_display, font_detail, (180, 180, 180)))

    # Cost
    entry_fee = event.get("entryFee", "") or event.get("cost", "")
    if entry_fee:
        is_free = entry_fee.lower() in ["free", "0", "$0", "none"]
        cost_display = "FREE" if is_free else entry_fee
        cost_color = (76, 175, 80) if is_free else (200, 200, 200)
        info_items.append(("dollar", cost_display, font_subtitle, cost_color))

    # Attendees
    attendee_count = event.get("attendeeCount", 0)
    if attendee_count > 0:
        info_items.append(("people", f"{attendee_count} going", font_detail, (180, 180, 180)))

    # Calculate card height
    item_height = 48
    card_padding = 24
    card_height = card_padding * 2 + len(info_items) * item_height
    card_bottom = content_y + card_height

    # Draw card background
    draw_rounded_rect(draw, (margin - 10, content_y - 10, FLYER_WIDTH - margin + 10, card_bottom + 10), 16, BG_CARD)

    # Draw info items
    y = content_y + card_padding
    for icon_type, text, font, color in info_items:
        icon_x = margin + 16
        text_x = margin + 60

        # Draw icon
        if icon_type == "calendar":
            draw_icon_calendar(draw, icon_x, y + 2, icon_size, ACCENT)
        elif icon_type == "clock":
            draw_icon_clock(draw, icon_x, y + 2, icon_size, ACCENT)
        elif icon_type == "pin":
            draw_icon_pin(draw, icon_x, y + 2, icon_size, ACCENT)
        elif icon_type == "dollar":
            draw_icon_dollar(draw, icon_x, y + 2, icon_size, ACCENT)
        elif icon_type == "people":
            draw_icon_people(draw, icon_x, y + 2, icon_size, ACCENT)

        # Draw text (handle wrapping for long location text)
        max_text_w = FLYER_WIDTH - text_x - margin
        text_lines = wrap_text(text, font, max_text_w)
        draw.text((text_x, y), text_lines[0], fill=color, font=font)
        if len(text_lines) > 1:
            draw.text((text_x, y + 32), text_lines[1], fill=color, font=font)
            y += 32

        y += item_height

    content_y = card_bottom + 30

    # ===== DESCRIPTION =====
    description = event.get("description", "")
    if description and content_y < FLYER_HEIGHT - 180:
        # Divider line
        draw.line([(margin, content_y), (FLYER_WIDTH - margin, content_y)], fill=(40, 40, 40), width=1)
        content_y += 20

        desc_lines = wrap_text(description, font_desc, FLYER_WIDTH - margin * 2)
        max_desc_lines = min(5, (FLYER_HEIGHT - 160 - content_y) // 32)
        for i, line in enumerate(desc_lines[:max_desc_lines]):
            draw.text((margin, content_y + i * 32), line, fill=(120, 120, 120), font=font_desc)
        if len(desc_lines) > max_desc_lines:
            # Add ellipsis
            last_y = content_y + (max_desc_lines - 1) * 32
            draw.text((margin, last_y), desc_lines[max_desc_lines - 1] + "...", fill=(120, 120, 120), font=font_desc)

    # ===== BOTTOM BRANDING BAR =====
    bar_height = 70
    draw.rectangle([0, FLYER_HEIGHT - bar_height, FLYER_WIDTH, FLYER_HEIGHT], fill=(18, 18, 18))
    # Accent line above bar
    draw.rectangle([0, FLYER_HEIGHT - bar_height, FLYER_WIDTH, FLYER_HEIGHT - bar_height + 3], fill=ACCENT)

    brand_text = "OKLAHOMA CAR MEETS"
    brand_bbox = font_brand.getbbox(brand_text)
    brand_w = brand_bbox[2] - brand_bbox[0]
    draw.text(((FLYER_WIDTH - brand_w) // 2, FLYER_HEIGHT - bar_height + 22), brand_text, fill=ACCENT, font=font_brand)

    # Convert to bytes
    output = io.BytesIO()
    img.save(output, format="JPEG", quality=88, optimize=True)
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
