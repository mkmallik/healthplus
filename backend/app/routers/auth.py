from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, LoginResponse, UserResponse
from app.auth import (
    verify_password, generate_token, get_current_user, create_log,
)

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if user is None or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    token = generate_token()
    user.auth_token = token
    user.token_created_at = datetime.utcnow()
    db.commit()

    create_log(db, user.id, "login")

    return LoginResponse(
        token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/logout")
def logout(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    create_log(db, user.id, "logout")
    user.auth_token = None
    user.token_created_at = None
    db.commit()
    return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)
