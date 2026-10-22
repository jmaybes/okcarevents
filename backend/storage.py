"""
Cloudflare R2 object storage for images.

Images are uploaded to R2 and served to clients via public CDN URLs
(R2_PUBLIC_BASE_URL) — reads never pass through this backend.

Backward compatible: older app clients still send base64; we upload that
base64 to R2 on write and store only the URL. If R2 is unavailable or a key
is missing, helpers fail SAFE by returning the original value so nothing breaks.
"""
import os
import re
import hashlib
import logging
from io import BytesIO
from uuid import uuid4

logger = logging.getLogger(__name__)

R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID", "").strip()
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID", "").strip()
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY", "").strip()
R2_BUCKET = os.environ.get("R2_BUCKET", "").strip()
R2_PUBLIC_BASE_URL = os.environ.get("R2_PUBLIC_BASE_URL", "").strip().rstrip("/")

_EXT_BY_TYPE = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

_DATA_URI = re.compile(r"^data:(image/[\w.+-]+);base64,(.*)$", re.S)

# Per-process dedupe cache: sha256(bytes) -> url. Avoids re-uploading the same
# image repeatedly during migration/writes within a worker.
_hash_cache: dict[str, str] = {}

_client = None


def is_configured() -> bool:
    return bool(R2_ACCOUNT_ID and R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY and R2_BUCKET and R2_PUBLIC_BASE_URL)


def _get_client():
    global _client
    if _client is not None:
        return _client
    import boto3
    from botocore.config import Config
    _client = boto3.client(
        "s3",
        endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name="auto",
        config=Config(retries={"max_attempts": 3, "mode": "standard"}),
    )
    return _client


def upload_bytes(data: bytes, content_type: str = "image/jpeg") -> str:
    """Upload raw bytes to R2 and return the public URL. Raises on failure."""
    if not is_configured():
        raise RuntimeError("R2 not configured")

    content_type = (content_type or "image/jpeg").lower()
    if content_type not in _EXT_BY_TYPE:
        content_type = "image/jpeg"

    digest = hashlib.sha256(data).hexdigest()
    if digest in _hash_cache:
        return _hash_cache[digest]

    ext = _EXT_BY_TYPE[content_type]
    key = f"streetmotion/{uuid4().hex}{ext}"
    _get_client().upload_fileobj(
        BytesIO(data),
        R2_BUCKET,
        key,
        ExtraArgs={
            "ContentType": content_type,
            "CacheControl": "public, max-age=31536000, immutable",
        },
    )
    url = f"{R2_PUBLIC_BASE_URL}/{key}"
    _hash_cache[digest] = url
    return url


def upload_data_uri(value: str) -> str | None:
    """Decode a base64 / data-URI image string, upload to R2, return URL.

    Returns None if the value isn't decodable (caller keeps the original)."""
    if not value or not isinstance(value, str):
        return None
    content_type = "image/jpeg"
    b64 = value
    m = _DATA_URI.match(value)
    if m:
        content_type, b64 = m.group(1), m.group(2)
    elif value.startswith("data:"):
        return None  # malformed data uri
    try:
        import base64 as _b64
        raw = _b64.b64decode(b64, validate=False)
        if len(raw) < 100:
            return None
        return upload_bytes(raw, content_type)
    except Exception as e:
        logger.warning(f"upload_data_uri decode/upload failed: {e}")
        return None


def normalize_photo(value: str) -> str:
    """Return an http(s) URL for a photo value.

    - Already an http(s) URL -> returned unchanged.
    - base64 / data-URI -> uploaded to R2, URL returned.
    - On any failure -> original value returned (fail safe, nothing breaks)."""
    if not value or not isinstance(value, str):
        return value
    if value.startswith("http://") or value.startswith("https://"):
        return value
    try:
        url = upload_data_uri(value)
        return url or value
    except Exception as e:
        logger.warning(f"normalize_photo failed, keeping original: {e}")
        return value


def normalize_photos(photos):
    """Normalize a list of photo strings to URLs (base64 -> R2). Fail safe."""
    if not photos or not isinstance(photos, list):
        return photos
    if not is_configured():
        return photos
    out = []
    for p in photos:
        try:
            out.append(normalize_photo(p))
        except Exception:
            out.append(p)
    return out
