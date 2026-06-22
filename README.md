# Krid.AI — Multi-Tenant WhatsApp AI Orchestrator

A production-ready SaaS platform that connects multiple businesses to an AI-powered WhatsApp support and sales agent. Each tenant gets an isolated conversation history, custom system prompt, and media library. The admin dashboard provides real-time visibility into all conversations.

**Live URLs**
- Frontend Dashboard: https://krid-whatsapp-orchestrator.onrender.com
- Backend API: https://krid-backend-6m15.onrender.com
- GitHub: https://github.com/abhitommandru1/krid-whatsapp-orchestrator

Two demo tenants (a furniture store and an auto care shop) share the same backend but get completely separate system prompts, media libraries, and conversation histories.

---

## How it works

Incoming WhatsApp messages hit a FastAPI webhook. The server returns `200 OK` immediately (Meta will retry if you don't respond within ~3s), then hands the message off to a LangGraph pipeline running in the background.

The pipeline has 4 nodes:

```
[Acknowledge]  →  mark message as read, fire typing indicator
      ↓
[Context Retriever]  →  pull tenant's system prompt + last 5 messages from Mongo
      ↓
[LLM Reasoning]  →  Claude decides: plain text reply, or attach an image/PDF via tool call
      ↓
[Dispatcher]  →  send the reply(s) to WhatsApp, save to DB
```

If the LLM detects a frustrated customer (sentiment score ≥ 0.75), the graph skips the dispatcher and flips the session to `NEEDS_HUMAN` — the dashboard highlights it in red and auto-replies stop.

One thing I noticed while building this: Meta's typing indicator API doesn't have a "stop" command. It auto-clears once the real message arrives. So `send_typing(on=False)` is basically a no-op — the typing bubble goes away on its own.

---

## Stack

- **Backend:** FastAPI + LangGraph + Motor (async MongoDB)
- **LLM:** Anthropic Claude Haiku (`claude-haiku-4-5-20251001`)
- **DB:** MongoDB Atlas (M0 free tier)
- **Frontend:** React + Vite + Tailwind CSS
- **Deploy:** Render (Docker backend + Static Site frontend)

---

## Local setup

### 1. Backend

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\Activate.ps1
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# fill in .env (see section below)

uvicorn app.main:app --reload --port 8000
```

Check `http://localhost:8000/health` — should return `{"status":"ok"}`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Opens at `http://localhost:5173`.

### 3. Seed the database

Run this once after your `.env` is filled in:

```bash
cd backend
python seed.py
```

Creates Tenant A (Luxury Furniture) and Tenant B (Automotive Care) with their media libraries.

---

## Environment variables

Copy `backend/.env.example` → `backend/.env`:

```env
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGO_DB_NAME=krid_whatsapp

WHATSAPP_TOKEN=<system_user_token>
WHATSAPP_PHONE_NUMBER_ID=<phone_number_id>
WHATSAPP_VERIFY_TOKEN=<any_string_you_pick>
WHATSAPP_APP_SECRET=<meta_app_secret>

ANTHROPIC_API_KEY=sk-ant-...
```

> **Heads up on the WhatsApp token:** the temporary token shown in the Meta dashboard expires in 24 hours. Generate a permanent one through a System User in Meta Business Manager — otherwise your bot stops working mid-demo.

---

## Testing the webhook locally (ngrok)

```bash
ngrok http 127.0.0.1:8000
```

> **Windows note:** Use `127.0.0.1:8000` not `localhost:8000`. On Windows 11, `localhost` resolves to IPv6 (`::1`) but uvicorn listens on IPv4 only, causing ngrok to 502.

Take the `https://xxxx.ngrok-free.app` URL and go to:

**Meta Developer Dashboard → WhatsApp → Configuration → Webhook**

- Callback URL: `https://xxxx.ngrok-free.app/api/webhooks/whatsapp`
- Verify token: whatever you set as `WHATSAPP_VERIFY_TOKEN`
- Hit **Verify and Save**, then subscribe to the `messages` field

Send a message from your personal WhatsApp to the test number and watch the logs.

---

## Deployment (Render)

### Backend

1. Push to GitHub
2. New Web Service on [Render](https://render.com)
3. Root directory: `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add all env vars from `.env`

### Frontend

1. New Static Site on Render
2. Root directory: `frontend`
3. Build command: `npm install && npm run build`
4. Publish directory: `dist`
5. Add env var: `VITE_API_URL=https://your-backend.onrender.com/api`

Update the Meta webhook callback URL to your live backend URL.

---

## LangGraph state

```python
class AgentState(BaseModel):
    # set by the webhook
    tenant_id: str
    customer_phone: str
    message_id: str
    inbound_text: str

    # filled by Context Retriever
    system_prompt: str
    media_library: dict[str, str]   # e.g. {"catalog": "https://...pdf"}
    history: list[dict]             # last 5 messages

    # filled by LLM Reasoning
    reply_text: str
    attachments: list[MediaAttachment]
    sentiment_score: float          # 0.0 = happy, 1.0 = frustrated

    # updated across nodes
    session_status: "WAITING_FOR_BOT" | "AGENT_RESPONDING" | "RESOLVED" | "NEEDS_HUMAN"
```

Routing: after the LLM node, if `session_status == NEEDS_HUMAN` the graph ends without sending anything. Otherwise it goes to the Dispatcher.

---

## Bonus Features Implemented

- **Webhook Signature Validation** — every inbound `POST /api/webhooks/whatsapp` verifies the `X-Hub-Signature-256` HMAC-SHA256 header using `WHATSAPP_APP_SECRET`. Requests that fail verification return `403 Forbidden`.
- **Fallback Human Handover** — the LLM embeds a hidden sentiment tag (`<!-- sentiment:0.8 -->`) in its reply. If the score is ≥ 0.75, the graph skips the dispatcher, sets `session_status = NEEDS_HUMAN`, and highlights the conversation red on the dashboard. Auto-replies are halted until a human intervenes.
- **Rich Media via Tool Calling** — Claude uses the `send_media` tool to decide when to attach a PDF catalog or product image based on what the customer is asking for.

---

## Project structure

```
backend/
  app/
    main.py              # FastAPI app, CORS, router registration
    config.py            # env vars via pydantic-settings
    db/
      client.py          # motor async client
      seed.py            # one-time tenant seeding
    whatsapp/
      client.py          # all Meta Graph API calls
    graph/
      state.py           # AgentState + MediaAttachment models
      nodes.py           # 4 nodes + graph compilation
    api/
      webhooks.py        # GET verify + POST inbound
      dashboard.py       # REST endpoints for the frontend

frontend/
  src/
    App.jsx
    components/
      TenantSwitcher.jsx
      SessionList.jsx
      ChatThread.jsx       # typing indicator, image previews, PDF badges
      BroadcastDrawer.jsx
```
