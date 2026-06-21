from fastapi import APIRouter
from app.db.client import get_db

router = APIRouter()


@router.get("/tenants")
async def list_tenants():
    db = get_db()
    tenants = await db.tenants.find({}, {"system_prompt": 0}).to_list(100)
    for t in tenants:
        t["id"] = t.pop("_id")
    return tenants


@router.get("/tenants/{tenant_id}/sessions")
async def list_sessions(tenant_id: str):
    db = get_db()
    sessions = await db.sessions.find(
        {"tenant_id": tenant_id}, sort=[("updated_at", -1)]
    ).to_list(100)
    for s in sessions:
        s["id"] = str(s.pop("_id"))
    return sessions


@router.get("/tenants/{tenant_id}/messages/{phone}")
async def get_messages(tenant_id: str, phone: str):
    db = get_db()
    msgs = await db.messages.find(
        {"tenant_id": tenant_id, "phone": phone},
        sort=[("timestamp", 1)],
    ).to_list(200)
    for m in msgs:
        m["id"] = str(m.pop("_id"))
    return msgs


@router.post("/tenants/{tenant_id}/broadcast")
async def broadcast(tenant_id: str, body: dict):
    """
    Stub endpoint for broadcast campaigns.
    body: { "phones": [...], "template": "..." }
    In production, call the WhatsApp template message API per phone.
    """
    phones = body.get("phones", [])
    template = body.get("template", "")
    return {"queued": len(phones), "template": template, "tenant_id": tenant_id}
