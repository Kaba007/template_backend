# backend/routers/products.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.core.services.auth import get_current_user, require_permissions
from backend.core.db import get_db
from backend.core.models.auth import User, PermissionType
from backend.core.models.product import Product
from backend.core.schemas.product import (
    ProductCreate, ProductUpdate, ProductPublic, 
    ProductSimple, ProductListItem
)
from backend.core.utils.search import apply_dynamic_filters, get_filter_params

router = APIRouter()


# =====================================================
# LIST & SEARCH
# =====================================================
@router.get(
    "/",
    response_model=List[ProductListItem],
    dependencies=[Depends(require_permissions("products", PermissionType.READ))]
)
async def list_products(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = True,
    category: Optional[str] = None,
    is_featured: Optional[bool] = None,
    search: Optional[str] = None,
    filters: dict = Depends(get_filter_params()),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Vrátí seznam produktů s možností filtrování.
    
    - **search**: Hledání v názvu a kódu
    - **category**: Filtr podle kategorie
    - **is_active**: Pouze aktivní produkty (default: True)
    - **is_featured**: Pouze oblíbené/doporučené
    """
    query = db.query(Product)

    # Filtr podle aktivnosti
    if is_active is not None:
        query = query.filter(Product.is_active == is_active)

    # Filtr podle kategorie
    if category:
        query = query.filter(Product.category == category)

    # Filtr podle oblíbených
    if is_featured is not None:
        query = query.filter(Product.is_featured == is_featured)

    # Fulltext search
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(search_term)) |
            (Product.code.ilike(search_term)) |
            (Product.description.ilike(search_term))
        )

    # Dynamické filtry
    query = apply_dynamic_filters(query, Product, filters)

    # Řazení - oblíbené nahoře, pak podle názvu
    query = query.order_by(Product.is_featured.desc(), Product.name.asc())

    return query.offset(skip).limit(limit).all()


@router.get(
    "/simple",
    response_model=List[ProductSimple],
    dependencies=[Depends(require_permissions("products", PermissionType.READ))]
)
async def list_products_simple(
    search: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Vrátí zjednodušený seznam produktů pro dropdown/výběr.
    Pouze aktivní produkty.
    """
    query = db.query(Product).filter(
        Product.is_active == True
    )

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(search_term)) |
            (Product.code.ilike(search_term))
        )

    if category:
        query = query.filter(Product.category == category)

    query = query.order_by(Product.is_featured.desc(), Product.name.asc())

    return query.limit(limit).all()


@router.get(
    "/categories",
    response_model=List[str],
    dependencies=[Depends(require_permissions("products", PermissionType.READ))]
)
async def list_product_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí seznam všech kategorií produktů."""
    categories = db.query(Product.category).filter(
        Product.category.isnot(None),
        Product.is_active == True
    ).distinct().all()

    return [cat[0] for cat in categories if cat[0]]


# =====================================================
# CRUD
# =====================================================
@router.post(
    "/",
    response_model=ProductPublic,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("products", PermissionType.WRITE))]
)
async def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Vytvoří nový produkt.
    
    Minimální požadavky:
    - name (název produktu)

    """
    data = product_data.model_dump()
    data['created_by'] = current_user.id

    product = Product(**data)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get(
    "/{product_id}",
    response_model=ProductPublic,
    dependencies=[Depends(require_permissions("products", PermissionType.READ))]
)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí detail produktu."""
    product = db.query(Product).filter(
        Product.id == product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produkt nenalezen"
        )
    return product


@router.patch("/{product_id}", response_model=ProductPublic, dependencies=[Depends(require_permissions("products", PermissionType.WRITE))])
@router.put("/{product_id}", response_model=ProductPublic, dependencies=[Depends(require_permissions("products", PermissionType.WRITE))])
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aktualizuje produkt."""
    product = db.query(Product).filter(
        Product.id == product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produkt nenalezen"
        )

    update_data = product_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("products", PermissionType.WRITE))]
)
async def delete_product(
    product_id: int,
    permanent: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Smaže produkt.
    
    - **permanent=False**: Soft delete (nastaví is_active=False)
    - **permanent=True**: Trvalé smazání
    """
    product = db.query(Product).filter(
        Product.id == product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produkt nenalezen"
        )

    if permanent:
        db.delete(product)
    else:
        product.is_active = False

    db.commit()
    return None


# =====================================================
# BULK OPERATIONS
# =====================================================
@router.post(
    "/bulk/deactivate",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permissions("products", PermissionType.WRITE))]
)
async def bulk_deactivate_products(
    product_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Hromadně deaktivuje produkty."""
    updated = db.query(Product).filter(
        Product.id.in_(product_ids)
    ).update({Product.is_active: False}, synchronize_session=False)

    db.commit()
    return {"deactivated": updated}


@router.post(
    "/bulk/activate",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permissions("products", PermissionType.WRITE))]
)
async def bulk_activate_products(
    product_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Hromadně aktivuje produkty."""
    updated = db.query(Product).filter(
        Product.id.in_(product_ids)
    ).update({Product.is_active: True}, synchronize_session=False)

    db.commit()
    return {"activated": updated}


# =====================================================
# HELPER - Převod produktu na položku
# =====================================================
@router.get(
    "/{product_id}/as-item",
    dependencies=[Depends(require_permissions("products", PermissionType.READ))]
)
async def get_product_as_item(
    product_id: int,
    quantity: float = 1,
    discount_percent: float = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Vrátí produkt jako položku pro deal/fakturu.
    Užitečné pro frontend - předvyplnění formuláře.
    """
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.is_active == True
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produkt nenalezen"
        )

    return product.to_deal_item(quantity=quantity, discount_percent=discount_percent)