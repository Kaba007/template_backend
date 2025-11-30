# backend/core/models/auth.py (Lead část)
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, Enum, Index, JSON, Date
)
from sqlalchemy.orm import relationship

from backend.core.db import Base


class LeadStatus(str, PyEnum):
    """Status leadu"""
    NEW = "new"                    # 🆕 Nový
    CONTACTED = "contacted"        # 📞 Kontaktován
    QUALIFIED = "qualified"        # ✅ Kvalifikován
    PROPOSAL = "proposal"          # 📋 Nabídka
    NEGOTIATION = "negotiation"    # 🤝 Jednání
    WON = "won"                    # 💰 Vyhrán
    LOST = "lost"                  # ❌ Ztracen


class LeadSource(str, PyEnum):
    """Zdroj leadu"""
    WEBSITE = "website"            # Web
    PHONE = "phone"                # Telefon
    EMAIL = "email"                # Email
    REFERRAL = "referral"          # Doporučení
    SOCIAL = "social"              # Sociální sítě
    ADVERTISING = "advertising"    # Reklama
    EVENT = "event"                # Událost
    PARTNER = "partner"            # Partner
    OTHER = "other"                # Jiné


class Lead(Base):
    """
    Lead - obchodní příležitost
    
    Minimální vytvoření: pouze title + user_id
    """
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # =====================================================
    # ZÁKLADNÍ ÚDAJE
    # =====================================================
    user_id = Column(String(100), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)  # Jediné povinné pole kromě user_id
    description = Column(Text)  # Popis příležitosti

    # =====================================================
    # STATUS A HODNOTA
    # =====================================================
    status = Column(Enum(LeadStatus), default=LeadStatus.NEW, nullable=False, index=True)
    value = Column(Float, default=0.0)  # Odhadovaná hodnota v CZK (nebo default_currency)
    currency = Column(String(3), default="CZK")  # Měna hodnoty
    probability = Column(Integer, default=0)  # Pravděpodobnost uzavření (0-100%)

    # =====================================================
    # NAPOJENÍ NA FIRMU (OPTIONAL!)
    # =====================================================
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Pokud není company_id, může mít volný text
    company_name = Column(String(255))  # Název firmy jako text
    
    # =====================================================
    # KONTAKTNÍ ÚDAJE
    # =====================================================
    contact_person = Column(String(255))  # Jméno kontaktní osoby
    email = Column(String(255), index=True)
    phone = Column(String(50))
    
    # =====================================================
    # ZDROJ A TRACKING
    # =====================================================
    source = Column(Enum(LeadSource), default=LeadSource.OTHER)  # Odkud lead přišel
    source_details = Column(String(255))  # Detaily zdroje (např. "Google Ads - Kampaň ABC")
    campaign = Column(String(100))  # Marketing kampaň
    
    # =====================================================
    # DŮLEŽITÁ DATA
    # =====================================================
    expected_close_date = Column(Date, nullable=True)  # Očekávané datum uzavření
    next_action_date = Column(Date, nullable=True)  # Datum další akce
    next_action = Column(String(255))  # Co je třeba udělat příště
    
    # =====================================================
    # KVALIFIKACE
    # =====================================================
    is_qualified = Column(Boolean, default=False)  # Je lead kvalifikován?
    qualification_score = Column(Integer, default=0)  # Skóre kvalifikace (0-100)
    
    # Budget a rozhodovací pravomoc
    has_budget = Column(Boolean, default=None, nullable=True)  # Má rozpočet?
    has_authority = Column(Boolean, default=None, nullable=True)  # Má rozhodovací pravomoc?
    has_need = Column(Boolean, default=None, nullable=True)  # Má skutečnou potřebu?
    has_timeline = Column(Boolean, default=None, nullable=True)  # Má časový plán?
    
    # =====================================================
    # KONVERZE
    # =====================================================
    converted_at = Column(DateTime, nullable=True)  # Kdy byl konvertován
    converted_to_deal_id = Column(Integer, nullable=True)  # ID dealu (pokud máte Deal model)
    
    # =====================================================
    # ZTRÁTA
    # =====================================================
    lost_reason = Column(String(255))  # Důvod ztráty
    lost_at = Column(DateTime, nullable=True)  # Kdy byl ztracen
    
    # =====================================================
    # METADATA
    # =====================================================
    tags = Column(JSON, default=list)  # Štítky
    custom_fields = Column(JSON, default=dict)  # Vlastní pole
    notes = Column(Text)  # Poznámky
    
    # =====================================================
    # AUDIT
    # =====================================================
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Kdo vytvořil/upravil
    created_by = Column(String(100), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_to = Column(String(100), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)  # Přiřazeno komu

    __table_args__ = (
        Index('idx_lead_user_status', 'user_id', 'status'),
        Index('idx_lead_status_created', 'status', 'created_at'),
        Index('idx_lead_company', 'company_id'),
        Index('idx_lead_assigned', 'assigned_to', 'status'),
        Index('idx_lead_close_date', 'expected_close_date'),
    )

    # =====================================================
    # RELATIONSHIPS
    # =====================================================
    user = relationship("User", backref="leads", foreign_keys=[user_id])
    company = relationship("Company", backref="leads", foreign_keys=[company_id])  # Optional!
    creator = relationship("User", foreign_keys=[created_by])
    assignee = relationship("User", foreign_keys=[assigned_to])

    def __repr__(self):
        return f"<Lead(id={self.id}, title='{self.title}', status={self.status})>"

    def __str__(self):
        return f"{self.display_name}"

    @property
    def display_name(self):
        """Zobrazovací jméno s ikonou podle statusu"""
        status_icon = {
            LeadStatus.NEW: "🆕",
            LeadStatus.CONTACTED: "📞",
            LeadStatus.QUALIFIED: "✅",
            LeadStatus.PROPOSAL: "📋",
            LeadStatus.NEGOTIATION: "🤝",
            LeadStatus.WON: "💰",
            LeadStatus.LOST: "❌"
        }.get(self.status, "❓")
        return f"{status_icon} {self.title}"

    @property
    def weighted_value(self):
        """Vážená hodnota podle pravděpodobnosti"""
        return (self.value or 0) * ((self.probability or 0) / 100)

    @property
    def is_overdue(self):
        """Je lead po termínu?"""
        if not self.expected_close_date:
            return False
        return datetime.utcnow().date() > self.expected_close_date

    @property
    def days_in_pipeline(self):
        """Kolik dní je lead v pipeline"""
        return (datetime.utcnow() - self.created_at).days

    @property
    def bant_score(self):
        """BANT score (Budget, Authority, Need, Timeline) - 0-4"""
        score = 0
        if self.has_budget: score += 1
        if self.has_authority: score += 1
        if self.has_need: score += 1
        if self.has_timeline: score += 1
        return score