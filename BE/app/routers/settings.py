"""Settings routes — Admin only per RBAC.md."""

from fastapi import APIRouter, Depends

from app.dependencies.auth import require_roles
from app.utils.enums import Role

router = APIRouter(prefix="/settings", tags=["settings"])

ADMIN_ONLY = [Role.ADMIN.value]


@router.get("/")
def get_settings(current_user=Depends(require_roles(*ADMIN_ONLY))):
    """Return system settings. Admin only."""
    return {
        "app_name": "TransitOps",
        "version": "1.0.0",
        "roles": [r.value for r in Role],
    }
