import asyncio
import logging
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.websocket_manager import LICENSE_EXPIRY_WARNING_DAYS, manager
from app.models.driver import Driver

logger = logging.getLogger(__name__)


async def check_expiring_licenses() -> None:
    """
    Runs periodically. Broadcasts license_expiring_soon or license_expired
    for any driver whose license is at or near expiry.
    """
    db: Session = SessionLocal()
    try:
        today = date.today()
        warning_cutoff = today + timedelta(days=LICENSE_EXPIRY_WARNING_DAYS)

        drivers = (
            db.query(Driver)
            .filter(Driver.license_expiry <= warning_cutoff)
            .all()
        )

        for driver in drivers:
            days_left = (driver.license_expiry - today).days

            if days_left < 0:
                event = "license_expired"
                payload = {
                    "driver_id": driver.id,
                    "driver_name": driver.name,
                    "expired_on": str(driver.license_expiry),
                }
            else:
                event = "license_expiring_soon"
                payload = {
                    "driver_id": driver.id,
                    "driver_name": driver.name,
                    "days_left": days_left,
                }

            await manager.broadcast(event, payload)

    except Exception as e:
        logger.error("License check failed: %s", e)
    finally:
        db.close()


async def start_license_checker(interval_seconds: int = 3600) -> None:
    """Loop that runs check_expiring_licenses every interval_seconds."""
    while True:
        await check_expiring_licenses()
        await asyncio.sleep(interval_seconds)
