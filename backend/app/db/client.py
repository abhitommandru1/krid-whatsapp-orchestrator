from app.config import settings

_client = None


def get_client():
    global _client
    if _client is None:
        from motor.motor_asyncio import AsyncIOMotorClient
        _client = AsyncIOMotorClient(settings.mongo_uri)
    return _client


def get_db():
    return get_client()[settings.mongo_db_name]
