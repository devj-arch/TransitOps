"""Trip routes — read/write split per RBAC.md."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.websocket_manager import broadcast_safe

from app.core.database import get_db
from app.core.exceptions import AppException
from app.dependencies.auth import require_roles
from app.models.trip import Trip
from app.schemas.trip import TripComplete, TripCreate, TripListOut, TripOut
from app.services import trip_service
from app.utils.enums import Role

router = APIRouter(prefix="/trips", tags=["trips"])

# ── Role sets ────────────────────────────────────────────────────────────────
READ_ROLES = [
    Role.ADMIN.value,
    Role.FLEET_MANAGER.value,
    Role.DISPATCHER.value,
    Role.SAFETY_OFFICER.value,
    Role.FINANCIAL_ANALYST.value,
]
WRITE_ROLES = [Role.ADMIN.value, Role.DISPATCHER.value]


# ── Read endpoints ───────────────────────────────────────────────────────────

@router.get("/", response_model=list[TripListOut])
def list_trips(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*READ_ROLES)),
):
    return db.query(Trip).order_by(Trip.created_at.desc()).all()


@router.get("/{trip_id}", response_model=TripOut)
def get_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*READ_ROLES)),
):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found.")
    return trip


# ── Write / action endpoints ─────────────────────────────────────────────────

@router.post("/", response_model=TripOut, status_code=status.HTTP_201_CREATED)
def create_trip(
    data: TripCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*WRITE_ROLES)),
):
    try:
        trip = trip_service.create_trip(db, data)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    broadcast_safe(
        "trip_created",
        {"trip_id": trip.id, "source": trip.source, "destination": trip.destination}
    )
    return trip


@router.post("/{trip_id}/dispatch", response_model=TripOut)
def dispatch_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*WRITE_ROLES)),
):
    try:
        trip = trip_service.dispatch_trip(db, trip_id)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    broadcast_safe(
        "trip_status_changed",
        {"trip_id": trip.id, "new_status": trip.status.value, "vehicle_id": trip.vehicle_id, "driver_id": trip.driver_id}
    )
    broadcast_safe(
        "vehicle_status_changed",
        {"vehicle_id": trip.vehicle_id, "new_status": "On Trip"}
    )
    broadcast_safe(
        "driver_status_changed",
        {"driver_id": trip.driver_id, "new_status": "On Trip"}
    )
    return trip


@router.post("/{trip_id}/complete", response_model=TripOut)
def complete_trip(
    trip_id: int,
    data: TripComplete,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*WRITE_ROLES)),
):
    try:
        trip = trip_service.complete_trip(db, trip_id, data)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    broadcast_safe(
        "trip_status_changed",
        {"trip_id": trip.id, "new_status": trip.status.value, "vehicle_id": trip.vehicle_id, "driver_id": trip.driver_id}
    )
    broadcast_safe(
        "vehicle_status_changed",
        {"vehicle_id": trip.vehicle_id, "new_status": "Available"}
    )
    broadcast_safe(
        "driver_status_changed",
        {"driver_id": trip.driver_id, "new_status": "Available"}
    )
    return trip


@router.post("/{trip_id}/cancel", response_model=TripOut)
def cancel_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*WRITE_ROLES)),
):
    try:
        trip = trip_service.cancel_trip(db, trip_id)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    broadcast_safe(
        "trip_status_changed",
        {"trip_id": trip.id, "new_status": trip.status.value, "vehicle_id": trip.vehicle_id, "driver_id": trip.driver_id}
    )
    return trip
