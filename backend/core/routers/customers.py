# backend/routers/companies.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.core.services.auth import get_current_user, require_permissions
from backend.core.db import get_db
from backend.core.models.auth import User, PermissionType
from backend.core.models.invocie import Company, CompanyType
from backend.core.schemas.invoice import CompanyCreate, CompanyUpdate, CompanyPublic, CompanySimple
from backend.core.utils.search import apply_dynamic_filters, get_filter_params

router = APIRouter()


@router.get(
    "/",
    response_model=List[CompanyPublic],
    dependencies=[Depends(require_permissions("companies", PermissionType.READ))]
)
async def list_companies(
    skip: int = 0,
    limit: int = 100,
    company_type: Optional[CompanyType] = None,
    filters: dict = Depends(get_filter_params()),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí seznam společností s možností filtrování."""
    query = db.query(Company)

    # Filtr podle typu
    if company_type:
        query = query.filter(
            (Company.company_type == company_type) |
            (Company.company_type == CompanyType.BOTH)
        )

    query = apply_dynamic_filters(query, Company, filters)
    return query.offset(skip).limit(limit).all()




@router.get(
    "/suppliers/{id}",
    response_model=CompanySimple,
    dependencies=[Depends(require_permissions("companies", PermissionType.READ))]
)
async def get_supplier_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí jednoho dodavatele podle ID."""
    company = db.query(Company).filter(
        Company.id == id,
        Company.is_active == True,
        (Company.company_type == CompanyType.SUPPLIER) |
        (Company.company_type == CompanyType.BOTH)
    ).first()

    if not company:
        raise HTTPException(status_code=404, detail="Dodavatel nenalezen")

    return company
@router.get(
    "/customers/{id}",
    response_model=CompanySimple,
    dependencies=[Depends(require_permissions("companies", PermissionType.READ))]
)
async def get_customers_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí jednoho dodavatele podle ID."""
    company = db.query(Company).filter(
        Company.id == id,
        Company.is_active == True,
        (Company.company_type == CompanyType.CUSTOMER) |
        (Company.company_type == CompanyType.BOTH)
    ).first()

    if not company:
        raise HTTPException(status_code=404, detail="Odběratel nenalezen")

    return company


@router.get(
    "/customers",
    response_model=List[CompanySimple],
    dependencies=[Depends(require_permissions("companies", PermissionType.READ))]
)
async def list_customers(
    name: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí seznam odběratelů (pro dropdown)."""
    query = db.query(Company).filter(
        Company.is_active == True,
        (Company.company_type == CompanyType.CUSTOMER) |
        (Company.company_type == CompanyType.BOTH)
    )

    if name:
        query = query.filter(Company.name.ilike(f"%{name}%"))

    return query.offset(skip).limit(limit).all()


@router.get(
    "/suppliers",
    response_model=List[CompanySimple],
    dependencies=[Depends(require_permissions("companies", PermissionType.READ))]
)
async def list_suppliers(
    name: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí seznam dodavatelů (pro dropdown)."""
    query = db.query(Company).filter(
        Company.is_active == True,
        (Company.company_type == CompanyType.SUPPLIER) |
        (Company.company_type == CompanyType.BOTH)
    )

    if name:
        query = query.filter(Company.name.ilike(f"%{name}%"))

    return query.offset(skip).limit(limit).all()

@router.post(
    "/",
    response_model=CompanyPublic,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("companies", PermissionType.WRITE))]
)
async def create_company(
    company_data: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vytvoří novou společnost."""
    company = Company(**company_data.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get(
    "/{company_id}",
    response_model=CompanyPublic,
    dependencies=[Depends(require_permissions("companies", PermissionType.READ))]
)
async def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí detail společnosti."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    return company


@router.patch("/{company_id}", response_model=CompanyPublic, dependencies=[Depends(require_permissions("companies", PermissionType.WRITE))])
@router.put("/{company_id}", response_model=CompanyPublic, dependencies=[Depends(require_permissions("companies", PermissionType.WRITE))])
async def update_company(
    company_id: int,
    company_data: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aktualizuje společnost."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    update_data = company_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)

    db.commit()
    db.refresh(company)
    return company


@router.delete(
    "/{company_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("companies", PermissionType.WRITE))]
)
async def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Smaže společnost."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    db.delete(company)
    db.commit()
    return None
