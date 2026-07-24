import sys
from pathlib import Path

# Ensure BE/ is on sys.path so `app.*` imports work from any CWD
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import logging

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.security import decode_access_token
from app.core.websocket_manager import manager
from app.routers import auth, dashboard, drivers, expenses, fuel_logs, maintenance, trips, vehicles
from app.routers import settings as settings_router


logger = logging.getLogger(__name__)

app = FastAPI(title=settings.APP_NAME, docs_url="/docs", redoc_url="/redoc")

from app.core.websocket_manager import set_main_loop

# TODO: migrate to lifespan handler when ready (on_event is deprecated)
@app.on_event("startup")
async def startup_event():
    import asyncio
    set_main_loop(asyncio.get_event_loop())

    from app.services.license_checker import start_license_checker
    asyncio.create_task(start_license_checker(interval_seconds=3600))

# CORS — allow the configured frontend origin + localhost dev server
_frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").strip()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_frontend_url, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(vehicles.router)
app.include_router(drivers.router)
app.include_router(trips.router)
app.include_router(maintenance.router)
app.include_router(fuel_logs.router)
app.include_router(expenses.router)
app.include_router(dashboard.router)
app.include_router(settings_router.router)


# ── WebSocket ────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
):
    """WebSocket connection endpoint. Clients connect with ws://host/ws?token=<jwt>"""
    try:
        payload = decode_access_token(token)
        role: str | None = payload.get("role")
        user_id: str | None = payload.get("sub")
        if not role or not user_id:
            await websocket.close(code=1008)
            return
    except Exception:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, role)

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await manager.disconnect(websocket, role)
        logger.info("WS disconnected: user_id=%s role=%s", user_id, role)


@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME}


@app.on_event("startup")
async def startup_event():
    import asyncio
    from app.services.license_checker import start_license_checker
    asyncio.create_task(start_license_checker(interval_seconds=3600))
