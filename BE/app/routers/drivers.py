from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import exc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_roles
from app.models.driver import Driver
from app.models.user import User
from app.schemas.driver import DriverCreate, DriverOut, DriverUpdate
from app.utils.enums import Role

router = APIRouter(prefix="/drivers", tags=["drivers"])


@router.get("/", response_model=list[DriverOut])
def list_drivers(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            Role.FLEET_MANAGER.value,
            Role.SAFETY_OFFICER.value,
        )
    ),
):
    """List all drivers."""
    return db.query(Driver).all()


@router.get("/{driver_id}", response_model=DriverOut)
def get_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            Role.FLEET_MANAGER.value,
            Role.SAFETY_OFFICER.value,
        )
    ),
):
    """Get a single driver by ID."""
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found.")
    return driver


@router.post("/", response_model=DriverOut, status_code=status.HTTP_201_CREATED)
def create_driver(
    data: DriverCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.FLEET_MANAGER.value, Role.SAFETY_OFFICER.value)),
):
    """Register a new driver."""
    driver = Driver(**data.model_dump())
    db.add(driver)
    try:
        db.commit()
        db.refresh(driver)
    except exc.IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Driver with license number '{data.license_number}' already exists.",
        )
    return driver


@router.patch("/{driver_id}", response_model=DriverOut)
def update_driver(
    driver_id: int,
    data: DriverUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.FLEET_MANAGER.value, Role.SAFETY_OFFICER.value)),
):
    """Update an existing driver."""
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found.")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(driver, field, value)

    try:
        db.commit()
        db.refresh(driver)
    except exc.IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="License number already in use.",
        )
    return driver


@router.delete("/{driver_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.FLEET_MANAGER.value, Role.SAFETY_OFFICER.value)),
):
    """Delete a driver."""
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found.")
    db.delete(driver)
    db.commit()
