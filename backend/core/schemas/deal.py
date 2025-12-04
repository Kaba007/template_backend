# backend/core/schemas/deal.py
from datetime import datetime, date
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, field_validator
from enum import Enum

from .utils import PaymentMethod


# =====================================================
# ENUMS
# =====================================================
class DealStatus(str, Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PaymentStatus(str, Enum):
    UNPAID = "unpaid"
    PARTIAL = "partial"
    PAID = "paid"
    OVERPAID = "overpaid"
    REFUNDED = "refunded"


class DiscountType(str, Enum):
    PERCENT = "percent"
    FIXED = "fixed"


# =====================================================
# DEAL ITEM
# =====================================================
class DealItemBase(BaseModel):
    """Položka dealu/objednávky"""
    product_id: Optional[int] = Field(None, description="ID produktu z katalogu (optional)")
    name: str = Field(..., min_length=1, max_length=255, description="Název položky")
    description: Optional[str] = None
    code: Optional[str] = Field(None, max_length=50, description="Kód produktu")
    quantity: float = Field(default=1, ge=0)
    unit: Optional[str] = Field(default="ks", max_length=20)
    unit_price: float = Field(default=0, ge=0)
    discount_percent: float = Field(default=0, ge=0, le=100)
    vat_rate: float = Field(default=21, ge=0, le=100)
    sort_order: Optional[int] = Field(default=0)


class DealItem(DealItemBase):
    """Položka dealu s computed fields"""
    subtotal: Optional[float] = None
    discount_amount: Optional[float] = None
    subtotal_after_discount: Optional[float] = None
    vat_amount: Optional[float] = None
    total: Optional[float] = None

    @field_validator('subtotal', mode='before')
    @classmethod
    def calculate_subtotal(cls, v, info):
        values = info.data
        quantity = values.get('quantity', 0) or 0
        unit_price = values.get('unit_price', 0) or 0
        return round(quantity * unit_price, 2)

    @field_validator('discount_amount', mode='before')
    @classmethod
    def calculate_discount(cls, v, info):
        values = info.data
        quantity = values.get('quantity', 0) or 0
        unit_price = values.get('unit_price', 0) or 0
        discount_percent = values.get('discount_percent', 0) or 0
        subtotal = quantity * unit_price
        return round(subtotal * (discount_percent / 100), 2)

    @field_validator('subtotal_after_discount', mode='before')
    @classmethod
    def calculate_subtotal_after_discount(cls, v, info):
        values = info.data
        quantity = values.get('quantity', 0) or 0
        unit_price = values.get('unit_price', 0) or 0
        discount_percent = values.get('discount_percent', 0) or 0
        subtotal = quantity * unit_price
        discount = subtotal * (discount_percent / 100)
        return round(subtotal - discount, 2)

    @field_validator('vat_amount', mode='before')
    @classmethod
    def calculate_vat(cls, v, info):
        values = info.data
        quantity = values.get('quantity', 0) or 0
        unit_price = values.get('unit_price', 0) or 0
        discount_percent = values.get('discount_percent', 0) or 0
        vat_rate = values.get('vat_rate', 0) or 0
        subtotal = quantity * unit_price
        discount = subtotal * (discount_percent / 100)
        base = subtotal - discount
        return round(base * (vat_rate / 100), 2)

    @field_validator('total', mode='before')
    @classmethod
    def calculate_total(cls, v, info):
        values = info.data
        quantity = values.get('quantity', 0) or 0
        unit_price = values.get('unit_price', 0) or 0
        discount_percent = values.get('discount_percent', 0) or 0
        vat_rate = values.get('vat_rate', 0) or 0
        subtotal = quantity * unit_price
        discount = subtotal * (discount_percent / 100)
        base = subtotal - discount
        vat = base * (vat_rate / 100)
        return round(base + vat, 2)


# =====================================================
# DEAL SCHEMAS
# =====================================================
class DealBase(BaseModel):
    """
    Base schema pro Deal.
    
    POVINNÁ POLE:
    - title (název dealu)
    - user_id (vlastník)
    
    Vše ostatní je optional.
    """
    # POVINNÁ
    title: str = Field(..., min_length=1, max_length=255, description="Název obchodu/objednávky")
    user_id:  Union[str, int]  = Field(..., description="ID uživatele (vlastníka)")

    # OPTIONAL - Vazby
    lead_id: Optional[Union[str, int]]  = Field(None, description="ID leadu (odkud deal přišel)")
    company_id:  Optional[Union[str, int]]  = Field(None, description="ID společnosti")
    company_name: Optional[str] = Field(None, max_length=255, description="Název firmy (volný text)")

    # OPTIONAL - Identifikace
    deal_number: Optional[str] = Field(None, max_length=50, description="Číslo objednávky (auto-generováno)")
    description: Optional[str] = None

    # OPTIONAL - Status
    status: Optional[DealStatus] = DealStatus.DRAFT

    # OPTIONAL - Kontakt
    contact_person: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)

    # OPTIONAL - Položky
    items: Optional[List[DealItem]] = Field(default_factory=list)

    # OPTIONAL - Finance
    currency: Optional[str] = Field("CZK", max_length=3)
    discount: Optional[float] = Field(0.0, ge=0, description="Sleva na celou objednávku")
    discount_type: Optional[DiscountType] = DiscountType.PERCENT
    rounding: Optional[float] = Field(0.0, description="Zaokrouhlení")

    # OPTIONAL - Platba
    payment_method: Optional[PaymentMethod] = PaymentMethod.BANK_TRANSFER

    # OPTIONAL - Datumy
    deal_date: Optional[date] = Field(None, description="Datum uzavření obchodu")
    delivery_date: Optional[date] = Field(None, description="Očekávané datum dodání")

    # OPTIONAL - Přiřazení
    assigned_to: Optional[Union[str, int]]  = Field(None, description="ID uživatele, komu je přiřazeno")

    # OPTIONAL - Metadata
    tags: Optional[List[str]] = Field(default_factory=list)
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)
    notes: Optional[str] = Field(None, description="Poznámky pro zákazníka")
    internal_notes: Optional[str] = Field(None, description="Interní poznámky")


