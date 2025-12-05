# backend/core/models/invoice.py
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, Enum, Index, JSON, Date
)
from sqlalchemy.orm import relationship

from .base import Base
from .utils import PaymentMethod, VatMode


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
    # VAZBA NA DEAL (NOVÉ!)
    # =====================================================
    # Jeden deal může mít více faktur (záloha, částečná fakturace, dobropis...)
    deal_id = Column(Integer, ForeignKey("deals.id", ondelete="SET NULL"), nullable=True, index=True)

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
        Index('idx_invoice_deal', 'deal_id'),  # NOVÝ INDEX
    )

    # =====================================================
    # RELATIONSHIPS
    # =====================================================
    supplier = relationship("Company", back_populates="invoices_as_supplier", foreign_keys=[supplier_id])
    customer = relationship("Company", back_populates="invoices_as_customer", foreign_keys=[customer_id])
    creator = relationship("User", backref="created_invoices", foreign_keys=[created_by])
    proforma = relationship("Invoice", remote_side=[id], foreign_keys=[proforma_id])

    # Vazba na Deal (NOVÉ!)
    deal = relationship("Deal", back_populates="invoices", foreign_keys=[deal_id])

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
    # NOVÉ METODY PRO PRÁCI S DEAL
    # =====================================================
    @classmethod
    def create_from_deal(cls, deal: "Deal", supplier: "Company", invoice_type: InvoiceType = InvoiceType.INVOICE, **kwargs) -> "Invoice":
        """
        Vytvoří fakturu z dealu.

        Args:
            deal: Deal objekt
            supplier: Company objekt (dodavatel/vaše firma)
            invoice_type: Typ faktury (invoice, proforma, ...)
            **kwargs: Dodatečné parametry (issue_date, due_date, ...)

        Returns:
            Invoice instance (neuložená)
        """
        # Získání zákazníka z dealu
        customer = deal.company

        # Připrav základní data
        invoice_data = {
            'deal_id': deal.id,
            'invoice_type': invoice_type,

            # Dodavatel
            'supplier_id': supplier.id,
            'supplier_name': supplier.name,
            'supplier_legal_name': getattr(supplier, 'legal_name', None),
            'supplier_ico': getattr(supplier, 'ico', None),
            'supplier_dic': getattr(supplier, 'dic', None),
            'supplier_vat_id': getattr(supplier, 'vat_id', None),
            'supplier_is_vat_payer': getattr(supplier, 'is_vat_payer', False),
            'supplier_address_street': getattr(supplier, 'address_street', None),
            'supplier_address_city': getattr(supplier, 'address_city', None),
            'supplier_address_zip': getattr(supplier, 'address_zip', None),
            'supplier_address_country': getattr(supplier, 'address_country', None),
            'supplier_email': getattr(supplier, 'email', None),
            'supplier_phone': getattr(supplier, 'phone', None),
            'supplier_bank_name': getattr(supplier, 'bank_name', None),
            'supplier_bank_account': getattr(supplier, 'bank_account', None),
            'supplier_bank_iban': getattr(supplier, 'bank_iban', None),
            'supplier_bank_swift': getattr(supplier, 'bank_swift', None),

            # Odběratel
            'customer_id': customer.id if customer else None,
            'customer_name': customer.name if customer else deal.company_name,
            'customer_legal_name': getattr(customer, 'legal_name', None) if customer else None,
            'customer_ico': getattr(customer, 'ico', None) if customer else None,
            'customer_dic': getattr(customer, 'dic', None) if customer else None,
            'customer_vat_id': getattr(customer, 'vat_id', None) if customer else None,
            'customer_address_street': getattr(customer, 'address_street', None) if customer else None,
            'customer_address_city': getattr(customer, 'address_city', None) if customer else None,
            'customer_address_zip': getattr(customer, 'address_zip', None) if customer else None,
            'customer_address_country': getattr(customer, 'address_country', None) if customer else None,
            'customer_email': deal.email or (getattr(customer, 'email', None) if customer else None),
            'customer_phone': deal.phone or (getattr(customer, 'phone', None) if customer else None),

            # Měna
            'currency': deal.currency,

            # Položky z dealu
            'items': deal.create_invoice_items(),

            # Číslo objednávky
            'order_number': deal.deal_number,
        }

        # Poznámky - pouze pokud nejsou v kwargs
        if 'notes' not in kwargs and deal.notes:
            invoice_data['notes'] = deal.notes

        # Přidej kwargs (přepíšou výchozí hodnoty)
        invoice_data.update(kwargs)

        invoice = cls(**invoice_data)
        invoice.recalculate_totals()
        return invoice
        def sync_payment_to_deal(self):
            """
            Synchronizuje stav platby zpět do dealu.
            Volat po změně paid_amount nebo status.
            """
            if self.deal:
                self.deal.recalculate_payment_status()


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
