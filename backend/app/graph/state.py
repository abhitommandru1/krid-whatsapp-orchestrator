from typing import Any, Literal
from pydantic import BaseModel


class MediaAttachment(BaseModel):
    type: Literal["image", "document"]
    url: str
    filename: str = ""
    caption: str = ""


class AgentState(BaseModel):
    # inbound
    tenant_id: str
    customer_phone: str
    message_id: str
    inbound_text: str

    # filled by Context Retriever
    system_prompt: str = ""
    media_library: dict[str, str] = {}
    history: list[dict[str, Any]] = []

    # filled by LLM Reasoning
    reply_text: str = ""
    attachments: list[MediaAttachment] = []
    sentiment_score: float = 0.0  # 0=happy, 1=frustrated

    # session status
    session_status: Literal[
        "WAITING_FOR_BOT", "AGENT_RESPONDING", "RESOLVED", "NEEDS_HUMAN"
    ] = "WAITING_FOR_BOT"
