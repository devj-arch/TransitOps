"""HTTP-level tests for vehicle CRUD routes."""

import pytest
from fastapi.testclient import TestClient

from app.models.role import Role


def _seed_roles(db):
    if db.query(Role).first():
        return  # already seeded
    for name in ["Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"]:
        db.add(Role(name=name))
    db.commit()


def _get_token(
    client: TestClient,
    db,
    role: str = "Fleet Manager",
    email: str = "test@test.com",
) -> str:
    """Sign up a user and return a valid JWT token."""
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


class TestVehiclesAPI:
    def test_create_vehicle(self, client: TestClient, db_session):
        token = _get_token(client, db_session)

        resp = client.post("/vehicles/", json={
            "registration_number": "VAN-001",
            "model": "Transit-350",
            "type": "Van",
            "max_capacity": 500.0,
        }, headers=_auth(token))

        assert resp.status_code == 201
        data = resp.json()
        assert data["registration_number"] == "VAN-001"
        assert data["status"] == "Available"

    def test_create_duplicate_registration_returns_409(self, client: TestClient, db_session):
        token = _get_token(client, db_session)

        client.post("/vehicles/", json={
            "registration_number": "VAN-DUP", "model": "X", "type": "Van",
            "max_capacity": 500.0,
        }, headers=_auth(token))

        resp = client.post("/vehicles/", json={
            "registration_number": "VAN-DUP", "model": "Y", "type": "Truck",
            "max_capacity": 800.0,
        }, headers=_auth(token))

        assert resp.status_code == 409

    def test_list_vehicles(self, client: TestClient, db_session):
        token = _get_token(client, db_session)

        client.post("/vehicles/", json={
            "registration_number": "VAN-A", "model": "A", "type": "Van",
            "max_capacity": 500.0,
        }, headers=_auth(token))
        client.post("/vehicles/", json={
            "registration_number": "VAN-B", "model": "B", "type": "Truck",
            "max_capacity": 800.0,
        }, headers=_auth(token))

        resp = client.get("/vehicles/", headers=_auth(token))
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_financial_analyst_cannot_list_vehicles(self, client: TestClient, db_session):
        token = _get_token(
            client, db_session,
            role="Financial Analyst", email="finance@test.com",
        )
        resp = client.get("/vehicles/", headers=_auth(token))
        assert resp.status_code == 403  # Financial Analyst cannot access Vehicles

    def test_get_vehicle_by_id(self, client: TestClient, db_session):
        token = _get_token(client, db_session)

        create_resp = client.post("/vehicles/", json={
            "registration_number": "VAN-GET", "model": "Get", "type": "Van",
            "max_capacity": 500.0,
        }, headers=_auth(token))
        vehicle_id = create_resp.json()["id"]

        resp = client.get(f"/vehicles/{vehicle_id}", headers=_auth(token))
        assert resp.status_code == 200
        assert resp.json()["registration_number"] == "VAN-GET"

    def test_get_nonexistent_vehicle_returns_404(self, client: TestClient, db_session):
        token = _get_token(client, db_session)
        resp = client.get("/vehicles/99999", headers=_auth(token))
        assert resp.status_code == 404

    def test_update_vehicle(self, client: TestClient, db_session):
        token = _get_token(client, db_session)

        create_resp = client.post("/vehicles/", json={
            "registration_number": "VAN-UPD", "model": "Old", "type": "Van",
            "max_capacity": 500.0,
        }, headers=_auth(token))
        vehicle_id = create_resp.json()["id"]

        resp = client.patch(f"/vehicles/{vehicle_id}", json={
            "model": "New Model",
        }, headers=_auth(token))

        assert resp.status_code == 200
        assert resp.json()["model"] == "New Model"

    def test_delete_vehicle(self, client: TestClient, db_session):
        token = _get_token(client, db_session)

        create_resp = client.post("/vehicles/", json={
            "registration_number": "VAN-DEL", "model": "Del", "type": "Van",
            "max_capacity": 500.0,
        }, headers=_auth(token))
        vehicle_id = create_resp.json()["id"]

        resp = client.delete(f"/vehicles/{vehicle_id}", headers=_auth(token))
        assert resp.status_code == 204

        # Verify it's gone
        resp = client.get(f"/vehicles/{vehicle_id}", headers=_auth(token))
        assert resp.status_code == 404

    def test_unauthorized_access_returns_401(self, client: TestClient, db_session):
        resp = client.get("/vehicles/")
        assert resp.status_code in (401, 403)
