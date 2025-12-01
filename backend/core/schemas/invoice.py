# backend/core/schemas/invoice.py
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator
from enum import Enum
from .utils import VatMode, PaymentMethod


# =====================================================
# ENUMS
# =====================================================
class InvoiceType(str, Enum):
    INVOICE = "invoice"
    PROFORMA = "proforma"
    CREDIT_NOTE = "credit_note"
    DEBIT_NOTE = "debit_note"
    RECEIPT = "receipt"


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


# =====================================================
# INVOICE ITEM
# =====================================================
class InvoiceItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    quantity: float = Field(default=1, ge=0)
    unit: Optional[str] = Field(default="ks", max_length=20)
    unit_price: float = Field(default=0, ge=0)
    discount_percent: float = Field(default=0, ge=0, le=100)
    vat_rate: float = Field(default=21, ge=0, le=100)

    # Kódy
    sku: Optional[str] = None  # Kód produktu
    ean: Optional[str] = None  # EAN kód


class InvoiceItem(InvoiceItemBase):
    """Položka faktury s computed fields"""
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
# INVOICE SCHEMAS
# =====================================================
class InvoiceBase(BaseModel):
    """Base schema - všechna pole jako optional kromě minimálních požadavků"""
    
    # POVINNÁ POLE - pouze to nejnutnější
    supplier_id: int = Field(..., description="ID dodavatele")
    customer_id: int = Field(..., description="ID odběratele")
    issue_date: date = Field(..., description="Datum vystavení")
    due_date: date = Field(..., description="Datum splatnosti")
    
    # VŠE OSTATNÍ JE OPTIONAL
    # Typ a identifikace
    invoice_type: Optional[InvoiceType] = InvoiceType.INVOICE
    invoice_number: Optional[str] = None  # Auto-generováno
    variable_symbol: Optional[str] = None
    constant_symbol: Optional[str] = None
    specific_symbol: Optional[str] = None
    order_number: Optional[str] = None
    contract_number: Optional[str] = None
    proforma_id: Optional[int] = None
    
    # Vazba na Deal (NOVÉ!)
    deal_id: Optional[int] = Field(None, description="ID objednávky/dealu")

    # Datumy
    tax_date: Optional[date] = None
    delivery_date: Optional[date] = None

    # Měna a DPH
    currency: Optional[str] = "CZK"
    exchange_rate: Optional[float] = 1.0
    vat_mode: Optional[VatMode] = VatMode.WITH_VAT
    vat_note: Optional[str] = None

    # Platba
    payment_method: Optional[PaymentMethod] = PaymentMethod.BANK_TRANSFER

    # Položky
    items: Optional[List[InvoiceItem]] = Field(default_factory=list)

    # Zaokrouhlení
    rounding: Optional[float] = 0.0

    # Texty
    header_text: Optional[str] = None
    footer_text: Optional[str] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    payment_instructions: Optional[str] = None

    # Doručovací adresa
    shipping_name: Optional[str] = None
    shipping_street: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_zip: Optional[str] = None
    shipping_country: Optional[str] = None
    shipping_country_name: Optional[str] = None

    # Metadata
    tags: Optional[List[str]] = Field(default_factory=list)
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)


class InvoiceCreate(InvoiceBase):
    """
    Schema pro vytvoření faktury.
    
    Minimální požadavky:
    - supplier_id (ID dodavatele)
    - customer_id (ID odběratele)
    - issue_date (datum vystavení)
    - due_date (datum splatnosti)
    
    Vše ostatní je optional a doplní se automaticky nebo má výchozí hodnoty.
    """
    pass


