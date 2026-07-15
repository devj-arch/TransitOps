"""HTTP-level tests for dashboard/report routes."""

from datetime import date, timedelta

from fastapi.testclient import TestClient

from app.models.driver import Driver
from app.models.expense import Expense
from app.models.fuel_log import FuelLog
from app.models.maintenance_log import MaintenanceLog
from app.models.role import Role
from app.models.trip import Trip
from app.models.user import User
from app.models.vehicle import Vehicle
from app.utils.enums import DriverStatus, TripStatus, VehicleStatus


def _seed_roles(db):
    if db.query(Role).first():
        return  # already seeded
    for name in ["Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"]:
        db.add(Role(name=name))
    db.commit()


def _get_token(client: TestClient, db) -> str:
    _seed_roles(db)
    role_obj = db.query(Role).filter(Role.name == "Fleet Manager").first()
    client.post(
        "/auth/signup",
        json={
            "email": "dashboard@test.com",
            "password": "secret123",
            "full_name": "Dashboard User",
            "role_id": role_obj.id,
        },
    )
    resp = client.post(
        "/auth/login",
        json={
            "email": "dashboard@test.com",
            "password": "secret123",
            "role": "Fleet Manager",
        },
    )
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestDashboardAPI:
    def test_kpis_reflect_current_database_state(self, client: TestClient, db_session):
        token = _get_token(client, db_session)

        vehicles = [
            Vehicle(
                registration_number="DASH-001",
                model="Transit-350",
                type="Van",
                max_capacity=500.0,
                status=VehicleStatus.AVAILABLE,
            ),
            Vehicle(
                registration_number="DASH-002",
                model="Sprinter",
                type="Van",
                max_capacity=600.0,
                status=VehicleStatus.ON_TRIP,
            ),
            Vehicle(
                registration_number="DASH-003",
                model="M2-106",
                type="Truck",
                max_capacity=1500.0,
                status=VehicleStatus.IN_SHOP,
            ),
            Vehicle(
                registration_number="DASH-004",
                model="Yukon XL",
                type="SUV",
                max_capacity=700.0,
                status=VehicleStatus.RETIRED,
            ),
        ]
        db_session.add_all(vehicles)

        drivers = [
            Driver(
                name="Available Driver",
                license_number="DL-DASH-001",
                license_category="C",
                license_expiry=date.today() + timedelta(days=365),
                contact="+1-555-1001",
                safety_score=95.0,
                status=DriverStatus.AVAILABLE,
            ),
            Driver(
                name="On Trip Driver",
                license_number="DL-DASH-002",
                license_category="C",
                license_expiry=date.today() + timedelta(days=365),
                contact="+1-555-1002",
                safety_score=91.0,
                status=DriverStatus.ON_TRIP,
            ),
            Driver(
                name="Off Duty Driver",
                license_number="DL-DASH-003",
                license_category="C",
                license_expiry=date.today() + timedelta(days=365),
                contact="+1-555-1003",
                safety_score=88.0,
                status=DriverStatus.OFF_DUTY,
            ),
        ]
        db_session.add_all(drivers)
        db_session.commit()

        trips = [
            Trip(
                source="Warehouse A",
                destination="Store B",
                vehicle_id=vehicles[0].id,
                driver_id=drivers[0].id,
                cargo_weight=100.0,
                planned_distance=50.0,
                revenue=200.0,
                status=TripStatus.DRAFT,
            ),
            Trip(
                source="Depot C",
                destination="Outlet D",
                vehicle_id=vehicles[1].id,
                driver_id=drivers[1].id,
                cargo_weight=150.0,
                planned_distance=80.0,
                revenue=300.0,
                status=TripStatus.DISPATCHED,
            ),
        ]
        db_session.add_all(trips)
        db_session.commit()

        resp = client.get("/dashboard/kpis", headers=_auth(token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_vehicles"] == 4
        assert data["active_vehicles"] == 1
        assert data["available_vehicles"] == 1
        assert data["vehicles_in_maintenance"] == 1
        assert data["active_trips"] == 1
        assert data["pending_trips"] == 1
        assert data["drivers_on_duty"] == 2
        assert data["fleet_utilization_pct"] == 33.3

    def test_vehicle_metrics_endpoints_return_expected_values(self, client: TestClient, db_session):
        token = _get_token(client, db_session)

        vehicle = Vehicle(
            registration_number="DASH-METRICS",
            model="Transit-350",
            type="Van",
            max_capacity=500.0,
            acquisition_cost=1000.0,
            status=VehicleStatus.AVAILABLE,
        )
        driver = Driver(
            name="Metrics Driver",
            license_number="DL-METRICS",
            license_category="C",
            license_expiry=date.today() + timedelta(days=365),
            contact="+1-555-2000",
            safety_score=96.0,
            status=DriverStatus.AVAILABLE,
        )
        db_session.add(vehicle)
        db_session.add(driver)
        db_session.commit()

        trip = Trip(
            source="Warehouse A",
            destination="Store B",
            vehicle_id=vehicle.id,
            driver_id=driver.id,
            cargo_weight=100.0,
            planned_distance=150.0,
            actual_distance=150.0,
            revenue=300.0,
            status=TripStatus.COMPLETED,
        )
        fuel_log = FuelLog(
            vehicle_id=vehicle.id,
            trip_id=None,
            liters=10.0,
            cost=50.0,
            fuel_date=date.today(),
        )
        maintenance_log = MaintenanceLog(
            vehicle_id=vehicle.id,
            description="Routine service",
            maintenance_type="Oil Change",
            cost=25.0,
            start_date=date.today(),
        )
        expense = Expense(
            vehicle_id=vehicle.id,
            trip_id=None,
            description="Toll charge",
            amount=12.0,
            expense_date=date.today(),
            category="Toll",
        )
        db_session.add_all([trip, fuel_log, maintenance_log, expense])
        db_session.commit()

        cost_resp = client.get(f"/dashboard/vehicles/{vehicle.id}/operational-cost", headers=_auth(token))
        assert cost_resp.status_code == 200
        cost_data = cost_resp.json()
        assert cost_data["fuel_cost"] == 50.0
        assert cost_data["maintenance_cost"] == 25.0
        assert cost_data["other_expenses"] == 12.0
        assert cost_data["total_operational_cost"] == 87.0

        roi_resp = client.get(f"/dashboard/vehicles/{vehicle.id}/roi", headers=_auth(token))
        assert roi_resp.status_code == 200
        roi_data = roi_resp.json()
        assert roi_data["total_revenue"] == 300.0
        assert roi_data["total_costs"] == 75.0
        assert roi_data["net_return"] == 225.0
        assert roi_data["roi_pct"] == 22.5

        efficiency_resp = client.get(
            f"/dashboard/vehicles/{vehicle.id}/fuel-efficiency",
            headers=_auth(token),
        )
        assert efficiency_resp.status_code == 200
        efficiency_data = efficiency_resp.json()
        assert efficiency_data["total_distance_km"] == 150.0
        assert efficiency_data["total_fuel_liters"] == 10.0
        assert efficiency_data["fuel_efficiency_km_per_liter"] == 15.0
