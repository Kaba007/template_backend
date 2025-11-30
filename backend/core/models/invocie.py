# backend/core/models/invoice.py
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, Enum, Index, JSON, Date
)
from sqlalchemy.orm import relationship

from backend.core.db import Base


# =====================================================
# ENUMS
# =====================================================
class InvoiceType(str, PyEnum):
    """Typ faktury"""
    INVOICE = "invoice"              # Běžná faktura
    PROFORMA = "proforma"            # Proforma faktura (zálohová)
    CREDIT_NOTE = "credit_note"      # Dobropis
    DEBIT_NOTE = "debit_note"        # Vrubopis
    RECEIPT = "receipt"              # Příjmový doklad


class InvoiceStatus(str, PyEnum):
    """Stav faktury"""
    DRAFT = "draft"                  # Koncept
    SENT = "sent"                    # Odesláno
    VIEWED = "viewed"                # Zobrazeno zákazníkem
    PAID = "paid"                    # Zaplaceno
    PARTIALLY_PAID = "partially_paid"  # Částečně zaplaceno
    OVERDUE = "overdue"              # Po splatnosti
    CANCELLED = "cancelled"          # Stornováno


class PaymentMethod(str, PyEnum):
    """Způsob platby"""
    BANK_TRANSFER = "bank_transfer"  # Bankovním převodem
    CASH = "cash"                    # Hotově
    CARD = "card"                    # Kartou
    PAYPAL = "paypal"                # PayPal
    CRYPTO = "crypto"                # Kryptoměny
    OTHER = "other"                  # Jiné


class VatMode(str, PyEnum):
    """Režim DPH na faktuře"""
    WITH_VAT = "with_vat"            # Faktura s DPH (plátce DPH)
    WITHOUT_VAT = "without_vat"      # Faktura bez DPH (neplátce DPH)
    REVERSE_CHARGE = "reverse_charge"  # Přenesená daňová povinnost
    OSS = "oss"                      # One Stop Shop (EU)
    EXEMPT = "exempt"                # Osvobozeno od DPH


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


