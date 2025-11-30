# backend/core/schemas/invoice.py
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator
from enum import Enum


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


class PaymentMethod(str, Enum):
    BANK_TRANSFER = "bank_transfer"
    CASH = "cash"
    CARD = "card"
    PAYPAL = "paypal"
    CRYPTO = "crypto"
    OTHER = "other"


class VatMode(str, Enum):
    WITH_VAT = "with_vat"
    WITHOUT_VAT = "without_vat"
    REVERSE_CHARGE = "reverse_charge"
    OSS = "oss"
    EXEMPT = "exempt"


class CompanyType(str, Enum):
    SUPPLIER = "supplier"
    CUSTOMER = "customer"
    BOTH = "both"


# =====================================================
# BANK ACCOUNT
# =====================================================
class BankAccount(BaseModel):
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    iban: Optional[str] = None
    swift: Optional[str] = None
    currency: str = "CZK"
    is_default: bool = False


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
# COMPANY SCHEMAS
# =====================================================
class CompanyBase(BaseModel):
    company_type: CompanyType = CompanyType.CUSTOMER
    id :int
    # Základní údaje
    name: str = Field(..., min_length=1, max_length=255)
    legal_name: Optional[str] = None

    # Identifikátory
    ico: Optional[str] = Field(None, max_length=20)
    dic: Optional[str] = Field(None, max_length=20)
    vat_id: Optional[str] = Field(None, max_length=30)
    registration_number: Optional[str] = None

    # DPH status
    is_vat_payer: bool = False
    vat_mode: VatMode = VatMode.WITHOUT_VAT

    # Kontakt
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None

    # Fakturační adresa
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_zip: Optional[str] = None
    address_country: str = "CZ"
    address_country_name: str = "Česká republika"

    # Doručovací adresa
    shipping_street: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_zip: Optional[str] = None
    shipping_country: Optional[str] = None
    shipping_country_name: Optional[str] = None

    # Banka
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    bank_iban: Optional[str] = None
    bank_swift: Optional[str] = None
    bank_currency: str = "CZK"
    additional_bank_accounts: List[BankAccount] = Field(default_factory=list)

    # Výchozí nastavení
    default_currency: str = "CZK"
    default_payment_method: PaymentMethod = PaymentMethod.BANK_TRANSFER
    default_due_days: int = 14
    default_vat_rate: float = 21.0

    # Kontaktní osoba
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

    # Poznámky
    notes: Optional[str] = None
    internal_notes: Optional[str] = None

    # Metadata
    tags: List[str] = Field(default_factory=list)
    custom_fields: Dict[str, Any] = Field(default_factory=dict)


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    company_type: Optional[CompanyType] = None
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    legal_name: Optional[str] = None
    ico: Optional[str] = None
    dic: Optional[str] = None
    vat_id: Optional[str] = None
    registration_number: Optional[str] = None
    is_vat_payer: Optional[bool] = None
    vat_mode: Optional[VatMode] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_zip: Optional[str] = None
    address_country: Optional[str] = None
    address_country_name: Optional[str] = None
    shipping_street: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_zip: Optional[str] = None
    shipping_country: Optional[str] = None
    shipping_country_name: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    bank_iban: Optional[str] = None
    bank_swift: Optional[str] = None
    bank_currency: Optional[str] = None
    additional_bank_accounts: Optional[List[BankAccount]] = None
    default_currency: Optional[str] = None
    default_payment_method: Optional[PaymentMethod] = None
    default_due_days: Optional[int] = None
    default_vat_rate: Optional[float] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class CompanyPublic(CompanyBase):

    class Config:
        from_attributes = True


class CompanySimple(CompanyBase):
    """Zjednodušená verze pro dropdown"""
    class Config:
        from_attributes = True


# =====================================================
# INVOICE SCHEMAS
# =====================================================
class InvoiceBase(BaseModel):
    # Typ a identifikace
    invoice_type: InvoiceType = InvoiceType.INVOICE
    invoice_number: Optional[str] = None  # Může být auto-generováno
    variable_symbol: Optional[str] = None
    constant_symbol: Optional[str] = None
    specific_symbol: Optional[str] = None
    order_number: Optional[str] = None
    contract_number: Optional[str] = None
    proforma_id: Optional[int] = None

    # Dodavatel a odběratel (ID)
    supplier_id: int
    customer_id: int

    # Datumy
    issue_date: date
    due_date: date
    tax_date: Optional[date] = None
    delivery_date: Optional[date] = None

    # Měna a DPH
    currency: str = "CZK"
    exchange_rate: float = 1.0
    vat_mode: VatMode = VatMode.WITH_VAT
    vat_note: Optional[str] = None

    # Platba
    payment_method: PaymentMethod = PaymentMethod.BANK_TRANSFER

    # Položky
    items: List[InvoiceItem] = Field(default_factory=list)

    # Zaokrouhlení
    rounding: float = 0.0

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
    tags: List[str] = Field(default_factory=list)
    custom_fields: Dict[str, Any] = Field(default_factory=dict)


class InvoiceCreate(InvoiceBase):
    pass


class InvoiceUpdate(BaseModel):
    invoice_type: Optional[InvoiceType] = None
    invoice_number: Optional[str] = None
    variable_symbol: Optional[str] = None
    constant_symbol: Optional[str] = None
    specific_symbol: Optional[str] = None
    order_number: Optional[str] = None
    contract_number: Optional[str] = None
    proforma_id: Optional[int] = None
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
    id: int
    status: InvoiceStatus

    # Kopie údajů dodavatele
    supplier_name: str
    supplier_legal_name: Optional[str]
    supplier_ico: Optional[str]
    supplier_dic: Optional[str]
    supplier_vat_id: Optional[str]
    supplier_is_vat_payer: bool
    supplier_address_street: Optional[str]
    supplier_address_city: Optional[str]
    supplier_address_zip: Optional[str]
    supplier_address_country: Optional[str]
    supplier_address_country_name: Optional[str]
    supplier_email: Optional[str]
    supplier_phone: Optional[str]
    supplier_website: Optional[str]
    supplier_bank_name: Optional[str]
    supplier_bank_account: Optional[str]
    supplier_bank_iban: Optional[str]
    supplier_bank_swift: Optional[str]

    # Kopie údajů odběratele
    customer_name: str
    customer_legal_name: Optional[str]
    customer_ico: Optional[str]
    customer_dic: Optional[str]
    customer_vat_id: Optional[str]
    customer_address_street: Optional[str]
    customer_address_city: Optional[str]
    customer_address_zip: Optional[str]
    customer_address_country: Optional[str]
    customer_address_country_name: Optional[str]
    customer_email: Optional[str]
    customer_phone: Optional[str]

    # Computed fields
    paid_date: Optional[date]
    sent_date: Optional[datetime]
    paid_amount: float
    subtotal: float
    discount_amount: float
    subtotal_after_discount: float
    vat_breakdown: Dict[str, Dict[str, float]]
    total_vat: float
    total: float
    total_in_words: Optional[str]

    qr_payment_code: Optional[str]
    pdf_url: Optional[str]

    created_by: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InvoiceListItem(BaseModel):
    List[InvoicePublic]
