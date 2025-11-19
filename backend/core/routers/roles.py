# routers/roles.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.services.auth import get_current_user, require_permissions
from backend.core.db import get_db
from backend.core.models.auth import User, Role, Module, RoleModuleLink, PermissionType
from backend.core.schemas.auth import(
    RoleCreate,
    RoleUpdate,
    RolePublic,
    RoleWithPermissions,
    RoleModuleAssignment,
    ModulePublic
)

router = APIRouter()


@router.get(
    "/",
    response_model=List[RolePublic],
    dependencies=[Depends(require_permissions("roles", PermissionType.READ))]
)
async def list_roles(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí seznam rolí."""
    roles = db.query(Role).offset(skip).limit(limit).all()
    return roles


@router.post(
    "/",
    response_model=RolePublic,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("roles", PermissionType.WRITE))]
)
async def create_role(
    role_data: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vytvoří novou roli."""
    existing_role = db.query(Role).filter(Role.name == role_data.name).first()
    if existing_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role with this name already exists"
        )

    role = Role(**role_data.model_dump())
    db.add(role)
    db.commit()
    db.refresh(role)

    return role
@router.get(
    "/{role_id}",
    response_model=RoleWithPermissions,
    dependencies=[Depends(require_permissions("roles", PermissionType.READ))]
)
async def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí detail role."""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    return role


@router.patch(
    "/{role_id}",
    response_model=RolePublic,
    dependencies=[Depends(require_permissions("roles", PermissionType.WRITE))]
)
async def update_role(
    role_id: int,
    role_data: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aktualizuje roli."""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    # Zkontroluj duplicitní název
    if role_data.name and role_data.name != role.name:
        existing_role = db.query(Role).filter(Role.name == role_data.name).first()
        if existing_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role with this name already exists"
            )

    # Aktualizuj pouze poskytnutá pole
    update_data = role_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(role, field, value)

    db.commit()
    db.refresh(role)

    return role


@router.delete(
    "/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("roles", PermissionType.ADMIN))]
)
async def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Smaže roli."""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    db.delete(role)
    db.commit()

    return None


@router.post(
    "/{role_id}/modules",
    response_model=RoleWithPermissions,
    dependencies=[Depends(require_permissions("roles", PermissionType.WRITE))]
)
async def assign_module_to_role(
    role_id: int,
    module_assignment: RoleModuleAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Přiřadí modul s oprávněním roli."""
    # Zkontroluj, zda role existuje
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    # Zkontroluj, zda modul existuje
    module = db.query(Module).filter(Module.id == module_assignment.module_id).first()
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )

    # Zkontroluj, zda už vazba s tímto oprávněním existuje
    existing_link = db.query(RoleModuleLink).filter(
        RoleModuleLink.role_id == role_id,
        RoleModuleLink.module_id == module_assignment.module_id,
        RoleModuleLink.permission == module_assignment.permission
    ).first()

    if existing_link:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role already has this permission for this module"
        )

    # Vytvoř vazbu
    role_module_link = RoleModuleLink(
        role_id=role_id,
        module_id=module_assignment.module_id,
        permission=module_assignment.permission
    )

    db.add(role_module_link)
    db.commit()
    db.refresh(role)

    return role


@router.delete(
    "/{role_id}/modules/{module_id}/permissions/{permission}",
    response_model=RoleWithPermissions,
    dependencies=[Depends(require_permissions("roles", PermissionType.WRITE))]
)
async def remove_module_from_role(
    role_id: int,
    module_id: int,
    permission: PermissionType,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Odebere modul s konkrétním oprávněním z role."""
    # Zkontroluj, zda role existuje
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    # Zkontroluj, zda vazba existuje
    role_module_link = db.query(RoleModuleLink).filter(
        RoleModuleLink.role_id == role_id,
        RoleModuleLink.module_id == module_id,
        RoleModuleLink.permission == permission
    ).first()

    if not role_module_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role does not have this permission for this module"
        )

    # Smaž vazbu
    db.delete(role_module_link)
    db.commit()
    db.refresh(role)

    return role


@router.get(
    "/{role_id}/modules",
    response_model=List[ModulePublic],
    dependencies=[Depends(require_permissions("roles", PermissionType.READ))]
)
async def get_role_modules(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí seznam modulů přiřazených roli."""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    return role.modules
