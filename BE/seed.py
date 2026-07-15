"""
Seed script — populates the database with demo data.

Builds the exact Section 5 example workflow from the problem statement
(Van-05, driver Alex, 450 kg trip) plus enough extra rows to make the
dashboard look populated (~53 active vehicles in the mockup).
"""

import os
import random
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

# Ensure we run from the BE/ directory so .env and relative paths resolve
os.chdir(Path(__file__).resolve().parent)
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.config import settings  # noqa: E402
from app.core.database import SessionLocal, engine
from app.models.base import BaseModel  # noqa: F401 — ensure all models are registered
from app.models.driver import Driver
from app.models.expense import Expense
from app.models.fuel_log import FuelLog
from app.models.maintenance_log import MaintenanceLog
from app.models.trip import Trip
from app.models.role import Role
from app.models.user import User
from app.models.vehicle import Vehicle
from app.core.security import hash_password
from app.utils.enums import DriverStatus, TripStatus, VehicleStatus

# ── Ensure all models are imported so Base.metadata knows about them ─────────
# (imports above are used; Base.metadata.create_all needs them imported)


def seed():
    """Drop all tables, recreate, and seed with demo data."""

    # Recreate all tables
    BaseModel.metadata.drop_all(bind=engine)
    BaseModel.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # ── Roles ────────────────────────────────────────────────────────────
        role_names = ["Admin", "Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"]
        roles = {}
        for rn in role_names:
            role = Role(name=rn)
            db.add(role)
            roles[rn] = role
        db.flush()

        # ── Users (one per role) ─────────────────────────────────────────────
        users_data = [
            {"email": "admin@transitops.dev", "password": "demo1234", "name": "Dev Joshi", "role": "Admin"},
            {"email": "fleet@transitops.dev", "password": "demo1234", "name": "Sarah Chen", "role": "Fleet Manager"},
            {"email": "dispatch@transitops.dev", "password": "demo1234", "name": "Mike Rivera", "role": "Dispatcher"},
            {"email": "safety@transitops.dev", "password": "demo1234", "name": "Dr. James Park", "role": "Safety Officer"},
            {"email": "finance@transitops.dev", "password": "demo1234", "name": "Emily Tran", "role": "Financial Analyst"},
            {"email": "haneejoshi16@gmail.com", "password": "demo1234", "name": "Hanee", "role": "Financial Analyst"},
        ]
        users = {}
        for u in users_data:
            user = User(
                email=u["email"],
                password_hash=hash_password(u["password"]),
                name=u["name"],
                role_id=roles[u["role"]].id,
            )
            db.add(user)
            users[u["role"]] = user
        db.flush()

        # ── Vehicles ─────────────────────────────────────────────────────────
        vehicle_types = ["Van", "Truck", "Bus", "Pickup", "SUV"]
        vehicle_models = {
            "Van": ["Transit-350", "Sprinter", "Promaster", "NV3500"],
            "Truck": ["F-550", "RAM 5500", "Silverado 6500", "M2-106"],
            "Bus": ["MCI J4500", "Prevost X3", "Temsa TS45"],
            "Pickup": ["F-150", "RAM 1500", "Silverado 1500", "Tacoma"],
            "SUV": ["Suburban", "Expedition", "Yukon XL", "Tahoe"],
        }

        vehicles = []
        # Van-05 is the star of the demo — exact spec from problem statement
        van05 = Vehicle(
            registration_number="VAN-05",
            model="Transit-350",
            type="Van",
            max_capacity=500.0,
            odometer=45230.0,
            acquisition_cost=42000.0,
            status=VehicleStatus.AVAILABLE,
        )
        db.add(van05)
        vehicles.append(van05)

        # Generate ~52 more vehicles to hit ~53 active
        reg_num = 1
        for i in range(52):
            v_type = random.choice(vehicle_types)
            v_model = random.choice(vehicle_models[v_type])

            # Status distribution: mostly Available, some On Trip, few In Shop, few Retired
            status_roll = random.random()
            if status_roll < 0.55:
                status = VehicleStatus.AVAILABLE
            elif status_roll < 0.80:
                status = VehicleStatus.ON_TRIP
            elif status_roll < 0.92:
                status = VehicleStatus.IN_SHOP
            else:
                status = VehicleStatus.RETIRED

            vehicle = Vehicle(
                registration_number=f"{v_type[:3].upper()}-{reg_num:03d}",
                model=v_model,
                type=v_type,
                max_capacity=random.choice([500, 800, 1200, 2000, 3500, 5000]),
                odometer=random.uniform(5000, 250000),
                acquisition_cost=random.uniform(25000, 120000),
                status=status,
            )
            db.add(vehicle)
            vehicles.append(vehicle)
            reg_num += 1

        db.flush()

        # ── Drivers ──────────────────────────────────────────────────────────
        driver_names = [
            "Alex Johnson", "Maria Garcia", "David Kim", "Rachel O'Brien",
            "Carlos Mendez", "Priya Sharma", "Tom Baker", "Lisa Wang",
            "Jamal Carter", "Anna Kowalski", "Brian Murphy", "Sofia Rossi",
            "Kevin Nguyen", "Diana Prince", "Omar Hassan", "Nina Petrova",
            "Chris Davis", "Fatima Ali", "George Thompson", "Yuki Tanaka",
        ]

        drivers = []
        # Alex — the demo driver
        alex = Driver(
            name="Alex Johnson",
            license_number="DL-2024-AJ-0042",
            license_category="C",
            license_expiry=date.today() + timedelta(days=730),
            contact="+1-555-0101",
            safety_score=94.5,
            status=DriverStatus.AVAILABLE,
        )
        db.add(alex)
        drivers.append(alex)

        for i, name in enumerate(driver_names[1:], start=1):
            status_roll = random.random()
            if status_roll < 0.50:
                status = DriverStatus.AVAILABLE
            elif status_roll < 0.75:
                status = DriverStatus.ON_TRIP
            elif status_roll < 0.90:
                status = DriverStatus.OFF_DUTY
            else:
                status = DriverStatus.SUSPENDED

            # Some drivers have expired licenses (edge case for validation)
            if random.random() < 0.10:
                expiry = date.today() - timedelta(days=random.randint(1, 365))
            else:
                expiry = date.today() + timedelta(days=random.randint(180, 1825))

            driver = Driver(
                name=name,
                license_number=f"DL-{2020 + (i % 5)}-{name[:2].upper()}-{1000 + i:04d}",
                license_category=random.choice(["A", "B", "C", "D"]),
                license_expiry=expiry,
                contact=f"+1-555-{1000 + i:04d}",
                safety_score=round(random.uniform(65, 100), 1),
                status=status,
            )
            db.add(driver)
            drivers.append(driver)

        db.flush()

        # ── Trips ────────────────────────────────────────────────────────────
        sources = ["Warehouse A", "Depot B", "Distribution Center C", "Hub D", "Terminal E"]
        destinations = ["Retail Store 1", "Client Site 2", "Wholesale 3", "Outlet 4", "DC 5"]

        trips = []

        # The demo trip (Section 5 workflow)
        demo_trip = Trip(
            source="Warehouse A",
            destination="Retail Store 1",
            vehicle_id=van05.id,
            driver_id=alex.id,
            cargo_weight=450.0,  # ≤ 500 kg — will pass validation
            planned_distance=85.0,
            revenue=1250.0,
            status=TripStatus.DRAFT,
        )
        db.add(demo_trip)
        trips.append(demo_trip)

        # Generate ~45 more trips with various statuses
        for i in range(45):
            v = random.choice(vehicles)
            d = random.choice(drivers)

            status = random.choice([
                TripStatus.DRAFT, TripStatus.DRAFT,
                TripStatus.DISPATCHED, TripStatus.DISPATCHED,
                TripStatus.COMPLETED, TripStatus.COMPLETED, TripStatus.COMPLETED,
                TripStatus.CANCELLED,
            ])

            cargo = random.uniform(100, 4000)
            planned = random.uniform(10, 500)
            actual = random.uniform(planned * 0.9, planned * 1.2) if status == TripStatus.COMPLETED else None
            start = datetime.now(timezone.utc) - timedelta(hours=random.uniform(1, 72)) if status in (TripStatus.DISPATCHED, TripStatus.COMPLETED) else None
            end = datetime.now(timezone.utc) - timedelta(hours=random.uniform(0, 24)) if status == TripStatus.COMPLETED else None

            trip = Trip(
                source=random.choice(sources),
                destination=random.choice(destinations),
                vehicle_id=v.id,
                driver_id=d.id,
                cargo_weight=cargo,
                planned_distance=planned,
                actual_distance=actual,
                revenue=round(random.uniform(200, 5000), 2),
                status=status,
                start_time=start,
                end_time=end,
            )
            db.add(trip)
            trips.append(trip)

        db.flush()

        # ── Fuel Logs ────────────────────────────────────────────────────────
        for _ in range(60):
            v = random.choice(vehicles)
            t = random.choice(trips) if random.random() < 0.6 else None
            log = FuelLog(
                vehicle_id=v.id,
                trip_id=t.id if t else None,
                liters=round(random.uniform(20, 200), 2),
                cost=round(random.uniform(30, 300), 2),
                fuel_date=date.today() - timedelta(days=random.randint(0, 90)),
            )
            db.add(log)

        # ── Maintenance Logs ─────────────────────────────────────────────────
        maintenance_types = ["Oil Change", "Tire Rotation", "Brake Replacement", "Engine Tune-Up", "Transmission Service", "AC Repair", "Suspension Work"]
        for _ in range(15):
            v = random.choice(vehicles)
            is_active = random.random() < 0.3
            log = MaintenanceLog(
                vehicle_id=v.id,
                description=f"Routine {random.choice(maintenance_types).lower()}",
                maintenance_type=random.choice(maintenance_types),
                cost=round(random.uniform(150, 4500), 2),
                start_date=date.today() - timedelta(days=random.randint(0, 60)),
                end_date=None if is_active else date.today() - timedelta(days=random.randint(0, 30)),
                notes="Scheduled maintenance" if not is_active else None,
            )
            db.add(log)

        # ── Expenses ─────────────────────────────────────────────────────────
        expense_categories = ["Toll", "Insurance", "Registration", "Cleaning", "Tire", "Repair", "Other"]
        for _ in range(40):
            v = random.choice(vehicles)
            t = random.choice(trips) if random.random() < 0.4 else None
            exp = Expense(
                vehicle_id=v.id,
                trip_id=t.id if t else None,
                description=f"{random.choice(expense_categories)} expense",
                amount=round(random.uniform(25, 800), 2),
                expense_date=date.today() - timedelta(days=random.randint(0, 90)),
                category=random.choice(expense_categories),
            )
            db.add(exp)

        db.commit()
        print("✅ Seed complete!")
        print(f"   Users:     {len(users_data)}")
        print(f"   Vehicles:  {len(vehicles)}")
        print(f"   Drivers:   {len(drivers)}")
        print(f"   Trips:     {len(trips)}")
        print(f"   Fuel Logs: 60")
        print(f"   Maint Logs: 15")
        print(f"   Expenses:  40")
        print()
        print("   Demo login: fleet@transitops.dev / demo1234")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
