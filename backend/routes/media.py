"""Generic image upload endpoint — stores to Cloudflare R2, returns a public URL.

Used by newer app clients to upload images directly instead of embedding
base64 in create/update payloads. Reads are served by the R2 CDN, never here.
"""
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.concurrency import run_in_threadpool

import storage

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_BYTES = 15 * 1024 * 1024


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    if not storage.is_configured():
        raise HTTPException(status_code=503, detail="Image storage not configured")

    content_type = (file.content_type or "image/jpeg").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="An image file is required")

    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image too large (max 15MB)")

    try:
        url = await run_in_threadpool(storage.upload_bytes, data, content_type)
    except Exception as e:
        logger.error(f"R2 upload failed: {e}")
        raise HTTPException(status_code=502, detail="Image storage failed")

    return {"url": url}
