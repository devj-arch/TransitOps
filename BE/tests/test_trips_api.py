"""HTTP-level tests for trip lifecycle routes."""

from datetime import date, timedelta

from fastapi.testclient import TestClient

from app.models.driver import Driver
from app.models.role import Role
from app.models.vehicle import Vehicle
from app.utils.enums import DriverStatus, VehicleStatus


def _seed_roles(db):
    if db.query(Role).first():
        return  # already seeded
    for name in ["Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"]:
        db.add(Role(name=name))
    db.commit()


def _get_token(client: TestClient, db) -> str:
    _seed_roles(db)
    role_obj = db.query(Role).filter(Role.name == "Dispatcher").first()
    client.post(
        "/auth/signup",
        json={
            "email": "trips@test.com",
            "password": "secret123",
            "full_name": "Trips User",
            "role_id": role_obj.id,
        },
    )
    resp = client.post(
        "/auth/login",
        json={
            "email": "trips@test.com",
            "password": "secret123",
            "role": "Dispatcher",
        },
    )
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestTripsAPI:
    def test_trip_lifecycle_create_dispatch_complete(self, client: TestClient, db_session):
        token = _get_token(client, db_session)

        vehicle = Vehicle(
            registration_number="TRP-001",
            model="Transit-350",
            type="Van",
            max_capacity=500.0,
            status=VehicleStatus.AVAILABLE,
        )
        driver = Driver(
            name="Dispatcher Driver",
            license_number="DL-TRP-001",
            license_category="C",
            license_expiry=date.today() + timedelta(days=365),
            contact="+1-555-3001",
            safety_score=94.0,
            status=DriverStatus.AVAILABLE,
        )
        db_session.add_all([vehicle, driver])
        db_session.commit()

        create_resp = client.post(
            "/trips/",
            json={
                "source": "Warehouse A",
                "destination": "Retail Store 1",
                "vehicle_id": vehicle.id,
                "driver_id": driver.id,
                "cargo_weight": 450.0,
                "planned_distance": 85.0,
                "revenue": 1250.0,
            },
            headers=_auth(token),
        )
        assert create_resp.status_code == 201
        trip_id = create_resp.json()["id"]
        assert create_resp.json()["status"] == "Draft"

        dispatch_resp = client.post(f"/trips/{trip_id}/dispatch", headers=_auth(token))
        assert dispatch_resp.status_code == 200
        assert dispatch_resp.json()["status"] == "Dispatched"

        complete_resp = client.post(
            f"/trips/{trip_id}/complete",
            json={"actual_distance": 90.0},
            headers=_auth(token),
        )
        assert complete_resp.status_code == 200
        assert complete_resp.json()["status"] == "Completed"
        assert complete_resp.json()["actual_distance"] == 90.0

    def test_cancel_draft_trip(self, client: TestClient, db_session):
        token = _get_token(client, db_session)

        vehicle = Vehicle(
            registration_number="TRP-002",
            model="Sprinter",
            type="Van",
            max_capacity=600.0,
            status=VehicleStatus.AVAILABLE,
        )
        driver = Driver(
            name="Cancel Driver",
            license_number="DL-TRP-002",
            license_category="C",
            license_expiry=date.today() + timedelta(days=365),
            contact="+1-555-3002",
            safety_score=92.0,
            status=DriverStatus.AVAILABLE,
        )
        db_session.add_all([vehicle, driver])
        db_session.commit()

        create_resp = client.post(
            "/trips/",
            json={
                "source": "Depot B",
                "destination": "Client Site 2",
                "vehicle_id": vehicle.id,
                "driver_id": driver.id,
                "cargo_weight": 100.0,
                "planned_distance": 30.0,
                "revenue": 500.0,
            },
            headers=_auth(token),
        )
        trip_id = create_resp.json()["id"]

        cancel_resp = client.post(f"/trips/{trip_id}/cancel", headers=_auth(token))
        assert cancel_resp.status_code == 200
        assert cancel_resp.json()["status"] == "Cancelled"

    def test_unauthorized_access_returns_401(self, client: TestClient):
        resp = client.get("/trips/")
        assert resp.status_code in (401, 403)
