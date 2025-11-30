from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

from .utils import CompanyType,VatMode,PaymentMethod


class BankAccount(BaseModel):
    """Model pro další bankovní účty"""
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    iban: Optional[str] = None
    swift: Optional[str] = None
    currency: str = "CZK"


class CompanyBase(BaseModel):
    """Základní schema - obsahuje všechna pole jako optional kromě name"""
    # Pouze name je povinné
    name: str = Field(..., min_length=1, max_length=255, description="Název společnosti")
    
    # Vše ostatní je optional
    company_type: Optional[CompanyType] = CompanyType.CUSTOMER
    legal_name: Optional[str] = None

    # Identifikátory
    ico: Optional[str] = Field(None, max_length=20)
    dic: Optional[str] = Field(None, max_length=20)
    vat_id: Optional[str] = Field(None, max_length=30)
    registration_number: Optional[str] = None

    # DPH status
    is_vat_payer: Optional[bool] = False
    vat_mode: Optional[VatMode] = VatMode.WITHOUT_VAT

    # Kontakt
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None

    # Fakturační adresa
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_zip: Optional[str] = None
    address_country: Optional[str] = "CZ"
    address_country_name: Optional[str] = "Česká republika"

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
    bank_currency: Optional[str] = "CZK"
    additional_bank_accounts: Optional[List[BankAccount]] = Field(default_factory=list)

    # Výchozí nastavení
    default_currency: Optional[str] = "CZK"
    default_payment_method: Optional[PaymentMethod] = PaymentMethod.BANK_TRANSFER
    default_due_days: Optional[int] = 14
    default_vat_rate: Optional[float] = 21.0

    # Kontaktní osoba
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

    # Poznámky
    notes: Optional[str] = None
    internal_notes: Optional[str] = None

    # Metadata
    tags: Optional[List[str]] = Field(default_factory=list)
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)


class CompanyCreate(CompanyBase):
    """Schema pro vytvoření společnosti - vyžaduje pouze název"""
    pass


class CompanyUpdate(BaseModel):
    """Schema pro aktualizaci - všechna pole jsou optional"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    company_type: Optional[CompanyType] = None
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
    """Schema pro response - obsahuje všechna pole včetně ID a timestamps"""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CompanySimple(BaseModel):
    """Zjednodušená verze pro dropdown - pouze základní údaje"""
    id: int
    name: str
    company_type: CompanyType
    ico: Optional[str] = None
    dic: Optional[str] = None
    is_vat_payer: bool
    email: Optional[str] = None
    phone: Optional[str] = None
    
    class Config:
        from_attributes = True