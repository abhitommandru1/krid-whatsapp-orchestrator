import hashlib
import hmac
import httpx
from app.config import settings

BASE_URL = "https://graph.facebook.com/v20.0"
HEADERS = {
    "Authorization": f"Bearer {settings.whatsapp_token}",
    "Content-Type": "application/json",
}


def verify_signature(payload: bytes, sig_header: str) -> bool:
    # skip check if app secret isn't set (local dev)
    if not settings.whatsapp_app_secret:
        return True
    if not sig_header:
        return False
    expected = "sha256=" + hmac.new(
        settings.whatsapp_app_secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, sig_header)


async def mark_read(message_id: str) -> None:
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{BASE_URL}/{settings.whatsapp_phone_number_id}/messages",
            headers=HEADERS,
            json={
                "messaging_product": "whatsapp",
                "status": "read",
                "message_id": message_id,
            },
        )


async def send_typing(to: str, on: bool = True) -> None:
    # NOTE: Meta's typing indicator auto-expires after ~25s, there's no official
    # "stop" command in the API. Sending type="text" turns it on; we just don't
    # send anything to turn it off — it clears itself once the real message arrives.
    if not on:
        return
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{BASE_URL}/{settings.whatsapp_phone_number_id}/messages",
            headers=HEADERS,
            json={
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to,
                "type": "typing_indicator",
                "typing_indicator": {"type": "text"},
            },
        )


async def send_text(to: str, body: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{BASE_URL}/{settings.whatsapp_phone_number_id}/messages",
            headers=HEADERS,
            json={
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to,
                "type": "text",
                "text": {"body": body, "preview_url": False},
            },
        )
        return r.json()


async def send_image(to: str, url: str, caption: str = "") -> dict:
    # url must be publicly reachable — WA fetches it server-side
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{BASE_URL}/{settings.whatsapp_phone_number_id}/messages",
            headers=HEADERS,
            json={
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to,
                "type": "image",
                "image": {"link": url, "caption": caption},
            },
        )
        return r.json()


async def get_media_url(media_id: str) -> str:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_URL}/{media_id}", headers=HEADERS)
        return r.json().get("url", "")


async def download_media(url: str) -> bytes:
    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers={"Authorization": f"Bearer {settings.whatsapp_token}"})
        return r.content


async def send_document(to: str, url: str, filename: str, caption: str = "") -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{BASE_URL}/{settings.whatsapp_phone_number_id}/messages",
            headers=HEADERS,
            json={
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to,
                "type": "document",
                "document": {"link": url, "filename": filename, "caption": caption},
            },
        )
        return r.json()
