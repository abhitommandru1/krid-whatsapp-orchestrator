import asyncio
from app.graph.nodes import get_graph
from app.graph.state import AgentState

async def main():
    state = AgentState(
        tenant_id="tenant_a",
        customer_phone="919182830213",
        message_id="test_media_001",
        inbound_text="Can you send me your furniture catalog and a sofa image?",
    )
    result = await get_graph().ainvoke(state)
    print("Reply:", result.get("reply_text", "")[:100])
    print("Attachments:", result.get("attachments", []))
    print("Status:", result.get("session_status", ""))

asyncio.run(main())
