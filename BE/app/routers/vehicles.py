"""Vehicle routes — read/write split per RBAC.md."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import exc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.websocket_manager import broadcast_safe
from app.dependencies.auth import require_roles
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleOut, VehicleUpdate
from app.utils.enums import Role

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

# ── Role sets ────────────────────────────────────────────────────────────────
READ_ROLES = [
    Role.ADMIN.value,
    Role.FLEET_MANAGER.value,
    Role.DISPATCHER.value,
    Role.SAFETY_OFFICER.value,
    Role.FINANCIAL_ANALYST.value,
]
WRITE_ROLES = [Role.ADMIN.value, Role.FLEET_MANAGER.value]


# ── Read endpoints ───────────────────────────────────────────────────────────

@router.get("/", response_model=list[VehicleOut])
def list_vehicles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*READ_ROLES)),
):
    return db.query(Vehicle).all()


@router.get("/{vehicle_id}", response_model=VehicleOut)
def get_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*READ_ROLES)),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")
    return vehicle


# ── Write endpoints ──────────────────────────────────────────────────────────

@router.post("/", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    data: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*WRITE_ROLES)),
):
    vehicle = Vehicle(**data.model_dump())
    db.add(vehicle)
    try:
        db.commit()
        db.refresh(vehicle)
    except exc.IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Vehicle with registration number '{data.registration_number}' already exists.",
        )
    return vehicle


@router.patch("/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(
    vehicle_id: int,
    data: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*WRITE_ROLES)),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")

    try:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(vehicle, field, value)
        db.commit()
        db.refresh(vehicle)
    except exc.IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Registration number already in use.")
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update vehicle. Check the submitted values.")

    broadcast_safe(
        "vehicle_status_changed",
        {
            "vehicle_id": vehicle.id,
            "registration_number": vehicle.registration_number,
            "new_status": vehicle.status.value,
        }
    )
    return vehicle

@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*WRITE_ROLES)),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")

    # Check for related records before deleting
    from app.models.expense import Expense
    from app.models.fuel_log import FuelLog
    from app.models.maintenance_log import MaintenanceLog
    from app.models.trip import Trip

    trips = db.query(Trip).filter(Trip.vehicle_id == vehicle_id).count()
    fuel = db.query(FuelLog).filter(FuelLog.vehicle_id == vehicle_id).count()
    maintenance = db.query(MaintenanceLog).filter(MaintenanceLog.vehicle_id == vehicle_id).count()
    expenses = db.query(Expense).filter(Expense.vehicle_id == vehicle_id).count()

    if trips or fuel or maintenance or expenses:
        parts = []
        if trips: parts.append(f"{trips} trip(s)")
        if fuel: parts.append(f"{fuel} fuel log(s)")
        if maintenance: parts.append(f"{maintenance} maintenance record(s)")
        if expenses: parts.append(f"{expenses} expense(s)")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete this vehicle — it has {', '.join(parts)}. Remove those records first.",
        )

    try:
        db.delete(vehicle)
        db.commit()
        broadcast_safe(
            "vehicle_status_changed",
            {"vehicle_id": vehicle_id, "new_status": "deleted"}
        )
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete vehicle.")
