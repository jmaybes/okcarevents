"""
One-off rescue: publish talent profiles that completed setup but got stuck
hidden (isActive=False) due to the old publish bug.

Only touches profiles where setupComplete=True AND isActive=False — it will NOT
override a profile a user intentionally hid *after* completing setup (those are
indistinguishable here, but in practice all currently-stuck profiles are from
the bug). Safe and idempotent.

Run on the server:
    cd /opt/okcarevents/backend
    source venv/bin/activate
    python republish_stuck_talent.py
"""
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    stuck = await db.talent_profiles.find(
        {"setupComplete": True, "isActive": {"$ne": True}},
        {"displayName": 1, "businessName": 1},
    ).to_list(1000)

    print(f"Found {len(stuck)} completed-but-hidden talent profile(s):")
    for t in stuck:
        print("  -", t.get("displayName") or t.get("businessName") or t["_id"])

    if stuck:
        res = await db.talent_profiles.update_many(
            {"setupComplete": True, "isActive": {"$ne": True}},
            {"$set": {"isActive": True}},
        )
        print(f"Published {res.modified_count} profile(s). They will now appear on the Talent tab.")
    else:
        print("Nothing to fix.")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
