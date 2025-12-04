# backend/core/schemas/product.py
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# =====================================================
# PRODUCT SCHEMAS
# =====================================================
class ProductBase(BaseModel):
    """
    Base schema pro Product.
    
    POVINNÁ POLE:
    - name (název produktu)

    Vše ostatní je optional s rozumnými výchozími hodnotami.
    """
    # POVINNÁ
    name: str = Field(..., min_length=1, max_length=255, description="Název produktu/služby")
    # OPTIONAL - Identifikace
    code: Optional[str] = Field(None, max_length=50, description="Interní kód / SKU")
    ean: Optional[str] = Field(None, max_length=20, description="EAN/GTIN kód")
    description: Optional[str] = Field(None, description="Popis produktu")

    # OPTIONAL - Jednotka
    unit: Optional[str] = Field("ks", max_length=20, description="Jednotka (ks, hod, měsíc...)")

    # OPTIONAL - Cena
    price: Optional[float] = Field(0.0, ge=0, description="Prodejní cena")
    currency: Optional[str] = Field("CZK", max_length=3)
    tax_rate: Optional[float] = Field(21.0, ge=0, le=100, description="Sazba DPH (%)")
    cost: Optional[float] = Field(0.0, ge=0, description="Nákupní/vlastní náklady")

    # OPTIONAL - Kategorizace
    category: Optional[str] = Field(None, max_length=100, description="Kategorie produktu")
    tags: Optional[List[str]] = Field(default_factory=list)

    # OPTIONAL - Stav
    is_active: Optional[bool] = Field(True, description="Je v nabídce?")
    is_featured: Optional[bool] = Field(False, description="Oblíbený/doporučený")

    # OPTIONAL - Metadata
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)
    notes: Optional[str] = Field(None, description="Interní poznámky")


class ProductCreate(ProductBase):
    """
    Schema pro vytvoření produktu.
    
    Minimální příklad:
    {
        "name": "Konzultace"
    }
    
    S více detaily:
    {
        "name": "Webová stránka - základní",
        "code": "WEB-001",
        "price": 25000,
        "unit": "projekt",
        "tax_rate": 21,
        "category": "Webové služby"
    }
    """
    pass


class ProductUpdate(BaseModel):
    """Schema pro aktualizaci - všechna pole jsou optional"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, max_length=50)
    ean: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    unit: Optional[str] = Field(None, max_length=20)
    price: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    tax_rate: Optional[float] = Field(None, ge=0, le=100)
    cost: Optional[float] = Field(None, ge=0)
    category: Optional[str] = Field(None, max_length=100)
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    custom_fields: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class ProductPublic(ProductBase):
    """Schema pro response - obsahuje computed fields"""
    id: int

    # Computed fields
    margin: Optional[float] = None
    margin_percent: Optional[float] = None
    price_with_vat: Optional[float] = None

    # Audit
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class ProductSimple(BaseModel):
    """Zjednodušená verze pro dropdown/výběr"""
    id: int
    name: str
    code: Optional[str] = None
    price: float
    unit: str
    tax_rate: float

    class Config:
        from_attributes = True


class ProductListItem(BaseModel):
    """Položka pro seznam produktů"""
    id: int
    name: str
    code: Optional[str] = None
    price: float
    currency: str
    unit: str
    category: Optional[str] = None
    is_active: bool
    is_featured: bool

    class Config:
        from_attributes = True


# =====================================================
# HELPER - Příklady použití
# =====================================================
"""
MINIMÁLNÍ VYTVOŘENÍ:

{
    "name": "Hodinová konzultace"
}

PRODUKT S CENOU:

{
    "name": "Logo design"
    "code": "LOGO-001",
    "price": 5000,
    "unit": "ks",
    "tax_rate": 21,
    "category": "Grafika"
}

SLUŽBA S HODINOVOU SAZBOU:

{
    "name": "Programování - Python"
    "code": "DEV-PY",
    "price": 1500,
    "cost": 800,
    "unit": "hod",
    "tax_rate": 21,
    "category": "Vývoj",
    "tags": ["programování", "python", "backend"]
}

MĚSÍČNÍ SLUŽBA:

{
    "name": "Webhosting - základní",
    "code": "HOST-BASIC",
    "price": 199,
    "unit": "měsíc",
    "category": "Hosting",
    "description": "Webhosting do 5GB, 1 doména"
}
"""