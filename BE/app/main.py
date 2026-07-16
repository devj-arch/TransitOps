import sys
from pathlib import Path

# Ensure BE/ is on sys.path so `app.*` imports work from any CWD
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, dashboard, drivers, expenses, fuel_logs, maintenance, trips, vehicles
from app.routers import settings as settings_router

app = FastAPI(title=settings.APP_NAME, docs_url="/docs", redoc_url="/redoc")

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


@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
