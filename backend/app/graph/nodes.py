from datetime import datetime, timezone

import anthropic
from langgraph.graph import StateGraph, END

from app.config import settings
from app.db.client import get_db
from app.graph.state import AgentState, MediaAttachment
from app.whatsapp import client as wa


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _save_message(db, tenant_id, phone, direction, text, media=None):
    await db.messages.insert_one({
        "tenant_id": tenant_id,
        "phone": phone,
        "direction": direction,
        "text": text,
        "media": [m.model_dump() for m in (media or [])],
        "timestamp": _now(),
    })


async def _upsert_session(db, tenant_id, phone, status):
    await db.sessions.update_one(
        {"tenant_id": tenant_id, "phone": phone},
        {
            "$set": {"status": status, "updated_at": _now()},
            "$setOnInsert": {"created_at": _now()},
        },
        upsert=True,
    )


# node 1 — fires immediately on inbound, before any LLM call
async def acknowledge_node(state: AgentState) -> AgentState:
    db = get_db()

    # send typing first so user sees activity right away
    await wa.mark_read(state.message_id)
    await wa.send_typing(state.customer_phone)

    await _save_message(db, state.tenant_id, state.customer_phone, "inbound", state.inbound_text)
    await _upsert_session(db, state.tenant_id, state.customer_phone, "AGENT_RESPONDING")

    return state.model_copy(update={"session_status": "AGENT_RESPONDING"})


# node 2 — pulls tenant config + recent history so the LLM has context
async def context_retriever_node(state: AgentState) -> AgentState:
    db = get_db()

    tenant = await db.tenants.find_one({"_id": state.tenant_id})
    if not tenant:
        # fallback so the graph doesn't break if tenant isn't seeded yet
        tenant = {"system_prompt": "You are a helpful assistant.", "media_library": {}}

    # last 5 messages, oldest first
    recent = await db.messages.find(
        {"tenant_id": state.tenant_id, "phone": state.customer_phone},
        sort=[("timestamp", -1)],
        limit=5,
    ).to_list(5)

    return state.model_copy(update={
        "system_prompt": tenant.get("system_prompt", ""),
        "media_library": tenant.get("media_library", {}),
        "history": list(reversed(recent)),
    })


# tool definition for the LLM to call when user wants a file/image
_TOOLS = [
    {
        "name": "send_media",
        "description": (
            "Use this when the customer is asking for a catalog, price list, image, "
            "diagram, invoice, or any visual asset. Pass the matching key from the "
            "tenant media library and an optional caption."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "asset_key": {
                    "type": "string",
                    "description": "Key from the media_library dict, e.g. 'catalog' or 'sofa'",
                },
                "caption": {"type": "string"},
            },
            "required": ["asset_key"],
        },
    }
]


# node 3 — LLM decides reply text and whether to attach media
async def llm_reasoning_node(state: AgentState) -> AgentState:
    llm = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    # build a simple conversation string from history (skip the message we just saved)
    history_lines = [
        f"{'Customer' if m['direction'] == 'inbound' else 'Bot'}: {m['text']}"
        for m in state.history[:-1]
    ]

    system_prompt = (
        f"{state.system_prompt}\n\n"
        f"Media you can share (use send_media tool with one of these keys): "
        f"{list(state.media_library.keys())}\n\n"
        "At the end of your reply, include a hidden sentiment tag like: <!-- sentiment:0.3 --> "
        "where 0.0 means happy and 1.0 means very frustrated. This helps us route escalations."
    )

    messages = []
    if history_lines:
        messages.append({"role": "user", "content": "Previous conversation:\n" + "\n".join(history_lines)})
        messages.append({"role": "assistant", "content": "Got it, I have the context."})
    messages.append({"role": "user", "content": state.inbound_text})

    resp = await llm.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=system_prompt,
        tools=_TOOLS,
        messages=messages,
    )

    reply_text = ""
    attachments = []
    sentiment = 0.0

    for block in resp.content:
        if block.type == "text":
            raw = block.text
            # pull out the sentiment score before showing text to customer
            if "<!-- sentiment:" in raw:
                try:
                    score_str = raw.split("<!-- sentiment:")[1].split("-->")[0].strip()
                    sentiment = float(score_str)
                    raw = raw.split("<!-- sentiment:")[0].strip()
                except Exception:
                    pass
            reply_text = raw

        elif block.type == "tool_use" and block.name == "send_media":
            key = block.input.get("asset_key", "").lower().strip()
            url = state.media_library.get(key)
            if not url:
                continue  # key not found in library, skip silently
            # TODO: support fuzzy matching for keys (e.g. "sofas" → "sofa")
            mtype = "document" if url.lower().endswith(".pdf") else "image"
            attachments.append(MediaAttachment(
                type=mtype,
                url=url,
                filename=f"{key}.pdf" if mtype == "document" else "",
                caption=block.input.get("caption", ""),
            ))

    new_status = "NEEDS_HUMAN" if sentiment >= 0.75 else state.session_status

    return state.model_copy(update={
        "reply_text": reply_text,
        "attachments": attachments,
        "sentiment_score": sentiment,
        "session_status": new_status,
    })


# node 4 — sends the actual reply(s) and logs to DB
async def dispatcher_node(state: AgentState) -> AgentState:
    db = get_db()

    if state.session_status == "NEEDS_HUMAN":
        # don't send anything, just flag it so dashboard shows the alert
        await _upsert_session(db, state.tenant_id, state.customer_phone, "NEEDS_HUMAN")
        return state

    if state.reply_text:
        await wa.send_text(state.customer_phone, state.reply_text)

    for att in state.attachments:
        if att.type == "image":
            await wa.send_image(state.customer_phone, att.url, att.caption)
        else:
            await wa.send_document(state.customer_phone, att.url, att.filename or "document.pdf", att.caption)

    await _save_message(db, state.tenant_id, state.customer_phone,
                        "outbound", state.reply_text, state.attachments)
    await _upsert_session(db, state.tenant_id, state.customer_phone, "RESOLVED")

    return state.model_copy(update={"session_status": "RESOLVED"})


def _route_after_llm(state: AgentState) -> str:
    if state.session_status == "NEEDS_HUMAN":
        return END
    return "dispatcher"


def build_graph():
    g = StateGraph(AgentState)

    g.add_node("acknowledge", acknowledge_node)
    g.add_node("context_retriever", context_retriever_node)
    g.add_node("llm_reasoning", llm_reasoning_node)
    g.add_node("dispatcher", dispatcher_node)

    g.set_entry_point("acknowledge")
    g.add_edge("acknowledge", "context_retriever")
    g.add_edge("context_retriever", "llm_reasoning")
    g.add_conditional_edges("llm_reasoning", _route_after_llm, {"dispatcher": "dispatcher", END: END})
    g.add_edge("dispatcher", END)

    return g.compile()


# built lazily on first request so import doesn't block startup
_graph = None

def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph
