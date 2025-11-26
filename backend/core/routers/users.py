# routers/modules.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status,Query
from sqlalchemy.orm import Session

from backend.core.services.auth import get_current_user, require_permissions, get_password_hash
from backend.core.db import get_db
from backend.core.models.auth import User, PermissionType, Role, UserRoleLink
from backend.core.schemas.auth import UserCreate, UserUpdate, UserPublic, UserWithRoles,UserRoleAssignment,RolePublic
from backend.core.middleware.rate_limiter import create_rate_limiter
from backend.core.utils.search import apply_dynamic_filters,get_filter_params
router = APIRouter()
user_limiter = create_rate_limiter(requests=100, window=60, prefix="user_limiter")

@router.get(
    "/",
    response_model=List[UserPublic],
    dependencies=[Depends(require_permissions("users", PermissionType.READ)),Depends(user_limiter)]
)
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    filters: dict = Depends(get_filter_params()),
    current_user: User = Depends(get_current_user)
):
    """Vrátí seznam uživatelů."""
    query = apply_dynamic_filters(db.query(User), User, filters)
    return query.offset(skip).limit(limit).all()


@router.post(
    "/",
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("users", PermissionType.WRITE))]
)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vytvoří nového uživatele."""
    # Zkontroluj, zda uživatel již existuje
    existing_user = db.query(User).filter(User.client_id == user_data.client_id).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this client_id already exists"
        )

    # Vytvoř uživatele s hashovaným heslem
    user = User(
        client_id=user_data.client_id,
        client_secret=get_password_hash(user_data.client_secret),
        email=user_data.email,
        is_active=user_data.is_active
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.get(
    "/{user_id}",
    response_model=UserWithRoles,
    dependencies=[Depends(require_permissions("users", PermissionType.READ))]
)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí detail uživatele."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.patch(
    "/{user_id}",
    response_model=UserPublic,
    dependencies=[Depends(require_permissions("users", PermissionType.WRITE))]
)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aktualizuje uživatele."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Aktualizuj pouze poskytnutá pole
    update_data = user_data.model_dump(exclude_unset=True)

    # Hashuj heslo, pokud je poskytnuto
    if "client_secret" in update_data:
        update_data["client_secret"] = get_password_hash(update_data["client_secret"])

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    return user


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("users", PermissionType.ADMIN))]
)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Smaže uživatele."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    db.delete(user)
    db.commit()

    return None


@router.post(
    "/{user_id}/roles",
    response_model=UserWithRoles,
    dependencies=[Depends(require_permissions("users", PermissionType.WRITE))]
)
async def assign_role_to_user(
    user_id: int,
    role_assignment: UserRoleAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Přiřadí roli uživateli."""
    # Zkontroluj, zda uživatel existuje
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Zkontroluj, zda role existuje
    role = db.query(Role).filter(Role.id == role_assignment.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    # Zkontroluj, zda už vazba existuje
    existing_link = db.query(UserRoleLink).filter(
        UserRoleLink.user_id == user_id,
        UserRoleLink.role_id == role_assignment.role_id
    ).first()

    if existing_link:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has this role"
        )

    # Vytvoř vazbu
    user_role_link = UserRoleLink(
        user_id=user_id,
        role_id=role_assignment.role_id
    )

    db.add(user_role_link)
    db.commit()
    db.refresh(user)

    return user


@router.delete(
    "/{user_id}/roles/{role_id}",
    response_model=UserWithRoles,
    dependencies=[Depends(require_permissions("users", PermissionType.WRITE))]
)
async def remove_role_from_user(
    user_id: int,
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Odebere roli uživateli."""
    # Zkontroluj, zda uživatel existuje
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Zkontroluj, zda vazba existuje
    user_role_link = db.query(UserRoleLink).filter(
        UserRoleLink.user_id == user_id,
        UserRoleLink.role_id == role_id
    ).first()

    if not user_role_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not have this role"
        )

    # Smaž vazbu
    db.delete(user_role_link)
    db.commit()
    db.refresh(user)

    return user


@router.get(
    "/{user_id}/roles",
    response_model=List[RolePublic],
    dependencies=[Depends(require_permissions("users", PermissionType.READ))]
)
async def get_user_roles(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí seznam rolí uživatele."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user.roles