class DealCreate(DealBase):
    """
    Schema pro vytvoření dealu.
    
    Minimální příklad:
    {
        "title": "Web pro klienta",
        "user_id": "user123"
    }
    
    S položkami:
    {
        "title": "Web pro klienta",
        "user_id": "user123",
        "company_name": "ACME s.r.o.",
        "items": [
            {"name": "Webová stránka", "quantity": 1, "unit_price": 25000},
            {"name": "Hosting (rok)", "quantity": 1, "unit_price": 2400}
        ]
    }
    
    Konverze z leadu:
    {
        "title": "Web pro klienta",
        "user_id": "user123",
        "lead_id": 42,
        "company_id": 5
    }
    """
    pass


class DealUpdate(BaseModel):
    """Schema pro aktualizaci - všechna pole jsou optional"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    lead_id:  Optional[Union[str, int]]  = None
    company_id:  Optional[Union[str, int]]  = None
    company_name: Optional[str] = None
    status: Optional[DealStatus] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    items: Optional[List[DealItem]] = None
    currency: Optional[str] = None
    discount: Optional[float] = Field(None, ge=0)
    discount_type: Optional[DiscountType] = None
    rounding: Optional[float] = None
    payment_method: Optional[PaymentMethod] = None
    deal_date: Optional[date] = None
    delivery_date: Optional[date] = None
    assigned_to:  Optional[Union[str, int]]  = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    is_active: Optional[bool] = None


class DealPublic(DealBase):
    """Schema pro response - obsahuje computed fields"""
    id: int
    deal_number: Optional[Union[str, int]] 

    # Computed finance
    subtotal: float = 0.0
    discount_amount: float = 0.0
    subtotal_after_discount: float = 0.0
    vat_breakdown: Dict[str, Dict[str, float]] = Field(default_factory=dict)
    total_vat: float = 0.0
    total: float = 0.0

    # Platby
    payment_status: PaymentStatus = PaymentStatus.UNPAID
    paid_amount: float = 0.0
    remaining_amount: Optional[float] = None
    invoiced_amount: Optional[float] = None

    # Datumy
    completed_at: Optional[datetime] = None

    # Vztahy - enriched data
    lead_data: Optional[Dict[str, Any]] = None  # Obohacená data z Lead
    company_data: Optional[Dict[str, Any]] = None  # Obohacená data z Company
    invoices_summary: Optional[List[Dict[str, Any]]] = None  # Seznam faktur

    # Audit
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class DealSimple(BaseModel):
    """Zjednodušená verze pro dropdown/reference"""
    id: int
    deal_number: str
    title: str
    status: DealStatus
    total: float
    currency: str
    payment_status: PaymentStatus

    class Config:
        from_attributes = True


class DealListItem(BaseModel):
    """Položka pro seznam dealů"""
    id: int
    deal_number: str
    title: str
    status: DealStatus
    company_name: Optional[str] = None
    total: float
    currency: str
    payment_status: PaymentStatus
    paid_amount: float
    deal_date: Optional[date] = None
    delivery_date: Optional[date] = None
    created_at: datetime
    items: Optional[List[DealItem]] = Field(default_factory=list)
    class Config:
        from_attributes = True


class DealStats(BaseModel):
    """Statistiky dealů"""
    total_count: int
    by_status: Dict[str, int]
    total_value: float
    paid_value: float
    unpaid_value: float
    avg_deal_value: float


# =====================================================
# KONVERZE Z LEADU
# =====================================================
class LeadToDealConvert(BaseModel):
    """Schema pro konverzi leadu na deal"""
    lead_id: int = Field(..., description="ID leadu k konverzi")
    title: Optional[str] = Field(None, description="Název dealu (default: název leadu)")
    items: Optional[List[DealItem]] = Field(default_factory=list, description="Položky objednávky")
    deal_date: Optional[date] = Field(None, description="Datum uzavření")
    notes: Optional[str] = None


# =====================================================
# HELPER - Příklady použití
# =====================================================
"""
MINIMÁLNÍ VYTVOŘENÍ:

{
    "title": "Nový projekt",
    "user_id": "user123"
}

S FIRMOU Z DATABÁZE:

{
    "title": "Web pro e-shop",
    "user_id": "user123",
    "company_id": 5,
    "deal_date": "2025-01-15"
}

S POLOŽKAMI:

{
    "title": "Kompletní web",
    "user_id": "user123",
    "company_name": "ACME s.r.o.",
    "contact_person": "Jan Novák",
    "email": "jan@acme.cz",
    "items": [
        {
            "name": "Návrh webu",
            "quantity": 1,
            "unit": "ks",
            "unit_price": 15000,
            "vat_rate": 21
        },
        {
            "name": "Programování",
            "quantity": 40,
            "unit": "hod",
            "unit_price": 1500,
            "vat_rate": 21
        },
        {
            "name": "Hosting",
            "quantity": 12,
            "unit": "měsíc",
            "unit_price": 199,
            "vat_rate": 21
        }
    ],
    "discount": 5,
    "discount_type": "percent"
}

KONVERZE Z LEADU:

{
    "lead_id": 42,
    "title": "Web pro ACME",
    "items": [
        {"name": "Webová stránka", "quantity": 1, "unit_price": 50000}
    ]
}
"""