# backend/core/models/product.py
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, Index, JSON
)
from sqlalchemy.orm import relationship

from .base import Base


class Product(Base):
    """
    Katalog produktů a služeb.

    Slouží jako šablona - při přidání do Dealu/Faktury
    se hodnoty zkopírují (změna ceny neovlivní staré doklady).
    """
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    # =====================================================
    # ZÁKLADNÍ ÚDAJE
    # =====================================================
    name = Column(String(255), nullable=False, index=True)
    code = Column(String(50), index=True)  # Interní kód / SKU
    ean = Column(String(20))  # EAN/GTIN kód
    description = Column(Text)  # Popis produktu

    # =====================================================
    # JEDNOTKA
    # =====================================================
    unit = Column(String(20), default="ks")  # ks, hod, měsíc, projekt, m², kg...

    # =====================================================
    # CENA
    # =====================================================
    price = Column(Float, default=0.0, nullable=False)  # Prodejní cena
    currency = Column(String(3), default="CZK")
    tax_rate = Column(Float, default=21.0)  # Výchozí sazba DPH (%)

    # Náklady (pro výpočet marže)
    cost = Column(Float, default=0.0)  # Nákupní/vlastní náklady

    # =====================================================
    # KATEGORIZACE
    # =====================================================
    category = Column(String(100), index=True)  # Kategorie produktu
    tags = Column(JSON, default=list)  # Štítky

    # =====================================================
    # STAV
    # =====================================================
    is_active = Column(Boolean, default=True, nullable=False, index=True)  # Je v nabídce?
    is_featured = Column(Boolean, default=False)  # Oblíbený/doporučený

    # =====================================================
    # METADATA
    # =====================================================
    custom_fields = Column(JSON, default=dict)  # Vlastní pole
    notes = Column(Text)  # Interní poznámky

    # =====================================================
    # AUDIT
    # =====================================================
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by = Column(String(100), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


    # =====================================================
    # RELATIONSHIPS
    # =====================================================
    creator = relationship("User", foreign_keys=[created_by])

    def __repr__(self):
        return f"<Product(id={self.id}, name='{self.name}', price={self.price})>"

    def __str__(self):
        return self.name

    @property
    def display_name(self):
        """Zobrazovací jméno s kódem"""
        if self.code:
            return f"[{self.code}] {self.name}"
        return self.name

    @property
    def margin(self):
        """Marže v absolutní hodnotě"""
        return (self.price or 0) - (self.cost or 0)

    @property
    def margin_percent(self):
        """Marže v procentech"""
        if not self.price or self.price == 0:
            return 0
        return round(((self.price - (self.cost or 0)) / self.price) * 100, 2)

    @property
    def price_with_vat(self):
        """Cena včetně DPH"""
        return round(self.price * (1 + (self.tax_rate or 0) / 100), 2)

    def to_deal_item(self, quantity: float = 1, discount_percent: float = 0) -> dict:
        """
        Převede produkt na položku dealu/faktury.
        Vytvoří snapshot hodnot.
        """
        return {
            "product_id": self.id,
            "name": self.name,
            "description": self.description,
            "code": self.code,
            "quantity": quantity,
            "unit": self.unit,
            "unit_price": self.price,
            "discount_percent": discount_percent,
            "vat_rate": self.tax_rate,
        }
