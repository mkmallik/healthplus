from __future__ import annotations

import uuid
import json
from datetime import datetime, timedelta

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, Log

security = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def generate_token() -> str:
    return str(uuid.uuid4())


def is_token_expired(token_created_at: datetime) -> bool:
    if token_created_at is None:
        return True
    return datetime.utcnow() - token_created_at > timedelta(days=settings.TOKEN_EXPIRY_DAYS)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    user = db.query(User).filter(User.auth_token == token).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    if is_token_expired(user.token_created_at):
        user.auth_token = None
        user.token_created_at = None
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    return user


def create_log(db: Session, user_id: int, action: str, details: dict | None = None):
    log = Log(
        user_id=user_id,
        action=action,
        details=json.dumps(details) if details else None,
    )
    db.add(log)
    db.commit()
