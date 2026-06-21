from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request, Response

from app.config import settings
from app.graph.nodes import get_graph
from app.graph.state import AgentState
from app.whatsapp.client import verify_signature

router = APIRouter()

# TODO: move this mapping to the tenants collection so adding a new tenant
# doesn't require a code change and redeploy
PHONE_ID_TO_TENANT: dict[str, str] = {
    settings.whatsapp_phone_number_id: "tenant_a",
}


async def _run_agent(state: AgentState):
    print(f"[agent] starting for {state.customer_phone}")
    try:
        await get_graph().ainvoke(state)
        print(f"[agent] done for {state.customer_phone}")
    except BaseException as e:
        import traceback
        print(f"[agent] error processing {state.customer_phone}: {type(e).__name__}: {e}")
        traceback.print_exc()


@router.get("/webhooks/whatsapp")
async def verify_webhook(
    hub_mode: str = Query(alias="hub.mode"),
    hub_challenge: str = Query(alias="hub.challenge"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
):
    if hub_mode == "subscribe" and hub_verify_token == settings.whatsapp_verify_token:
        return Response(content=hub_challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Forbidden")


@router.post("/webhooks/whatsapp")
async def inbound_webhook(request: Request, background_tasks: BackgroundTasks):
    body_bytes = await request.body()

    sig = request.headers.get("X-Hub-Signature-256", "")
    if not verify_signature(body_bytes, sig):
        raise HTTPException(status_code=403, detail="Invalid signature")

    payload = await request.json()

    try:
        changes = payload["entry"][0]["changes"][0]["value"]

        # status updates (delivered, read receipts) don't have "messages" — skip them
        if "messages" not in changes:
            return {"status": "ok"}

        phone_number_id = changes["metadata"]["phone_number_id"]
        msg = changes["messages"][0]

        state = AgentState(
            tenant_id=PHONE_ID_TO_TENANT.get(phone_number_id, "tenant_a"),
            customer_phone=msg["from"],
            message_id=msg["id"],
            inbound_text=msg.get("text", {}).get("body", ""),
        )

        # critical: kick off async, return 200 immediately
        # Meta will retry if we don't respond within ~3s
        background_tasks.add_task(_run_agent, state)

    except (KeyError, IndexError):
        pass

    return {"status": "ok"}
