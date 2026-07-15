from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    generate_reset_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repository.user_repository import UserRepository
from app.schemas.user import UserCreate
from app.utils.email import send_password_reset_email


class AuthService:

    # ── Signup ───────────────────────────────────────────────────────────

    @staticmethod
    def signup(db: Session, data: UserCreate) -> User:
        existing = UserRepository.get_by_email(db, data.email)
        if existing:
            raise ValueError("A user with this email already exists.")
        user = User(
            email=data.email,
            password_hash=hash_password(data.password),
            name=data.full_name,
            role_id=data.role_id,
        )
        return UserRepository.create(db, user)

    # ── Login ────────────────────────────────────────────────────────────

    @staticmethod
    def login(db: Session, email: str, password: str, role: str) -> dict | None:
        user = UserRepository.get_by_email(db, email)
        if user is None:
            return None

        if user.is_locked:
            if user.locked_until and datetime.utcnow() < user.locked_until:
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail="Account locked after 5 failed attempts. Try again in 15 minutes.",
                )
            user.is_locked = False
            user.failed_login_attempts = 0
            user.locked_until = None
            db.commit()

        if not verify_password(password, user.password_hash):
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.is_locked = True
                user.locked_until = datetime.utcnow() + timedelta(minutes=15)
            db.commit()
            return None

        if user.role.name != role:
            return None

        user.failed_login_attempts = 0
        user.is_locked = False
        user.locked_until = None
        db.commit()

        token = create_access_token({
            "sub": str(user.id),
            "role": user.role.name,
        })
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role.name,
            },
        }

    # ── Password reset ────────────────────────────────────────────────────

    @staticmethod
    def forgot_password(db: Session, email: str) -> None:
        user = UserRepository.get_by_email(db, email)
        if user is None:
            return
        user.reset_token = generate_reset_token()
        user.reset_token_expiry = datetime.utcnow() + timedelta(
            minutes=settings.RESET_TOKEN_EXPIRE_MINUTES
        )
        db.commit()
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={user.reset_token}"
        send_password_reset_email(user.email, reset_link)

    @staticmethod
    def reset_password(db: Session, token: str, new_password: str) -> bool:
        user = UserRepository.get_by_reset_token(db, token)
        if user is None:
            return False
        if user.reset_token_expiry is None or datetime.utcnow() > user.reset_token_expiry:
            return False
        user.password_hash = hash_password(new_password)
        user.reset_token = None
        user.reset_token_expiry = None
        user.failed_login_attempts = 0
        user.is_locked = False
        user.locked_until = None
        db.commit()
        return True
