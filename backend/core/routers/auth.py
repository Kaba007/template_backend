# routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from backend.core.services.auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    set_session_token,
    clear_session_token,
)
from backend.core.db import get_db
from backend.core.models.auth import User
from backend.core.schemas.auth import LoginRequest, LoginResponse, UserPublic
from backend.core.config import get_settings

settings = get_settings()
router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(
    request: Request,
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login endpoint - vytvoří JWT a uloží ho do session cookie."""
    user = await authenticate_user(login_data.client_id, login_data.client_secret, db)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect client_id or client_secret",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Vytvoř JWT token
    access_token = create_access_token(data={"sub": user.client_id})

    # Ulož token do session cookie
    set_session_token(request, access_token)

    return LoginResponse(
        message="Login successful",
        user_id=user.client_id,
        access_token=access_token,
        expires_in=settings.access_token_expire_minutes
    )


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Logout endpoint - vymaže session cookie."""
    clear_session_token(request)
    return {"message": "Logout successful"}


@router.get("/me", response_model=UserPublic)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Vrátí info o aktuálním uživateli."""
    return current_user

@router.get("/debug-session")
async def debug_session(request: Request):
    """Debug endpoint pro kontrolu session."""
    return {
        "session_exists": hasattr(request, "session"),
        "session_data": dict(request.session) if hasattr(request, "session") else None,
        "has_token": "session" in request.session if hasattr(request, "session") else False
    }
