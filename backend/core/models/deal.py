# backend/core/models/deal.py
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, Enum, Index, JSON, Date
)
from sqlalchemy.orm import relationship

from backend.core.db import Base
from .utils import PaymentMethod


# =====================================================
# ENUMS
# =====================================================
class DealStatus(str, PyEnum):
    """Status dealu/objednávky"""
    DRAFT = "draft"                  # 📝 Koncept
    CONFIRMED = "confirmed"          # ✅ Potvrzeno
    IN_PROGRESS = "in_progress"      # 🔄 V realizaci
    COMPLETED = "completed"          # ✔️ Dokončeno
    CANCELLED = "cancelled"          # ❌ Zrušeno


class PaymentStatus(str, PyEnum):
    """Stav platby"""
    UNPAID = "unpaid"                # Nezaplaceno
    PARTIAL = "partial"              # Částečně zaplaceno
    PAID = "paid"                    # Zaplaceno
    OVERPAID = "overpaid"            # Přeplaceno
    REFUNDED = "refunded"            # Vráceno


class DiscountType(str, PyEnum):
    """Typ slevy"""
    PERCENT = "percent"              # Procentuální sleva
    FIXED = "fixed"                  # Fixní sleva v měně


# =====================================================
# DEAL - Obchody/Objednávky
# =====================================================
class Deal(Base):
    """
    Deal - obchod/objednávka.
    
    Vzniká konverzí z Leadu nebo přímým vytvořením.
    Může mít více faktur (zálohy, částečné fakturace, dobropisy).
    """
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # =====================================================
    # VLASTNÍK
    # =====================================================
    user_id = Column(String(100), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # =====================================================
    # VAZBY
    # =====================================================
    # Odkud deal přišel (optional - může být i přímá objednávka)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Firma (optional - může být i bez firmy)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    company_name = Column(String(255))  # Název firmy jako text (pokud není v DB)

    # =====================================================
    # IDENTIFIKACE
    # =====================================================
    deal_number = Column(String(50), unique=True, nullable=False, index=True)  # Auto-generováno
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text)

    # =====================================================
    # STATUS
    # =====================================================
    status = Column(Enum(DealStatus), default=DealStatus.DRAFT, nullable=False, index=True)

    # =====================================================
    # KONTAKT
    # =====================================================
    contact_person = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))

    # =====================================================
    # POLOŽKY (JSON - snapshot hodnot)
    # =====================================================
    items = Column(JSON, default=list)
    """
    Struktura položky:
    {
        "product_id": int (optional),
        "name": str,
        "description": str (optional),
        "code": str (optional),
        "quantity": float,
        "unit": str,
        "unit_price": float,
        "discount_percent": float,
        "vat_rate": float,
        "sort_order": int
    }
    """

    # =====================================================
    # FINANCE
    # =====================================================
    currency = Column(String(3), default="CZK", nullable=False)
    
    # Součty (vypočtené z položek)
    subtotal = Column(Float, default=0.0)  # Základ bez DPH
    
    # Sleva na celou objednávku
    discount = Column(Float, default=0.0)  # Hodnota slevy
    discount_type = Column(Enum(DiscountType), default=DiscountType.PERCENT)  # Typ slevy
    discount_amount = Column(Float, default=0.0)  # Vypočtená sleva v měně
    
    subtotal_after_discount = Column(Float, default=0.0)  # Základ po slevě
    
    # DPH
    vat_breakdown = Column(JSON, default=dict)  # {"21": {"base": 1000, "vat": 210}, ...}
    total_vat = Column(Float, default=0.0)
    
    # Celkem
    total = Column(Float, default=0.0)
    
    # Zaokrouhlení
    rounding = Column(Float, default=0.0)

    # =====================================================
    # PLATBY (agregováno z faktur)
    # =====================================================
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.UNPAID, nullable=False, index=True)
    paid_amount = Column(Float, default=0.0)  # Celkem zaplaceno (ze všech faktur)
    payment_method = Column(Enum(PaymentMethod), default=PaymentMethod.BANK_TRANSFER)

    # =====================================================
    # DŮLEŽITÁ DATA
    # =====================================================
    deal_date = Column(Date, nullable=True, index=True)  # Datum uzavření obchodu
    delivery_date = Column(Date, nullable=True)  # Očekávané datum dodání
    completed_at = Column(DateTime, nullable=True)  # Skutečné dokončení

    # =====================================================
    # PŘIŘAZENÍ
    # =====================================================
    assigned_to = Column(String(100), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # =====================================================
    # METADATA
    # =====================================================
    tags = Column(JSON, default=list)
    custom_fields = Column(JSON, default=dict)
    notes = Column(Text)  # Poznámky viditelné pro zákazníka
    internal_notes = Column(Text)  # Interní poznámky

    # =====================================================
    # AUDIT
    # =====================================================
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by = Column(String(100), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        Index('idx_deal_user_status', 'user_id', 'status'),
        Index('idx_deal_lead', 'lead_id'),
        Index('idx_deal_company', 'company_id'),
        Index('idx_deal_payment_status', 'payment_status'),
        Index('idx_deal_dates', 'deal_date', 'delivery_date'),
    )

    # =====================================================
    # RELATIONSHIPS
    # =====================================================
    user = relationship("User", backref="deals", foreign_keys=[user_id])
    lead = relationship("Lead", backref="deals", foreign_keys=[lead_id])
    company = relationship("Company", backref="deals", foreign_keys=[company_id])
    assignee = relationship("User", foreign_keys=[assigned_to])
    creator = relationship("User", foreign_keys=[created_by])
    
    # Faktury k tomuto dealu (1:N)
    invoices = relationship("Invoice", back_populates="deal", foreign_keys="Invoice.deal_id")

    def __repr__(self):
        return f"<Deal(id={self.id}, number='{self.deal_number}', status={self.status})>"

    def __str__(self):
        return f"{self.deal_number} - {self.title}"

    @property
    def display_name(self):
        """Zobrazovací jméno s ikonou podle statusu"""
        status_icon = {
            DealStatus.DRAFT: "📝",
            DealStatus.CONFIRMED: "✅",
            DealStatus.IN_PROGRESS: "🔄",
            DealStatus.COMPLETED: "✔️",
            DealStatus.CANCELLED: "❌",
        }.get(self.status, "❓")
        return f"{status_icon} {self.deal_number}"

    @property
    def remaining_amount(self):
        """Zbývající částka k zaplacení"""
        return max(0, (self.total or 0) - (self.paid_amount or 0))

    @property
    def is_fully_paid(self):
        """Je objednávka plně zaplacena?"""
        return self.paid_amount >= self.total

    @property
    def invoiced_amount(self):
        """Celková fakturovaná částka"""
        if not self.invoices:
            return 0.0
        return sum(inv.total for inv in self.invoices if inv.is_active)

    @property
    def items_count(self):
        """Počet položek"""
        return len(self.items or [])

    def recalculate_totals(self):
        """Přepočítá všechny součty z položek"""
        subtotal = 0.0
        vat_breakdown = {}

        for item in (self.items or []):
            quantity = float(item.get('quantity', 0) or 0)
            unit_price = float(item.get('unit_price', 0) or 0)
            discount_percent = float(item.get('discount_percent', 0) or 0)
            vat_rate = float(item.get('vat_rate', 0) or 0)

            item_subtotal = quantity * unit_price
            item_discount = item_subtotal * (discount_percent / 100)
            item_after_discount = item_subtotal - item_discount

            subtotal += item_after_discount

            # DPH rozpad
            item_vat = item_after_discount * (vat_rate / 100)
            rate_key = str(int(vat_rate))
            if rate_key not in vat_breakdown:
                vat_breakdown[rate_key] = {'base': 0.0, 'vat': 0.0}
            vat_breakdown[rate_key]['base'] += item_after_discount
            vat_breakdown[rate_key]['vat'] += item_vat

        self.subtotal = round(subtotal, 2)

        # Aplikace slevy na celou objednávku
        if self.discount_type == DiscountType.PERCENT:
            self.discount_amount = round(subtotal * ((self.discount or 0) / 100), 2)
        else:
            self.discount_amount = round(self.discount or 0, 2)

        self.subtotal_after_discount = round(subtotal - self.discount_amount, 2)

        # Přepočet DPH po slevě (proporcionálně)
        if subtotal > 0:
            discount_ratio = self.subtotal_after_discount / subtotal
            for rate_key in vat_breakdown:
                vat_breakdown[rate_key]['base'] = round(vat_breakdown[rate_key]['base'] * discount_ratio, 2)
                vat_breakdown[rate_key]['vat'] = round(vat_breakdown[rate_key]['vat'] * discount_ratio, 2)

        self.vat_breakdown = vat_breakdown
        self.total_vat = round(sum(v['vat'] for v in vat_breakdown.values()), 2)
        self.total = round(self.subtotal_after_discount + self.total_vat + (self.rounding or 0), 2)

    def recalculate_payment_status(self):
        """Přepočítá stav platby z faktur"""
        if not self.invoices:
            self.paid_amount = 0.0
            self.payment_status = PaymentStatus.UNPAID
            return

        total_paid = sum(inv.paid_amount or 0 for inv in self.invoices if inv.is_active)
        self.paid_amount = round(total_paid, 2)

        if self.paid_amount <= 0:
            self.payment_status = PaymentStatus.UNPAID
        elif self.paid_amount < self.total:
            self.payment_status = PaymentStatus.PARTIAL
        elif self.paid_amount == self.total:
            self.payment_status = PaymentStatus.PAID
        else:
            self.payment_status = PaymentStatus.OVERPAID

    def create_invoice_items(self) -> list:
        """
        Vytvoří položky faktury z položek dealu.
        Vrací seznam pro Invoice.items
        """
        invoice_items = []
        for item in (self.items or []):
            invoice_items.append({
                "name": item.get("name"),
                "description": item.get("description"),
                "sku": item.get("code"),
                "quantity": item.get("quantity", 1),
                "unit": item.get("unit", "ks"),
                "unit_price": item.get("unit_price", 0),
                "discount_percent": item.get("discount_percent", 0),
                "vat_rate": item.get("vat_rate", 21),
            })
        return invoice_items


# =====================================================
# DEAL SEQUENCE - Číselné řady objednávek
# =====================================================
class DealSequence(Base):
    """Číselné řady pro objednávky"""
    __tablename__ = "deal_sequences"

    id = Column(Integer, primary_key=True, autoincrement=True)

    user_id = Column(String(100), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    prefix = Column(String(20), default="OBJ", nullable=False)  # např. "OBJ", "ORD"
    last_number = Column(Integer, default=0, nullable=False)
    format_pattern = Column(String(50), default="{prefix}{year}-{number:04d}")  # Formát čísla

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index('idx_deal_sequence_user_year', 'user_id', 'year', unique=True),
    )

    user = relationship("User", backref="deal_sequences")

    def get_next_number(self) -> str:
        """Vygeneruje další číslo v řadě"""
        self.last_number += 1
        return self.format_pattern.format(
            prefix=self.prefix,
            year=self.year,
            number=self.last_number
        )