# =====================================================
# INVOICE - Faktury
# =====================================================
class Invoice(Base):
    """Faktury"""
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # =====================================================
    # TYP A IDENTIFIKACE
    # =====================================================
    invoice_type = Column(Enum(InvoiceType), default=InvoiceType.INVOICE, nullable=False, index=True)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    variable_symbol = Column(String(20), index=True)  # Variabilní symbol
    constant_symbol = Column(String(10))              # Konstantní symbol
    specific_symbol = Column(String(20))              # Specifický symbol
    order_number = Column(String(50))                 # Číslo objednávky
    contract_number = Column(String(50))              # Číslo smlouvy

    # Reference na proforma (pokud je to faktura z proformy)
    proforma_id = Column(Integer, ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True)

    # =====================================================
    # DODAVATEL (Supplier)
    # =====================================================
    supplier_id = Column(Integer, ForeignKey("companies.id", ondelete="RESTRICT"), nullable=False, index=True)

    # Kopie údajů dodavatele (pro historii - neměnné po vytvoření)
    supplier_name = Column(String(255), nullable=False)
    supplier_legal_name = Column(String(255))
    supplier_ico = Column(String(20))
    supplier_dic = Column(String(20))
    supplier_vat_id = Column(String(30))
    supplier_is_vat_payer = Column(Boolean, default=False)
    supplier_address_street = Column(String(255))
    supplier_address_city = Column(String(100))
    supplier_address_zip = Column(String(20))
    supplier_address_country = Column(String(100))
    supplier_address_country_name = Column(String(100))
    supplier_email = Column(String(255))
    supplier_phone = Column(String(50))
    supplier_website = Column(String(255))

    # Bankovní údaje dodavatele
    supplier_bank_name = Column(String(255))
    supplier_bank_account = Column(String(50))
    supplier_bank_iban = Column(String(50))
    supplier_bank_swift = Column(String(20))

    # =====================================================
    # ODBĚRATEL (Customer)
    # =====================================================
    customer_id = Column(Integer, ForeignKey("companies.id", ondelete="RESTRICT"), nullable=False, index=True)

    # Kopie údajů odběratele (pro historii)
    customer_name = Column(String(255), nullable=False)
    customer_legal_name = Column(String(255))
    customer_ico = Column(String(20))
    customer_dic = Column(String(20))
    customer_vat_id = Column(String(30))
    customer_address_street = Column(String(255))
    customer_address_city = Column(String(100))
    customer_address_zip = Column(String(20))
    customer_address_country = Column(String(100))
    customer_address_country_name = Column(String(100))
    customer_email = Column(String(255))
    customer_phone = Column(String(50))

    # Doručovací adresa (pokud se liší)
    shipping_name = Column(String(255))
    shipping_street = Column(String(255))
    shipping_city = Column(String(100))
    shipping_zip = Column(String(20))
    shipping_country = Column(String(100))
    shipping_country_name = Column(String(100))

    # =====================================================
    # DATUMY
    # =====================================================
    issue_date = Column(Date, nullable=False, index=True)          # Datum vystavení
    due_date = Column(Date, nullable=False, index=True)            # Datum splatnosti
    tax_date = Column(Date)                                         # Datum zdanitelného plnění (DUZP)
    delivery_date = Column(Date)                                    # Datum dodání
    paid_date = Column(Date)                                        # Datum zaplacení
    sent_date = Column(DateTime)                                    # Datum odeslání

    # =====================================================
    # MĚNA A DPH
    # =====================================================
    currency = Column(String(3), default="CZK", nullable=False)
    exchange_rate = Column(Float, default=1.0)                     # Kurz k CZK

    vat_mode = Column(Enum(VatMode), default=VatMode.WITH_VAT, nullable=False)

    # Text pro režim DPH (zobrazí se na faktuře)
    vat_note = Column(String(500))  # např. "Daň odvede zákazník" pro reverse charge

    # =====================================================
    # PLATBA
    # =====================================================
    payment_method = Column(Enum(PaymentMethod), default=PaymentMethod.BANK_TRANSFER)
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.DRAFT, nullable=False, index=True)

    # Částky zaplacené (pro částečné platby)
    paid_amount = Column(Float, default=0.0)

    # =====================================================
    # POLOŽKY A SOUČTY
    # =====================================================
    items = Column(JSON, default=list)  # Položky faktury

    # Součty (vypočtené z položek)
    subtotal = Column(Float, default=0.0)       # Základ bez DPH
    discount_amount = Column(Float, default=0.0)  # Sleva celkem
    subtotal_after_discount = Column(Float, default=0.0)  # Základ po slevě

    # DPH rozpad podle sazeb (JSON: {"21": {"base": 1000, "vat": 210}, "15": {...}})
    vat_breakdown = Column(JSON, default=dict)
    total_vat = Column(Float, default=0.0)      # DPH celkem

    total = Column(Float, default=0.0)          # Celkem k úhradě
    total_in_words = Column(String(255))        # Celkem slovy

    # Zaokrouhlení
    rounding = Column(Float, default=0.0)

    # =====================================================
    # TEXTY NA FAKTUŘE
    # =====================================================
    header_text = Column(Text)      # Text v záhlaví
    footer_text = Column(Text)      # Text v patičce
    notes = Column(Text)            # Poznámky (viditelné na faktuře)
    internal_notes = Column(Text)   # Interní poznámky
    payment_instructions = Column(Text)  # Platební instrukce

    # QR kód pro platbu (base64 nebo URL)
    qr_payment_code = Column(Text)

    # =====================================================
    # PŘÍLOHY A DOKUMENTY
    # =====================================================
    attachments = Column(JSON, default=list)  # Seznam příloh
    pdf_url = Column(String(500))             # URL vygenerovaného PDF

    # =====================================================
    # METADATA
    # =====================================================
    tags = Column(JSON, default=list)
    custom_fields = Column(JSON, default=dict)

    # Vlastník/tvůrce
    created_by = Column(String(100), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Audit
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index('idx_invoice_type_status', 'invoice_type', 'status'),
        Index('idx_invoice_supplier_customer', 'supplier_id', 'customer_id'),
        Index('idx_invoice_dates', 'issue_date', 'due_date'),
        Index('idx_invoice_status_due', 'status', 'due_date'),
    )

    # =====================================================
    # RELATIONSHIPS
    # =====================================================
    supplier = relationship("Company", back_populates="invoices_as_supplier", foreign_keys=[supplier_id])
    customer = relationship("Company", back_populates="invoices_as_customer", foreign_keys=[customer_id])
    creator = relationship("User", backref="created_invoices", foreign_keys=[created_by])
    proforma = relationship("Invoice", remote_side=[id], foreign_keys=[proforma_id])

    def __repr__(self):
        return f"<Invoice(id={self.id}, number='{self.invoice_number}', type={self.invoice_type}, status={self.status})>"

    def __str__(self):
        return f"{self.invoice_number} - {self.customer_name}"

    @property
    def display_name(self):
        type_icon = {
            InvoiceType.INVOICE: "📄",
            InvoiceType.PROFORMA: "📋",
            InvoiceType.CREDIT_NOTE: "↩️",
            InvoiceType.DEBIT_NOTE: "↪️",
            InvoiceType.RECEIPT: "🧾",
        }.get(self.invoice_type, "📄")
        return f"{type_icon} {self.invoice_number}"

    @property
    def is_overdue(self):
        """Je faktura po splatnosti?"""
        if self.status in [InvoiceStatus.PAID, InvoiceStatus.CANCELLED]:
            return False
        if not self.due_date:
            return False
        return datetime.utcnow().date() > self.due_date

    @property
    def remaining_amount(self):
        """Zbývající částka k zaplacení"""
        return max(0, self.total - (self.paid_amount or 0))

    def recalculate_totals(self):
        """Přepočítá všechny součty z položek"""
        subtotal = 0.0
        discount_total = 0.0
        vat_breakdown = {}

        for item in (self.items or []):
            quantity = float(item.get('quantity', 0) or 0)
            unit_price = float(item.get('unit_price', 0) or 0)
            discount_percent = float(item.get('discount_percent', 0) or 0)
            vat_rate = float(item.get('vat_rate', 0) or 0)

            item_subtotal = quantity * unit_price
            item_discount = item_subtotal * (discount_percent / 100)
            item_after_discount = item_subtotal - item_discount

            subtotal += item_subtotal
            discount_total += item_discount

            # DPH pouze pokud je faktura s DPH
            if self.vat_mode == VatMode.WITH_VAT:
                item_vat = item_after_discount * (vat_rate / 100)

                # Rozpad DPH podle sazeb
                rate_key = str(int(vat_rate))
                if rate_key not in vat_breakdown:
                    vat_breakdown[rate_key] = {'base': 0.0, 'vat': 0.0}
                vat_breakdown[rate_key]['base'] += item_after_discount
                vat_breakdown[rate_key]['vat'] += item_vat

        self.subtotal = round(subtotal, 2)
        self.discount_amount = round(discount_total, 2)
        self.subtotal_after_discount = round(subtotal - discount_total, 2)
        self.vat_breakdown = {k: {'base': round(v['base'], 2), 'vat': round(v['vat'], 2)} for k, v in vat_breakdown.items()}
        self.total_vat = round(sum(v['vat'] for v in vat_breakdown.values()), 2)
        self.total = round(self.subtotal_after_discount + self.total_vat + (self.rounding or 0), 2)


# =====================================================
# INVOICE SEQUENCE - Číselné řady faktur
# =====================================================
class InvoiceSequence(Base):
    """Číselné řady pro různé typy faktur"""
    __tablename__ = "invoice_sequences"

    id = Column(Integer, primary_key=True, autoincrement=True)

    invoice_type = Column(Enum(InvoiceType), nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    prefix = Column(String(20), nullable=False)  # např. "FV", "PF", "D"
    last_number = Column(Integer, default=0, nullable=False)
    format_pattern = Column(String(50), default="{prefix}{year}{number:04d}")  # Formát čísla

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index('idx_sequence_type_year', 'invoice_type', 'year', unique=True),
    )

    def get_next_number(self) -> str:
        """Vygeneruje další číslo v řadě"""
        self.last_number += 1
        return self.format_pattern.format(
            prefix=self.prefix,
            year=self.year,
            number=self.last_number
        )
