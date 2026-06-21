import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

async def main():
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.mongo_db_name]
    msgs = await db.messages.find({}, sort=[("timestamp", -1)], limit=3).to_list(3)
    for m in msgs:
        print(m.get("direction"), "|", m.get("text", "")[:60], "|", m.get("tenant_id"))

asyncio.run(main())
