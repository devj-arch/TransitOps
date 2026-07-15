"""HTTP-level tests for auth routes — signup, login, /me, lockout, password reset."""

import pytest
from fastapi.testclient import TestClient

from app.models.role import Role
from app.models.user import User
from app.core.security import hash_password


# ── Helpers ──────────────────────────────────────────────────────────────────

def _seed_roles(db):
    """Create the four standard roles."""
    for name in ["Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"]:
        db.add(Role(name=name))
    db.commit()


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── Signup ───────────────────────────────────────────────────────────────────

class TestSignup:
    def test_signup_creates_user(self, client: TestClient, db_session):
        _seed_roles(db_session)

        resp = client.post("/auth/signup", json={
            "email": "new@test.com",
            "password": "secret123",
            "full_name": "New User",
            "role_id": 1,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "new@test.com"
        assert data["name"] == "New User"
        assert data["role"] == "Fleet Manager"
        assert "id" in data

    def test_signup_duplicate_email_returns_409(self, client: TestClient, db_session):
        _seed_roles(db_session)

        client.post("/auth/signup", json={
            "email": "dup@test.com", "password": "secret123",
            "full_name": "First", "role_id": 1,
        })
        resp = client.post("/auth/signup", json={
            "email": "dup@test.com", "password": "secret123",
            "full_name": "Second", "role_id": 1,
        })
        assert resp.status_code == 409

    def test_signup_invalid_role_returns_400(self, client: TestClient, db_session):
        _seed_roles(db_session)

        resp = client.post("/auth/signup", json={
            "email": "bad@test.com", "password": "secret123",
            "full_name": "Bad Role", "role_id": 999,
        })
        assert resp.status_code == 400


# ── Login ────────────────────────────────────────────────────────────────────

class TestLogin:
    def test_login_returns_token(self, client: TestClient, db_session):
        _seed_roles(db_session)
        client.post("/auth/signup", json={
            "email": "login@test.com", "password": "secret123",
            "full_name": "Login Test", "role_id": 1,
        })

        resp = client.post("/auth/login", json={
            "email": "login@test.com",
            "password": "secret123",
            "role": "Fleet Manager",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "login@test.com"
        assert data["user"]["role"] == "Fleet Manager"

    def test_login_wrong_password_returns_401(self, client: TestClient, db_session):
        _seed_roles(db_session)
        client.post("/auth/signup", json={
            "email": "pw@test.com", "password": "secret123",
            "full_name": "PW Test", "role_id": 1,
        })

        resp = client.post("/auth/login", json={
            "email": "pw@test.com",
            "password": "wrongpassword",
            "role": "Fleet Manager",
        })
        assert resp.status_code == 401

    def test_login_wrong_role_returns_401(self, client: TestClient, db_session):
        _seed_roles(db_session)
        client.post("/auth/signup", json={
            "email": "role@test.com", "password": "secret123",
            "full_name": "Role Test", "role_id": 1,  # Fleet Manager
        })

        resp = client.post("/auth/login", json={
            "email": "role@test.com",
            "password": "secret123",
            "role": "Dispatcher",  # wrong role
        })
        assert resp.status_code == 401

    def test_login_nonexistent_email_returns_401(self, client: TestClient, db_session):
        _seed_roles(db_session)

        resp = client.post("/auth/login", json={
            "email": "nobody@test.com",
            "password": "secret123",
            "role": "Fleet Manager",
        })
        assert resp.status_code == 401

    def test_account_locks_after_5_failed_attempts(self, client: TestClient, db_session):
        _seed_roles(db_session)
        client.post("/auth/signup", json={
            "email": "lock@test.com", "password": "secret123",
            "full_name": "Lock Test", "role_id": 1,
        })

        # 5 wrong password attempts
        for _ in range(5):
            resp = client.post("/auth/login", json={
                "email": "lock@test.com",
                "password": "wrong",
                "role": "Fleet Manager",
            })
            assert resp.status_code == 401

        # 6th attempt with CORRECT password should still fail (account locked)
        resp = client.post("/auth/login", json={
            "email": "lock@test.com",
            "password": "secret123",
            "role": "Fleet Manager",
        })
        assert resp.status_code == 423  # locked out

    def test_login_resets_failed_count_on_success(self, client: TestClient, db_session):
        _seed_roles(db_session)
        client.post("/auth/signup", json={
            "email": "reset@test.com", "password": "secret123",
            "full_name": "Reset Test", "role_id": 1,
        })

        # 3 failures, then success
        for _ in range(3):
            client.post("/auth/login", json={
                "email": "reset@test.com",
                "password": "wrong",
                "role": "Fleet Manager",
            })

        # Successful login
        resp = client.post("/auth/login", json={
            "email": "reset@test.com",
            "password": "secret123",
            "role": "Fleet Manager",
        })
        assert resp.status_code == 200

        # Should be able to log in again (counter was reset)
        resp = client.post("/auth/login", json={
            "email": "reset@test.com",
            "password": "secret123",
            "role": "Fleet Manager",
        })
        assert resp.status_code == 200


# ── GET /me ──────────────────────────────────────────────────────────────────

class TestMe:
    def test_me_returns_user(self, client: TestClient, db_session):
        _seed_roles(db_session)
        client.post("/auth/signup", json={
            "email": "me@test.com", "password": "secret123",
            "full_name": "Me Test", "role_id": 1,
        })
        login_resp = client.post("/auth/login", json={
            "email": "me@test.com",
            "password": "secret123",
            "role": "Fleet Manager",
        })
        token = login_resp.json()["access_token"]

        resp = client.get("/auth/me", headers=_auth_header(token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "me@test.com"
        assert data["role"] == "Fleet Manager"

    def test_me_no_token_returns_401(self, client: TestClient, db_session):
        resp = client.get("/auth/me")
        assert resp.status_code == 401  # or 403 depending on FastAPI setup

    def test_me_invalid_token_returns_401(self, client: TestClient, db_session):
        resp = client.get("/auth/me", headers=_auth_header("not.a.real.token"))
        assert resp.status_code in (401, 403)


# ── Forgot / Reset password ──────────────────────────────────────────────────

class TestPasswordReset:
    def test_forgot_password_always_returns_200(self, client: TestClient, db_session):
        _seed_roles(db_session)
        client.post("/auth/signup", json={
            "email": "forgot@test.com", "password": "secret123",
            "full_name": "Forgot Test", "role_id": 1,
        })

        resp = client.post("/auth/forgot-password", json={"email": "forgot@test.com"})
        assert resp.status_code == 200
        assert "message" in resp.json()

    def test_forgot_password_unknown_email_still_returns_200(self, client: TestClient):
        resp = client.post("/auth/forgot-password", json={"email": "nobody@test.com"})
        assert resp.status_code == 200  # don't leak which emails exist

    def test_reset_password_with_valid_token(self, client: TestClient, db_session):
        _seed_roles(db_session)
        client.post("/auth/signup", json={
            "email": "resetpw@test.com", "password": "oldpass123",
            "full_name": "Reset PW", "role_id": 1,
        })
        client.post("/auth/forgot-password", json={"email": "resetpw@test.com"})

        # Grab the reset token directly from the DB
        user = db_session.query(User).filter(User.email == "resetpw@test.com").first()
        assert user.reset_token is not None

        resp = client.post("/auth/reset-password", json={
            "token": user.reset_token,
            "new_password": "newpass456",
        })
        assert resp.status_code == 200

        # Old password should no longer work
        resp = client.post("/auth/login", json={
            "email": "resetpw@test.com",
            "password": "oldpass123",
            "role": "Fleet Manager",
        })
        assert resp.status_code == 401

        # New password should work
        resp = client.post("/auth/login", json={
            "email": "resetpw@test.com",
            "password": "newpass456",
            "role": "Fleet Manager",
        })
        assert resp.status_code == 200

    def test_reset_password_invalid_token_returns_400(self, client: TestClient):
        resp = client.post("/auth/reset-password", json={
            "token": "invalid-token",
            "new_password": "newpass456",
        })
        assert resp.status_code == 400
