"""
Backend tests for Cloudflare R2 image migration & backward-compatibility.

Covers:
- POST /api/upload (multipart) -> R2 public URL
- POST /api/events (base64 photos) -> stored as R2 URLs
- PUT  /api/events/{id} (base64 photos) -> URLs
- GET  /api/events (no base64 in payload)
- GET  /api/events/{id} (no base64)
- GET  /api/events/{id}/photo/{i}/image.jpg -> JPEG or gray placeholder
- Startup indexes: admin login still works
- Health check
"""
import os
import io
import base64
import json
from uuid import uuid4

import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://event-hub-okc-1.preview.emergentagent.com").rstrip("/")

ADMIN_EMAIL = "admin@okcarevents.com"
ADMIN_PASSWORD = "admin123"

# ---------- helpers ----------

def _make_jpeg_bytes(w=20, h=20, color=(200, 50, 50)) -> bytes:
    img = Image.new("RGB", (w, h), color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return buf.getvalue()

def _jpeg_data_uri() -> str:
    raw = _make_jpeg_bytes()
    return "data:image/jpeg;base64," + base64.b64encode(raw).decode("ascii")

def _is_base64_blob(s: str) -> bool:
    if not isinstance(s, str):
        return False
    return s.startswith("data:") or (len(s) > 500 and "/" not in s[:20] and ":" not in s[:20])

def _is_http_url(s: str) -> bool:
    return isinstance(s, str) and (s.startswith("http://") or s.startswith("https://"))


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Accept": "application/json"})
    return s


@pytest.fixture(scope="module")
def created_event_ids():
    ids = []
    yield ids
    # cleanup
    for eid in ids:
        try:
            requests.delete(f"{BASE_URL}/api/events/{eid}", timeout=15)
        except Exception:
            pass


# ---------- 1. Health & startup ----------

class TestHealthAndStartup:
    def test_health_ok(self, api):
        r = api.get(f"{BASE_URL}/api/health", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("status") == "ok"
        assert data.get("db") == "connected"

    def test_admin_login_after_index_creation(self, api):
        """Verifies startup ensure_indexes() did not break user auth (users.email index)."""
        r = api.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=20,
        )
        assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
        data = r.json()
        # tolerate either {user:{...}} or flat user payload
        user = data.get("user") or data
        assert user.get("email") == ADMIN_EMAIL
        assert user.get("isAdmin") is True


# ---------- 2. POST /api/upload (multipart) ----------

class TestUploadEndpoint:
    def test_upload_returns_r2_https_url(self, api):
        files = {"file": (f"test_{uuid4().hex}.jpg", _make_jpeg_bytes(), "image/jpeg")}
        r = api.post(f"{BASE_URL}/api/upload", files=files, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        url = data.get("url")
        assert url and url.startswith("https://"), f"Expected https R2 URL, got: {url}"
        # Should match R2_PUBLIC_BASE_URL prefix
        assert "r2.dev" in url or "pub-" in url, f"Not an R2 public URL: {url}"

        # Publicly fetch it
        head = requests.get(url, timeout=30)
        assert head.status_code == 200, f"R2 URL not publicly fetchable: {head.status_code}"
        ct = head.headers.get("content-type", "")
        assert ct.startswith("image/"), f"R2 URL did not return an image: {ct}"
        assert len(head.content) > 50

    def test_upload_rejects_non_image_415(self, api):
        files = {"file": ("test.txt", b"hello world not an image", "text/plain")}
        r = api.post(f"{BASE_URL}/api/upload", files=files, timeout=20)
        assert r.status_code == 415, f"Expected 415 for non-image, got {r.status_code}: {r.text}"

    def test_upload_rejects_empty_400(self, api):
        files = {"file": ("empty.jpg", b"", "image/jpeg")}
        r = api.post(f"{BASE_URL}/api/upload", files=files, timeout=20)
        assert r.status_code == 400, f"Expected 400 for empty file, got {r.status_code}: {r.text}"


# ---------- 3. POST /api/events (base64 -> R2) ----------

def _event_payload(photos):
    return {
        "title": f"TEST_R2_Event_{uuid4().hex[:8]}",
        "description": "Backend R2 migration test event",
        "date": "2026-06-15",
        "time": "6:00 PM",
        "location": "Test Venue",
        "address": "123 Test St",
        "city": "Oklahoma City",
        "organizer": "TEST",
        "entryFee": "Free",
        "carTypes": ["All"],
        "eventType": "Car Meet",
        "photos": photos,
    }


class TestEventCreateWithBase64:
    def test_create_event_converts_base64_to_r2_url(self, api, created_event_ids):
        payload = _event_payload([_jpeg_data_uri()])
        r = api.post(f"{BASE_URL}/api/events", json=payload, timeout=60)
        assert r.status_code == 200, r.text
        ev = r.json()
        assert ev.get("id")
        created_event_ids.append(ev["id"])
        photos = ev.get("photos") or []
        assert len(photos) == 1, f"photos length wrong: {photos}"
        p0 = photos[0]
        assert _is_http_url(p0), f"photo[0] not an http(s) URL: {p0[:120]}"
        assert not p0.startswith("data:"), "photo[0] still a data-URI"
        assert "r2.dev" in p0 or "/api/events/" in p0, f"Unexpected photo URL: {p0}"
        # Event is pending approval (user-submitted)
        assert ev.get("isApproved") is False

    def test_create_event_response_has_no_base64(self, api, created_event_ids):
        payload = _event_payload([_jpeg_data_uri(), _jpeg_data_uri()])
        r = api.post(f"{BASE_URL}/api/events", json=payload, timeout=60)
        assert r.status_code == 200, r.text
        ev = r.json()
        created_event_ids.append(ev["id"])
        raw = json.dumps(ev)
        assert "data:image" not in raw, "Response contains data: URI"
        # No huge strings (base64 jpeg is typically >1KB)
        for p in ev.get("photos", []):
            assert len(p) < 500 or _is_http_url(p), f"Suspiciously long non-URL photo: {p[:80]}"


# ---------- 4. PUT /api/events/{id} (base64 -> URL) ----------

class TestEventUpdateWithBase64:
    def test_update_event_converts_base64_to_url(self, api, created_event_ids):
        # Create first with no photos
        r = api.post(f"{BASE_URL}/api/events", json=_event_payload([]), timeout=60)
        assert r.status_code == 200
        ev = r.json()
        eid = ev["id"]
        created_event_ids.append(eid)

        # Update with base64 photo
        update = {"photos": [_jpeg_data_uri()]}
        r2 = api.put(f"{BASE_URL}/api/events/{eid}", json=update, timeout=60)
        assert r2.status_code == 200, r2.text
        updated = r2.json()
        photos = updated.get("photos") or []
        assert len(photos) == 1
        assert _is_http_url(photos[0]), f"Updated photo is not URL: {photos[0][:120]}"
        assert not photos[0].startswith("data:")


# ---------- 5. GET /api/events (list) ----------

class TestEventsListNoBase64:
    def test_list_contains_zero_base64(self, api):
        r = api.get(f"{BASE_URL}/api/events", timeout=60)
        assert r.status_code == 200, r.text
        body = r.text
        assert "data:image" not in body, "events list contains base64 data URIs"
        events = r.json()
        assert isinstance(events, list)
        for ev in events:
            for p in ev.get("photos", []) or []:
                assert _is_http_url(p), f"Non-URL photo in list for event {ev.get('id')}: {str(p)[:80]}"
        # Payload should be small — well below the old 16MB
        size_mb = len(body) / (1024 * 1024)
        assert size_mb < 5, f"events list payload is unexpectedly large: {size_mb:.2f} MB"


# ---------- 6. GET /api/events/{id} ----------

class TestEventDetailNoBase64:
    def test_detail_no_base64(self, api, created_event_ids):
        assert created_event_ids, "No test event created to detail-fetch"
        eid = created_event_ids[0]
        r = api.get(f"{BASE_URL}/api/events/{eid}", timeout=30)
        assert r.status_code == 200, r.text
        assert "data:image" not in r.text
        ev = r.json()
        for p in ev.get("photos", []) or []:
            assert _is_http_url(p)


# ---------- 7. GET /api/events/{id}/photo/{index}/image.jpg ----------

class TestPhotoServeEndpoint:
    def test_photo_image_jpg_returns_jpeg_or_placeholder(self, api, created_event_ids):
        """Any valid event id serves image/jpeg (either real base64 fallback or placeholder)."""
        assert created_event_ids
        eid = created_event_ids[0]
        r = api.get(f"{BASE_URL}/api/events/{eid}/photo/0/image.jpg", timeout=30)
        assert r.status_code == 200, f"Status {r.status_code}: {r.text[:200]}"
        assert r.headers.get("content-type", "").startswith("image/jpeg"), r.headers
        assert len(r.content) > 10

    def test_photo_image_jpg_invalid_id_returns_placeholder(self, api):
        r = api.get(f"{BASE_URL}/api/events/not-an-oid/photo/0/image.jpg", timeout=30)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/jpeg")

    def test_photo_image_jpg_out_of_range_returns_placeholder(self, api, created_event_ids):
        eid = created_event_ids[0]
        r = api.get(f"{BASE_URL}/api/events/{eid}/photo/99/image.jpg", timeout=30)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/jpeg")
