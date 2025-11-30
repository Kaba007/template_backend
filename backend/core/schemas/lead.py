# backend/core/schemas/leads.py
from datetime import datetime, date
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field
from enum import Enum


# =====================================================
# ENUMS
# =====================================================
class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"


class LeadSource(str, Enum):
    WEBSITE = "website"
    PHONE = "phone"
    EMAIL = "email"
    REFERRAL = "referral"
    SOCIAL = "social"
    ADVERTISING = "advertising"
    EVENT = "event"
    PARTNER = "partner"
    OTHER = "other"


# =====================================================
# LEAD SCHEMAS
# =====================================================
class LeadBase(BaseModel):
    """
    Base schema pro Lead.
    
    POVINNÁ POLE:
    - title (název leadu)
    - user_id (vlastník leadu)
    
    Vše ostatní je optional s rozumnými výchozími hodnotami.
    """
    # POVINNÁ
    title: str = Field(..., min_length=1, max_length=255, description="Název leadu")
    user_id: Union[str, int] = Field(..., description="ID uživatele (vlastníka leadu) - string nebo int")
    
    # OPTIONAL - Základní info
    description: Optional[str] = Field(None, description="Popis příležitosti")
    
    # OPTIONAL - Status a hodnota
    status: Optional[LeadStatus] = LeadStatus.NEW
    value: Optional[float] = Field(0.0, ge=0, description="Odhadovaná hodnota")
    currency: Optional[str] = Field("CZK", max_length=3)
    probability: Optional[int] = Field(0, ge=0, le=100, description="Pravděpodobnost uzavření (%)")
    
    # OPTIONAL - Firma (může být ID nebo volný text!)
    company_id: Optional[int] = Field(None, description="ID společnosti z databáze")
    company_name: Optional[str] = Field(None, max_length=255, description="Název firmy (volný text)")
    
    # OPTIONAL - Kontakt
    contact_person: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    
    # OPTIONAL - Zdroj
    source: Optional[LeadSource] = LeadSource.OTHER
    source_details: Optional[str] = Field(None, max_length=255)
    campaign: Optional[str] = Field(None, max_length=100)
    
    # OPTIONAL - Důležitá data
    expected_close_date: Optional[date] = None
    next_action_date: Optional[date] = None
    next_action: Optional[str] = Field(None, max_length=255)
    
    # OPTIONAL - BANT Kvalifikace
    is_qualified: Optional[bool] = False
    qualification_score: Optional[int] = Field(0, ge=0, le=100)
    has_budget: Optional[bool] = None
    has_authority: Optional[bool] = None
    has_need: Optional[bool] = None
    has_timeline: Optional[bool] = None
    
    # OPTIONAL - Ztráta
    lost_reason: Optional[str] = Field(None, max_length=255)
    
    # OPTIONAL - Přiřazení
    assigned_to: Optional[Union[str, int]]  = Field(None, description="ID uživatele, komu je lead přiřazen")
    
    # OPTIONAL - Metadata
    tags: Optional[List[str]] = Field(default_factory=list)
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)
    notes: Optional[str] = None


class LeadCreate(LeadBase):
    """
    Schema pro vytvoření leadu.
    
    Minimální příklad:
    {
        "title": "Nový projekt",
        "user_id": "user123"
    }
    
    S více detaily:
    {
        "title": "Web pro e-shop",
        "user_id": "user123",
        "company_name": "ACME s.r.o.",
        "value": 50000,
        "email": "kontakt@acme.cz",
        "source": "website"
    }
    """
    pass


class LeadUpdate(BaseModel):
    """Schema pro aktualizaci - všechna pole jsou optional"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[LeadStatus] = None
    value: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = None
    probability: Optional[int] = Field(None, ge=0, le=100)
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[LeadSource] = None
    source_details: Optional[str] = None
    campaign: Optional[str] = None
    expected_close_date: Optional[date] = None
    next_action_date: Optional[date] = None
    next_action: Optional[str] = None
    is_qualified: Optional[bool] = None
    qualification_score: Optional[int] = Field(None, ge=0, le=100)
    has_budget: Optional[bool] = None
    has_authority: Optional[bool] = None
    has_need: Optional[bool] = None
    has_timeline: Optional[bool] = None
    lost_reason: Optional[str] = None
    assigned_to: Optional[Union[str, int]]  = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class LeadPublic(LeadBase):
    """Schema pro response - obsahuje computed fields"""
    id: int
    
    # Computed fields
    converted_at: Optional[datetime] = None
    converted_to_deal_id: Optional[int] = None
    lost_at: Optional[datetime] = None
    
    # Audit
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    
    # Enriched company data (pokud je company_id)
    company_data: Optional[Dict[str, Any]] = None  # Obohacená data z Company
    
    class Config:
        from_attributes = True


class LeadSimple(BaseModel):
    """Zjednodušená verze pro dropdown/reference"""
    id: int
    title: str
    status: LeadStatus
    value: float
    company_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class LeadStats(BaseModel):
    """Statistiky leadů"""
    total: int
    by_status: Dict[str, int]
    total_value: float
    weighted_value: float
    avg_probability: float
    conversion_rate: float


# =====================================================
# HELPER - Minimální příklady
# =====================================================
"""
MINIMÁLNÍ VYTVOŘENÍ LEADU:

{
    "title": "Nový projekt",
    "user_id": "user123"
}

S FIRMOU Z DATABÁZE:

{
    "title": "Web pro e-shop",
    "user_id": "user123",
    "company_id": 5
}

S FIRMOU JAKO TEXT (bez napojení):

{
    "title": "Web pro e-shop",
    "user_id": "user123",
    "company_name": "ACME s.r.o.",
    "email": "kontakt@acme.cz",
    "phone": "+420 123 456 789"
}

KOMPLETNÍ LEAD:

{
    "title": "Kompletní web s e-shopem",
    "user_id": "user123",
    "description": "Zákazník potřebuje moderní e-shop s platební bránou",
    "company_id": 5,
    "contact_person": "Jan Novák",
    "email": "jan.novak@firma.cz",
    "phone": "+420 123 456 789",
    "value": 150000,
    "currency": "CZK",
    "probability": 60,
    "status": "qualified",
    "source": "referral",
    "source_details": "Doporučení od Jana Svobody",
    "expected_close_date": "2025-03-15",
    "next_action_date": "2025-02-01",
    "next_action": "Připravit cenovou nabídku",
    "has_budget": true,
    "has_authority": true,
    "has_need": true,
    "has_timeline": true,
    "tags": ["prioritní", "web", "e-commerce"],
    "notes": "Zákazník má pevný deadline 31.3.2025"
}
"""