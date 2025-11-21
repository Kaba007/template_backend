# routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from backend.core.services.auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    set_session_token,
    clear_session_token,
    get_user_info_with_permissions,
    verify_password,
    get_password_hash,

)
from backend.core.db import get_db
from backend.core.models.auth import User
from backend.core.schemas.auth import LoginRequest, LoginResponse, UserPublic,UserPermissionsResponse,ResetPasswordRequest
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
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"message": "Incorrect client_id or client_secret"}
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


@router.get("/me", response_model=UserPermissionsResponse)
async def read_users_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
    ):
    """Vrátí info o aktuálním uživateli."""

    return get_user_info_with_permissions(current_user, db)

@router.get("/debug-session")
async def debug_session(request: Request):
    """Debug endpoint pro kontrolu session."""
    return {
        "session_exists": hasattr(request, "session"),
        "session_data": dict(request.session) if hasattr(request, "session") else None,
        "has_token": "session" in request.session if hasattr(request, "session") else False
    }
@router.post("/{client_id}/reset-password")
async def reset_password(
    client_id: str,
    password_data: ResetPasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Změní heslo uživatele.

    - Běžný uživatel může měnit pouze své vlastní heslo
    - Admin s právy users.admin může měnit heslo komukoliv
    """

    # Kontrola, zda uživatel mění své vlastní heslo nebo má admin práva
    is_own_password = current_user.client_id == client_id

    if not is_own_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to change this user's password"
        )

    # Najdi cílového uživatele
    target_user = db.query(User).filter(User.client_id == client_id).first()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with client_id '{client_id}' not found"
        )

    # Pokud mění vlastní heslo, musí zadat staré heslo
    if is_own_password:
        if not password_data.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is required when changing your own password"
            )

        # Ověř staré heslo
        if not verify_password(password_data.password, target_user.client_secret):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect current password"
            )

    # Admin nemusí zadávat staré heslo, ale pokud ho zadal, ignorujeme ho

    # Kontrola, že nová hesla se shodují
    if password_data.new_password != password_data.new_password_confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match"
        )

    # Kontrola minimální délky hesla
    if len(password_data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long"
        )

    # Kontrola, že nové heslo není stejné jako staré (jen pro vlastní změnu)
    if is_own_password and password_data.password == password_data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )

    # Změň heslo (hashuj nové heslo)
    target_user.client_secret = get_password_hash(password_data.new_password)
    db.commit()

    return {
        "message": "Password successfully changed",
        "client_id": client_id,
        "changed_by": current_user.client_id
    }
