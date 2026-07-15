"""Dashboard and analytics — role-scoped per RBAC.md."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_roles
from app.services import report_service
from app.utils.enums import Role

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# ── Role sets ────────────────────────────────────────────────────────────────
ALL_ROLES = [
    Role.ADMIN.value,
    Role.FLEET_MANAGER.value,
    Role.DISPATCHER.value,
    Role.SAFETY_OFFICER.value,
    Role.FINANCIAL_ANALYST.value,
]
FLEET_ROLES = [Role.ADMIN.value, Role.FLEET_MANAGER.value]
SAFETY_ROLES = [Role.ADMIN.value, Role.SAFETY_OFFICER.value]
FINANCE_ROLES = [Role.ADMIN.value, Role.FINANCIAL_ANALYST.value]


# ── Shared KPIs (all roles) ──────────────────────────────────────────────────

@router.get("/kpis")
def get_kpis(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*ALL_ROLES)),
):
    """Dashboard KPI cards — vehicle counts, trip counts, utilization."""
    return report_service.get_dashboard_kpis(db)


# ── Fleet analytics (Fleet Manager) ──────────────────────────────────────────

@router.get("/analytics/fleet")
def get_fleet_analytics(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*FLEET_ROLES)),
):
    """Fleet metrics: vehicles by status, maintenance stats, utilization."""
    return report_service.get_fleet_analytics(db)


# ── Safety analytics (Safety Officer) ────────────────────────────────────────

@router.get("/analytics/safety")
def get_safety_analytics(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*SAFETY_ROLES)),
):
    """Safety metrics: driver compliance, license expiry, safety scores."""
    return report_service.get_safety_analytics(db)


# ── Finance analytics (Financial Analyst) ────────────────────────────────────

@router.get("/analytics/finance")
def get_finance_analytics(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*FINANCE_ROLES)),
):
    """Finance metrics: operational costs, fuel efficiency, ROI summary."""
    return report_service.get_finance_analytics(db)


@router.get("/vehicles/{vehicle_id}/operational-cost")
def get_vehicle_operational_cost(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*FINANCE_ROLES)),
):
    return report_service.get_operational_cost(db, vehicle_id)


@router.get("/vehicles/{vehicle_id}/roi")
def get_vehicle_roi(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*FINANCE_ROLES)),
):
    return report_service.get_vehicle_roi(db, vehicle_id)


@router.get("/vehicles/{vehicle_id}/fuel-efficiency")
def get_vehicle_fuel_efficiency(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*FINANCE_ROLES)),
):
    return report_service.get_fuel_efficiency(db, vehicle_id)
