from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import exc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_roles
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleOut, VehicleUpdate
from app.utils.enums import Role

router = APIRouter(
    prefix="/vehicles",
    tags=["vehicles"],
)


@router.get("/", response_model=list[VehicleOut])
def list_vehicles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.FLEET_MANAGER.value)),
):
    """List all vehicles."""
    return db.query(Vehicle).all()


@router.get("/{vehicle_id}", response_model=VehicleOut)
def get_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.FLEET_MANAGER.value)),
):
    """Get a single vehicle by ID."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")
    return vehicle


@router.post("/", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    data: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.FLEET_MANAGER.value)),
):
    """Register a new vehicle."""
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
    current_user: User = Depends(require_roles(Role.FLEET_MANAGER.value)),
):
    """Update an existing vehicle."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(vehicle, field, value)

    try:
        db.commit()
        db.refresh(vehicle)
    except exc.IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration number already in use.",
        )
    return vehicle


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.FLEET_MANAGER.value)),
):
    """Delete a vehicle."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")
    db.delete(vehicle)
    db.commit()
