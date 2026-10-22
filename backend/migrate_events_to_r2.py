"""
One-off migration: move base64 event photos from MongoDB into Cloudflare R2.

Idempotent and safe to re-run:
  - Only touches photos that are still base64 (http(s) URLs are skipped).
  - Uploads each base64 image to R2, replaces it with the public URL.
  - Updates each event only after its photos were successfully converted.

Run on the server that has the production backend/.env loaded:
    cd /opt/okcarevents/backend
    source venv/bin/activate
    python migrate_events_to_r2.py
"""
import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

import storage  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate_events_to_r2")


async def main():
    if not storage.is_configured():
        logger.error("R2 is not configured (missing R2_* env vars). Aborting.")
        return

    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    cursor = db.events.find(
        {"photos": {"$exists": True, "$ne": []}},
        {"photos": 1},
    )

    scanned = converted_events = converted_photos = 0
    async for event in cursor:
        scanned += 1
        photos = event.get("photos") or []
        if not isinstance(photos, list):
            continue

        new_photos = []
        changed = False
        for p in photos:
            if isinstance(p, str) and p.startswith("http"):
                new_photos.append(p)
                continue
            url = await asyncio.get_event_loop().run_in_executor(None, storage.normalize_photo, p)
            if isinstance(url, str) and url.startswith("http"):
                new_photos.append(url)
                converted_photos += 1
                changed = True
            else:
                new_photos.append(p)  # keep base64 if upload failed; retry next run

        if changed:
            await db.events.update_one(
                {"_id": event["_id"]},
                {"$set": {"photos": new_photos}},
            )
            converted_events += 1
            if converted_events % 25 == 0:
                logger.info(f"...migrated {converted_events} events so far")

    logger.info(
        f"Done. Scanned {scanned} events, migrated {converted_events} events, "
        f"{converted_photos} photos moved to R2."
    )
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
