"""HTTP-level tests for maintenance routes."""

from fastapi.testclient import TestClient

from app.models.role import Role


def _seed_roles(db):
    if db.query(Role).first():
        return  # already seeded
    for name in ["Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"]:
        db.add(Role(name=name))
    db.commit()


def _get_token(client: TestClient, db, role: str = "Fleet Manager", email: str = "maint@test.com") -> str:
    _seed_roles(db)
    role_obj = db.query(Role).filter(Role.name == role).first()
    client.post("/auth/signup", json={
        "email": email,
        "password": "secret123",
        "full_name": "Test User",
        "role_id": role_obj.id,
    })
    resp = client.post("/auth/login", json={
        "email": email,
        "password": "secret123",
        "role": role,
    })
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestMaintenanceAPI:
    def test_fleet_manager_can_list_maintenance_logs(self, client: TestClient, db_session):
        token = _get_token(client, db_session, role="Fleet Manager", email="fleet@test.com")

        resp = client.get("/maintenance/", headers=_auth(token))
        assert resp.status_code == 200
        assert resp.json() == []

    def test_safety_officer_can_list_maintenance_logs(self, client: TestClient, db_session):
        token = _get_token(client, db_session, role="Safety Officer", email="safety@test.com")

        resp = client.get("/maintenance/", headers=_auth(token))
        assert resp.status_code == 200
        assert resp.json() == []
