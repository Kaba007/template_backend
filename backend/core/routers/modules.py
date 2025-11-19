# routers/modules.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.services.auth import get_current_user, require_permissions
from backend.core.db import get_db
from backend.core.models.auth import User, Module, PermissionType
from backend.core.schemas.auth import ModuleCreate, ModuleUpdate, ModulePublic

router = APIRouter()


@router.get(
    "/",
    response_model=List[ModulePublic],
    dependencies=[Depends(require_permissions("modules", PermissionType.READ))]
)
async def list_modules(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí seznam modulů."""
    modules = db.query(Module).offset(skip).limit(limit).all()
    return modules


@router.post(
    "/",
    response_model=ModulePublic,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("modules", PermissionType.WRITE))]
)
async def create_module(
    module_data: ModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vytvoří nový modul."""
    # Zkontroluj, zda modul již existuje
    existing_module = db.query(Module).filter(Module.name == module_data.name).first()
    if existing_module:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Module with this name already exists"
        )

    module = Module(**module_data.model_dump())
    db.add(module)
    db.commit()
    db.refresh(module)

    return module


@router.get(
    "/{module_id}",
    response_model=ModulePublic,
    dependencies=[Depends(require_permissions("modules", PermissionType.READ))]
)
async def get_module(
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí detail modulu."""
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    return module


@router.patch(
    "/{module_id}",
    response_model=ModulePublic,
    dependencies=[Depends(require_permissions("modules", PermissionType.WRITE))]
)
async def update_module(
    module_id: int,
    module_data: ModuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aktualizuje modul."""
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )

    # Zkontroluj duplicitní název, pokud se mění
    if module_data.name and module_data.name != module.name:
        existing_module = db.query(Module).filter(Module.name == module_data.name).first()
        if existing_module:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Module with this name already exists"
            )

    # Aktualizuj pouze poskytnutá pole
    update_data = module_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(module, field, value)

    db.commit()
    db.refresh(module)

    return module


@router.delete(
    "/{module_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("modules", PermissionType.ADMIN))]
)
async def delete_module(
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Smaže modul."""
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )

    db.delete(module)
    db.commit()

    return None
