"""HTTP-level tests for driver CRUD routes — RBAC: Safety Officer writes, Fleet Mgr + Dispatcher read."""

from datetime import date, timedelta

from fastapi.testclient import TestClient

from app.models.role import Role


def _seed_roles(db):
    if db.query(Role).first():
        return
    for name in ["Admin", "Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"]:
        db.add(Role(name=name))
    db.commit()


def _get_token(client: TestClient, db, role: str = "Fleet Manager", email: str = "driver_test@test.com") -> str:
    _seed_roles(db)
    role_obj = db.query(Role).filter(Role.name == role).first()
    client.post("/auth/signup", json={
        "email": email, "password": "secret123",
        "full_name": "Test User", "role_id": role_obj.id,
    })
    resp = client.post("/auth/login", json={
        "email": email, "password": "secret123",
        "role": role,
    })
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


VALID_EXPIRY = str(date.today() + timedelta(days=365))


class TestDriversAPI:
    def test_create_driver(self, client: TestClient, db_session):
        token = _get_token(client, db_session, role="Safety Officer", email="so@test.com")

        resp = client.post("/drivers/", json={
            "name": "Alex Johnson",
            "license_number": "DL-2024-AJ-0042",
            "license_category": "C",
            "license_expiry": VALID_EXPIRY,
            "contact": "+1-555-0101",
        }, headers=_auth(token))

        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Alex Johnson"

    def test_create_duplicate_license_returns_409(self, client: TestClient, db_session):
        token = _get_token(client, db_session, role="Safety Officer", email="so@test.com")

        client.post("/drivers/", json={
            "name": "A", "license_number": "DL-DUP",
            "license_category": "C", "license_expiry": VALID_EXPIRY,
            "contact": "+1-555-0001",
        }, headers=_auth(token))

        resp = client.post("/drivers/", json={
            "name": "B", "license_number": "DL-DUP",
            "license_category": "C", "license_expiry": VALID_EXPIRY,
            "contact": "+1-555-0002",
        }, headers=_auth(token))

        assert resp.status_code == 409

    def test_fleet_manager_cannot_create_driver(self, client: TestClient, db_session):
        token = _get_token(client, db_session, role="Fleet Manager", email="fm@test.com")
        resp = client.post("/drivers/", json={
            "name": "Nope", "license_number": "DL-NOPE",
            "license_category": "C", "license_expiry": VALID_EXPIRY,
            "contact": "+1-555-NO",
        }, headers=_auth(token))
        assert resp.status_code == 403

    def test_list_drivers(self, client: TestClient, db_session):
        so_token = _get_token(client, db_session, role="Safety Officer", email="so@test.com")
        fm_token = _get_token(client, db_session, role="Fleet Manager", email="fm@test.com")

        client.post("/drivers/", json={
            "name": "Driver A", "license_number": "DL-A",
            "license_category": "C", "license_expiry": VALID_EXPIRY,
            "contact": "+1-555-A",
        }, headers=_auth(so_token))
        client.post("/drivers/", json={
            "name": "Driver B", "license_number": "DL-B",
            "license_category": "C", "license_expiry": VALID_EXPIRY,
            "contact": "+1-555-B",
        }, headers=_auth(so_token))

        resp = client.get("/drivers/", headers=_auth(fm_token))
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_dispatcher_can_list_drivers(self, client: TestClient, db_session):
        so_token = _get_token(client, db_session, role="Safety Officer", email="so@test.com")
        dispatcher_token = _get_token(client, db_session, role="Dispatcher", email="dispatch@test.com")

        client.post("/drivers/", json={
            "name": "Driver C", "license_number": "DL-C",
            "license_category": "C", "license_expiry": VALID_EXPIRY,
            "contact": "+1-555-C",
        }, headers=_auth(so_token))

        resp = client.get("/drivers/", headers=_auth(dispatcher_token))
        assert resp.status_code == 200  # Dispatcher CAN read drivers per RBAC.md
        assert len(resp.json()) == 1

    def test_get_driver_by_id(self, client: TestClient, db_session):
        so_token = _get_token(client, db_session, role="Safety Officer", email="so@test.com")
        fm_token = _get_token(client, db_session, role="Fleet Manager", email="fm@test.com")

        create_resp = client.post("/drivers/", json={
            "name": "Get Driver", "license_number": "DL-GET",
            "license_category": "B", "license_expiry": VALID_EXPIRY,
            "contact": "+1-555-GET",
        }, headers=_auth(so_token))
        driver_id = create_resp.json()["id"]

        resp = client.get(f"/drivers/{driver_id}", headers=_auth(fm_token))
        assert resp.status_code == 200
        assert resp.json()["name"] == "Get Driver"

    def test_get_nonexistent_driver_returns_404(self, client: TestClient, db_session):
        token = _get_token(client, db_session)
        resp = client.get("/drivers/99999", headers=_auth(token))
        assert resp.status_code == 404

    def test_update_driver(self, client: TestClient, db_session):
        token = _get_token(client, db_session, role="Safety Officer", email="so@test.com")

        create_resp = client.post("/drivers/", json={
            "name": "Update Me", "license_number": "DL-UPD",
            "license_category": "C", "license_expiry": VALID_EXPIRY,
            "contact": "+1-555-UPD",
        }, headers=_auth(token))
        driver_id = create_resp.json()["id"]

        resp = client.patch(f"/drivers/{driver_id}", json={
            "contact": "+1-555-NEW",
        }, headers=_auth(token))

        assert resp.status_code == 200
        assert resp.json()["contact"] == "+1-555-NEW"

    def test_delete_driver(self, client: TestClient, db_session):
        token = _get_token(client, db_session, role="Safety Officer", email="so@test.com")

        create_resp = client.post("/drivers/", json={
            "name": "Delete Me", "license_number": "DL-DEL",
            "license_category": "C", "license_expiry": VALID_EXPIRY,
            "contact": "+1-555-DEL",
        }, headers=_auth(token))
        driver_id = create_resp.json()["id"]

        resp = client.delete(f"/drivers/{driver_id}", headers=_auth(token))
        assert resp.status_code == 204

        resp = client.get(f"/drivers/{driver_id}", headers=_auth(token))
        assert resp.status_code == 404

    def test_unauthorized_access_returns_401(self, client: TestClient, db_session):
        resp = client.get("/drivers/")
        assert resp.status_code in (401, 403)
