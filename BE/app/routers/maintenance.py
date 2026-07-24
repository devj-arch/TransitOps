"""Maintenance routes — read/write split per RBAC.md."""


from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import AppException
from app.core.websocket_manager import broadcast_safe
from app.dependencies.auth import require_roles
from app.models.maintenance_log import MaintenanceLog
from app.schemas.maintenance_log import (
    MaintenanceLogCreate,
    MaintenanceLogOut,
    MaintenanceLogUpdate,
)
from app.services import maintenance_service
from app.utils.enums import Role

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

# ── Role sets ────────────────────────────────────────────────────────────────
READ_ROLES = [
    Role.ADMIN.value,
    Role.FLEET_MANAGER.value,
    Role.SAFETY_OFFICER.value,
    Role.FINANCIAL_ANALYST.value,
]
WRITE_ROLES = [Role.ADMIN.value, Role.FLEET_MANAGER.value]


# ── Read endpoints ───────────────────────────────────────────────────────────

@router.get("/", response_model=list[MaintenanceLogOut])
def list_maintenance_logs(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*READ_ROLES)),
):
    return db.query(MaintenanceLog).order_by(MaintenanceLog.created_at.desc()).all()


@router.get("/{log_id}", response_model=MaintenanceLogOut)
def get_maintenance_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*READ_ROLES)),
):
    log = db.query(MaintenanceLog).filter(MaintenanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance log not found.")
    return log


# ── Write endpoints ──────────────────────────────────────────────────────────

@router.post("/", response_model=MaintenanceLogOut, status_code=status.HTTP_201_CREATED)
def create_maintenance_log(
    data: MaintenanceLogCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*WRITE_ROLES)),
):
    try:
        log = maintenance_service.open_maintenance(db, data.model_dump())
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    broadcast_safe(
        "maintenance_opened",
        {"maintenance_id": log.id, "vehicle_id": log.vehicle_id, "description": log.description}
    )
    broadcast_safe(
        "vehicle_status_changed",
        {"vehicle_id": log.vehicle_id, "new_status": "In Shop"}
    )
    return log


@router.patch("/{log_id}", response_model=MaintenanceLogOut)
def update_maintenance_log(
    log_id: int,
    data: MaintenanceLogUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*WRITE_ROLES)),
):
    log = db.query(MaintenanceLog).filter(MaintenanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance log not found.")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(log, field, value)
    db.commit()
    db.refresh(log)
    return log


@router.post("/{log_id}/close", response_model=MaintenanceLogOut)
def close_maintenance_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*WRITE_ROLES)),
):
    try:
        log = maintenance_service.close_maintenance(db, log_id)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    broadcast_safe(
        "maintenance_closed",
        {"maintenance_id": log.id, "vehicle_id": log.vehicle_id}
    )
    broadcast_safe(
        "vehicle_status_changed",
        {"vehicle_id": log.vehicle_id, "new_status": "Available"}
    )
    return log
