# routers/leads.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.core.services.auth import get_current_user, require_permissions
from backend.core.db import get_db
from backend.core.models.auth import User, Lead, LeadStatus, PermissionType
from backend.core.schemas.auth import LeadCreate, LeadUpdate, LeadPublic
from backend.core.utils.search import apply_dynamic_filters,get_filter_params
router = APIRouter()


@router.get(
    "/",
    response_model=List[LeadPublic],
    dependencies=[Depends(require_permissions("leads", PermissionType.READ))]
)
async def list_leads(
    skip: int = 0,
    limit: int = 100,
    filters: dict = Depends(get_filter_params()),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí seznam leadů s možností filtrování."""
    print("Filters:", filters)
    query = apply_dynamic_filters(db.query(Lead), Lead, filters)
    return query.offset(skip).limit(limit).all()


@router.post(
    "/",
    response_model=LeadPublic,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("leads", PermissionType.WRITE))]
)
async def create_lead(
    lead_data: LeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vytvoří nový lead."""
    # Zkontroluj, zda user existuje
    user = db.query(User).filter(User.id == lead_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with this client_id not found"
        )

    lead = Lead(**lead_data.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)

    return lead


@router.get(
    "/{lead_id}",
    response_model=LeadPublic,
    dependencies=[Depends(require_permissions("leads", PermissionType.READ))]
)
async def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí detail leadu."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )
    return lead

@router.patch(
    "/{lead_id}",
    response_model=LeadPublic,
    dependencies=[Depends(require_permissions("leads", PermissionType.WRITE))]
)
@router.put(
    "/{lead_id}",
    response_model=LeadPublic,
    dependencies=[Depends(require_permissions("leads", PermissionType.WRITE))]
)
async def update_lead(
    lead_id: int,
    lead_data: LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aktualizuje lead."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )

    # Aktualizuj pouze poskytnutá pole
    update_data = lead_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)

    return lead


@router.delete(
    "/{lead_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("leads", PermissionType.WRITE))]
)
async def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Smaže lead."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )

    db.delete(lead)
    db.commit()

    return None


@router.post(
    "/bulk",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("leads", PermissionType.WRITE))]
)
async def bulk_delete_leads(
    ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Hromadné mazání leadů."""
    db.query(Lead).filter(Lead.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return None
