from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.webhooks import router as webhook_router
from app.api.dashboard import router as dashboard_router

app = FastAPI(title="Krid WhatsApp Orchestrator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhook_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