class InvoiceUpdate(BaseModel):
    """Schema pro aktualizaci - všechna pole jsou optional"""
    invoice_type: Optional[InvoiceType] = None
    invoice_number: Optional[str] = None
    variable_symbol: Optional[str] = None
    constant_symbol: Optional[str] = None
    specific_symbol: Optional[str] = None
    order_number: Optional[str] = None
    contract_number: Optional[str] = None
    proforma_id: Optional[int] = None
    deal_id: Optional[int] = None  # NOVÉ!
    supplier_id: Optional[int] = None
    customer_id: Optional[int] = None
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    tax_date: Optional[date] = None
    delivery_date: Optional[date] = None
    paid_date: Optional[date] = None
    currency: Optional[str] = None
    exchange_rate: Optional[float] = None
    vat_mode: Optional[VatMode] = None
    vat_note: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    status: Optional[InvoiceStatus] = None
    paid_amount: Optional[float] = None
    items: Optional[List[InvoiceItem]] = None
    rounding: Optional[float] = None
    header_text: Optional[str] = None
    footer_text: Optional[str] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    payment_instructions: Optional[str] = None
    shipping_name: Optional[str] = None
    shipping_street: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_zip: Optional[str] = None
    shipping_country: Optional[str] = None
    shipping_country_name: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class InvoicePublic(InvoiceBase):
    """Schema pro response - obsahuje všechna pole včetně computed"""
    id: int
    status: InvoiceStatus

    # Kopie údajů dodavatele
    supplier_name: str
    supplier_legal_name: Optional[str] = None
    supplier_ico: Optional[str] = None
    supplier_dic: Optional[str] = None
    supplier_vat_id: Optional[str] = None
    supplier_is_vat_payer: bool
    supplier_address_street: Optional[str] = None
    supplier_address_city: Optional[str] = None
    supplier_address_zip: Optional[str] = None
    supplier_address_country: Optional[str] = None
    supplier_address_country_name: Optional[str] = None
    supplier_email: Optional[str] = None
    supplier_phone: Optional[str] = None
    supplier_website: Optional[str] = None
    supplier_bank_name: Optional[str] = None
    supplier_bank_account: Optional[str] = None
    supplier_bank_iban: Optional[str] = None
    supplier_bank_swift: Optional[str] = None

    # Kopie údajů odběratele
    customer_name: str
    customer_legal_name: Optional[str] = None
    customer_ico: Optional[str] = None
    customer_dic: Optional[str] = None
    customer_vat_id: Optional[str] = None
    customer_address_street: Optional[str] = None
    customer_address_city: Optional[str] = None
    customer_address_zip: Optional[str] = None
    customer_address_country: Optional[str] = None
    customer_address_country_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None

    # Computed fields
    paid_date: Optional[date] = None
    sent_date: Optional[datetime] = None
    paid_amount: float = 0.0
    subtotal: float = 0.0
    discount_amount: float = 0.0
    subtotal_after_discount: float = 0.0
    vat_breakdown: Dict[str, Dict[str, float]] = Field(default_factory=dict)
    total_vat: float = 0.0
    total: float = 0.0
    total_in_words: Optional[str] = None

    qr_payment_code: Optional[str] = None
    pdf_url: Optional[str] = None

    # Deal data (NOVÉ!)
    deal_id: Optional[int] = None
    deal_data: Optional[Dict[str, Any]] = None  # Obohacená data z Deal (deal_number, title, status...)

    created_by: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InvoiceListItem(BaseModel):
    """Zjednodušená verze pro seznam"""
    id: int
    invoice_type: InvoiceType
    invoice_number: str
    supplier_name: str
    customer_name: str
    issue_date: date
    due_date: date
    total: float
    currency: str
    status: InvoiceStatus
    created_at: datetime
    
    # Deal info (NOVÉ!)
    deal_id: Optional[int] = None
    deal_number: Optional[str] = None
    
    class Config:
        from_attributes = True


# =====================================================
# INVOICE FROM DEAL
# =====================================================
class InvoiceFromDealCreate(BaseModel):
    """
    Schema pro vytvoření faktury z dealu.
    
    Položky se automaticky zkopírují z dealu.
    
    Minimální požadavky:
    - deal_id
    - supplier_id  
    - issue_date
    - due_date
    """
    deal_id: int = Field(..., description="ID dealu")
    supplier_id: int = Field(..., description="ID dodavatele (vaše firma)")
    issue_date: date = Field(..., description="Datum vystavení")
    due_date: date = Field(..., description="Datum splatnosti")
    
    # Optional - typ faktury
    invoice_type: Optional[InvoiceType] = Field(InvoiceType.INVOICE, description="Typ faktury")
    
    # Optional - přepsat hodnoty z dealu
    tax_date: Optional[date] = None
    variable_symbol: Optional[str] = None
    order_number: Optional[str] = None  # Default: deal_number
    
    # Optional - texty
    header_text: Optional[str] = None
    footer_text: Optional[str] = None
    notes: Optional[str] = None  # Default: z dealu
    payment_instructions: Optional[str] = None
    
    # Optional - režim DPH
    vat_mode: Optional[VatMode] = None
    
    # Optional - měna (default: z dealu)
    currency: Optional[str] = None


class InvoiceFromDealResponse(BaseModel):
    """Response po vytvoření faktury z dealu"""
    invoice_id: int
    invoice_number: str
    deal_id: int
    deal_number: str
    total: float
    currency: str
    message: str = "Faktura úspěšně vytvořena z dealu"


# =====================================================
# INVOICE STATS
# =====================================================
class InvoiceStats(BaseModel):
    """Statistiky faktur"""
    total_count: int
    by_status: Dict[str, int]
    by_type: Dict[str, int]
    total_amount: float
    paid_amount: float
    unpaid_amount: float
    overdue_count: int
    overdue_amount: float


# =====================================================
# HELPER - Příklady použití
# =====================================================
"""
MINIMÁLNÍ VYTVOŘENÍ FAKTURY:

{
    "supplier_id": 1,
    "customer_id": 5,
    "issue_date": "2025-01-15",
    "due_date": "2025-01-29"
}

FAKTURA S POLOŽKAMI:

{
    "supplier_id": 1,
    "customer_id": 5,
    "issue_date": "2025-01-15",
    "due_date": "2025-01-29",
    "items": [
        {"name": "Webová stránka", "quantity": 1, "unit_price": 25000, "vat_rate": 21},
        {"name": "Hosting", "quantity": 12, "unit": "měsíc", "unit_price": 199, "vat_rate": 21}
    ]
}

FAKTURA Z DEALU:

{
    "deal_id": 42,
    "supplier_id": 1,
    "issue_date": "2025-01-15",
    "due_date": "2025-01-29"
}

PROFORMA Z DEALU:

{
    "deal_id": 42,
    "supplier_id": 1,
    "issue_date": "2025-01-10",
    "due_date": "2025-01-17",
    "invoice_type": "proforma",
    "notes": "Zálohová faktura - 50% celkové ceny"
}
"""