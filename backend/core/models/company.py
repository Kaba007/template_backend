
# backend/core/models/invoice.py
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, Enum, Index, JSON, Date
)
from sqlalchemy.orm import relationship

from .base import Base
from .utils import  PaymentMethod, VatMode

class CompanyType(str, PyEnum):
    """Typ společnosti"""
    SUPPLIER = "supplier"            # Dodavatel
    CUSTOMER = "customer"            # Odběratel
    BOTH = "both"                    # Oboje


# =====================================================
# COMPANY - Společnosti (dodavatelé i odběratelé)
# =====================================================
class Company(Base):
    """Společnosti - dodavatelé i odběratelé"""
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Typ společnosti
    company_type = Column(Enum(CompanyType), default=CompanyType.CUSTOMER, nullable=False, index=True)

    # Základní údaje
    name = Column(String(255), nullable=False, index=True)
    legal_name = Column(String(255))  # Právní název (pokud se liší)

    # Identifikátory
    ico = Column(String(20), index=True)              # IČO
    dic = Column(String(20), index=True)              # DIČ
    vat_id = Column(String(30), index=True)           # VAT ID (EU)
    registration_number = Column(String(50))          # Další registrační číslo

    # DPH status
    is_vat_payer = Column(Boolean, default=False, nullable=False)  # Je plátce DPH?
    vat_mode = Column(Enum(VatMode), default=VatMode.WITHOUT_VAT)

    # Kontaktní údaje
    email = Column(String(255), index=True)
    phone = Column(String(50))
    website = Column(String(255))

    # Adresa - fakturační
    address_street = Column(String(255))
    address_city = Column(String(100))
    address_zip = Column(String(20))
    address_country = Column(String(100), default="CZ")
    address_country_name = Column(String(100), default="Česká republika")

    # Adresa - doručovací (pokud se liší)
    shipping_street = Column(String(255))
    shipping_city = Column(String(100))
    shipping_zip = Column(String(20))
    shipping_country = Column(String(100))
    shipping_country_name = Column(String(100))

    # Bankovní údaje
    bank_name = Column(String(255))
    bank_account = Column(String(50))           # Číslo účtu
    bank_iban = Column(String(50))              # IBAN
    bank_swift = Column(String(20))             # SWIFT/BIC
    bank_currency = Column(String(3), default="CZK")  # Měna účtu

    # Další bankovní účty (JSON array pro více účtů)
    additional_bank_accounts = Column(JSON, default=list)

    # Výchozí nastavení pro faktury
    default_currency = Column(String(3), default="CZK")
    default_payment_method = Column(Enum(PaymentMethod), default=PaymentMethod.BANK_TRANSFER)
    default_due_days = Column(Integer, default=14)  # Výchozí splatnost ve dnech
    default_vat_rate = Column(Float, default=21.0)  # Výchozí sazba DPH

    # Kontaktní osoba
    contact_person = Column(String(255))
    contact_email = Column(String(255))
    contact_phone = Column(String(50))

    # Poznámky
    notes = Column(Text)
    internal_notes = Column(Text)  # Interní poznámky (nezobrazují se na faktuře)

    # Metadata
    tags = Column(JSON, default=list)  # Štítky pro kategorizaci
    custom_fields = Column(JSON, default=dict)  # Vlastní pole

    # Audit
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index('idx_company_type_active', 'company_type', 'is_active'),
        Index('idx_company_ico', 'ico'),
        Index('idx_company_name', 'name'),
    )

    # Relationships
    invoices_as_supplier = relationship(
        "Invoice",
        back_populates="supplier",
        foreign_keys="Invoice.supplier_id"
    )
    invoices_as_customer = relationship(
        "Invoice",
        back_populates="customer",
        foreign_keys="Invoice.customer_id"
    )

    def __repr__(self):
        return f"<Company(id={self.id}, name='{self.name}', type={self.company_type})>"

    def __str__(self):
        return self.name

    @property
    def full_address(self):
        """Vrátí plnou adresu"""
        parts = [self.address_street, f"{self.address_zip} {self.address_city}"]
        if self.address_country_name and self.address_country != "CZ":
            parts.append(self.address_country_name)
        return ", ".join(filter(None, parts))
