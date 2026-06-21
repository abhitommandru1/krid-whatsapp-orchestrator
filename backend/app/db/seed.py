"""Run once to pre-seed Tenant A and Tenant B."""
import asyncio
from app.db.client import get_db


TENANTS = [
    {
        "_id": "tenant_a",
        "name": "Luxury Furniture Store",
        "system_prompt": (
            "You are a luxury furniture sales assistant. Be elegant and helpful. "
            "When customers ask about products, offer to share catalogs or showroom images."
        ),
        "media_library": {
            "catalog": "https://www.w3.org/WAI/WCAG21/Techniques/pdf/pdf-sample.pdf",
            "sofa": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800",
            "chair": "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800",
            "table": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800",
        },
    },
    {
        "_id": "tenant_b",
        "name": "Automotive Care",
        "system_prompt": (
            "You are an automotive service assistant. Be professional and concise. "
            "Help customers schedule service appointments and provide repair information."
        ),
        "media_library": {
            "invoice": "https://www.w3.org/WAI/WCAG21/Techniques/pdf/pdf-sample.pdf",
            "diagram": "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800",
            "price list": "https://www.w3.org/WAI/WCAG21/Techniques/pdf/pdf-sample.pdf",
        },
    },
]


async def seed():
    db = get_db()
    for tenant in TENANTS:
        await db.tenants.update_one(
            {"_id": tenant["_id"]}, {"$set": tenant}, upsert=True
        )
        print(f"Seeded tenant: {tenant['name']}")


if __name__ == "__main__":
    asyncio.run(seed())
