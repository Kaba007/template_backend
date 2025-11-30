# backend/routers/leads.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime

from backend.core.services.auth import get_current_user, require_permissions
from backend.core.db import get_db
from backend.core.models.auth import User, PermissionType
from backend.core.models.lead import Lead, LeadStatus
from backend.core.models.company import Company  # Import Company
from backend.core.schemas.lead import LeadCreate, LeadUpdate, LeadPublic, LeadStats
from backend.core.utils.search import apply_dynamic_filters, get_filter_params

router = APIRouter()


# =====================================================
# HELPER FUNCTIONS
# =====================================================
def enrich_lead_with_company(lead: Lead, db: Session) -> dict:
    """Obohať lead o data společnosti (pokud má company_id)"""
    lead_dict = {
        "id": lead.id,
        "user_id": lead.user_id,
        "title": lead.title,
        "description": lead.description,
        "status": lead.status,
        "value": lead.value,
        "currency": lead.currency,
        "probability": lead.probability,
        "company_id": lead.company_id,
        "company_name": lead.company_name,
        "contact_person": lead.contact_person,
        "email": lead.email,
        "phone": lead.phone,
        "source": lead.source,
        "source_details": lead.source_details,
        "campaign": lead.campaign,
        "expected_close_date": lead.expected_close_date,
        "next_action_date": lead.next_action_date,
        "next_action": lead.next_action,
        "is_qualified": lead.is_qualified,
        "qualification_score": lead.qualification_score,
        "has_budget": lead.has_budget,
        "has_authority": lead.has_authority,
        "has_need": lead.has_need,
        "has_timeline": lead.has_timeline,
        "converted_at": lead.converted_at,
        "converted_to_deal_id": lead.converted_to_deal_id,
        "lost_reason": lead.lost_reason,
        "lost_at": lead.lost_at,
        "assigned_to": lead.assigned_to,
        "tags": lead.tags,
        "custom_fields": lead.custom_fields,
        "notes": lead.notes,
        "is_active": lead.is_active,
        "created_at": lead.created_at,
        "updated_at": lead.updated_at,
        "created_by": lead.created_by,
    }
    
    # Pokud má company_id, načti data společnosti
    if lead.company_id:
        company = db.query(Company).filter(Company.id == lead.company_id).first()
        if company:
            lead_dict["company_data"] = {
                "id": company.id,
                "name": company.name,
                "ico": company.ico,
                "dic": company.dic,
                "email": company.email,
                "phone": company.phone,
                "address_city": company.address_city,
            }
            # Pokud nemá company_name, nastav z company
            if not lead_dict["company_name"]:
                lead_dict["company_name"] = company.name
    
    return lead_dict


# =====================================================
# ENDPOINTS
# =====================================================
@router.get(
    "/",
    response_model=List[LeadPublic],
    dependencies=[Depends(require_permissions("leads", PermissionType.READ))]
)
async def list_leads(
    skip: int = 0,
    limit: int = 100,
    filters: dict = Depends(get_filter_params()),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Vrátí seznam leadů s možností filtrování.
    
    Podporované filtry:
    - status: single nebo multiple (?status=new&status=contacted)
    - company_id: single nebo multiple
    - assigned_to: ID přiřazeného uživatele
    - value_from, value_to: rozsah hodnoty
    - title: ILIKE hledání v názvu
    """
    query = db.query(Lead)
    query = apply_dynamic_filters(query, Lead, filters)
    leads = query.order_by(Lead.created_at.desc()).offset(skip).limit(limit).all()
    
    # Enrich s company daty
    return [enrich_lead_with_company(lead, db) for lead in leads]


@router.post(
    "/",
    response_model=LeadPublic,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("leads", PermissionType.WRITE))]
)
async def create_lead(
    lead_data: LeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Vytvoří nový lead.
    
    Minimální požadavky:
    - title
    - user_id
    
    Volitelně:
    - company_id (napojení na existující firmu)
    - nebo company_name (volný text bez napojení)
    """
    # Zkontroluj user
    user = db.query(User).filter(User.id == lead_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Zkontroluj company (pokud je zadáno)
    if lead_data.company_id:
        company = db.query(Company).filter(Company.id == lead_data.company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        # Auto-fill company_name z databáze
        if not lead_data.company_name:
            lead_data.company_name = company.name
    
    # Vytvoř lead
    lead_dict = lead_data.model_dump()
    lead_dict['created_by'] = current_user.id
    
    # Pokud není assigned_to, přiřaď sobě
    if not lead_dict.get('assigned_to'):
        lead_dict['assigned_to'] = current_user.id
    
    lead = Lead(**lead_dict)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    
    return enrich_lead_with_company(lead, db)


@router.get(
    "/{lead_id}",
    response_model=LeadPublic,
    dependencies=[Depends(require_permissions("leads", PermissionType.READ))]
)
async def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí detail leadu včetně dat společnosti."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return enrich_lead_with_company(lead, db)


@router.patch("/{lead_id}", response_model=LeadPublic, dependencies=[Depends(require_permissions("leads", PermissionType.WRITE))])
@router.put("/{lead_id}", response_model=LeadPublic, dependencies=[Depends(require_permissions("leads", PermissionType.WRITE))])
async def update_lead(
    lead_id: int,
    lead_data: LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aktualizuje lead."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    update_data = lead_data.model_dump(exclude_unset=True)
    
    # Pokud se mění company_id, zkontroluj existenci
    if 'company_id' in update_data and update_data['company_id']:
        company = db.query(Company).filter(Company.id == update_data['company_id']).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        # Auto-update company_name
        if 'company_name' not in update_data or not update_data['company_name']:
            update_data['company_name'] = company.name
    
    # Status změny
    if 'status' in update_data:
        new_status = update_data['status']
        
        # Při WON - nastav converted_at
        if new_status == LeadStatus.WON and not lead.converted_at:
            update_data['converted_at'] = datetime.utcnow()
        
        # Při LOST - nastav lost_at
        if new_status == LeadStatus.LOST and not lead.lost_at:
            update_data['lost_at'] = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(lead, field, value)
    
    db.commit()
    db.refresh(lead)
    
    return enrich_lead_with_company(lead, db)


@router.delete(
    "/{lead_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("leads", PermissionType.WRITE))]
)
async def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Smaže lead."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    db.delete(lead)
    db.commit()
    return None


@router.post(
    "/bulk",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("leads", PermissionType.WRITE))]
)
async def bulk_delete_leads(
    ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Hromadné mazání leadů."""
    db.query(Lead).filter(Lead.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return None


@router.get(
    "/stats/overview",
    response_model=LeadStats,
    dependencies=[Depends(require_permissions("leads", PermissionType.READ))]
)
async def get_lead_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí statistiky leadů."""
    leads = db.query(Lead).filter(Lead.is_active == True).all()
    
    total = len(leads)
    by_status = {}
    total_value = 0
    weighted_value = 0
    total_prob = 0
    won_count = 0
    
    for lead in leads:
        # Count by status
        status_str = lead.status.value if hasattr(lead.status, 'value') else str(lead.status)
        by_status[status_str] = by_status.get(status_str, 0) + 1
        
        # Values
        total_value += lead.value or 0
        weighted_value += (lead.value or 0) * ((lead.probability or 0) / 100)
        total_prob += lead.probability or 0
        
        if lead.status == LeadStatus.WON:
            won_count += 1
    
    return {
        "total": total,
        "by_status": by_status,
        "total_value": round(total_value, 2),
        "weighted_value": round(weighted_value, 2),
        "avg_probability": round(total_prob / total, 2) if total > 0 else 0,
        "conversion_rate": round((won_count / total) * 100, 2) if total > 0 else 0
    }


@router.post(
    "/{lead_id}/convert",
    response_model=LeadPublic,
    dependencies=[Depends(require_permissions("leads", PermissionType.WRITE))]
)
async def convert_lead(
    lead_id: int,
    deal_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Konvertuje lead na WON (a případně propojí s dealem)."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead.status = LeadStatus.WON
    lead.converted_at = datetime.utcnow()
    if deal_id:
        lead.converted_to_deal_id = deal_id
    
    db.commit()
    db.refresh(lead)
    
    return enrich_lead_with_company(lead, db)


@router.post(
    "/{lead_id}/qualify",
    response_model=LeadPublic,
    dependencies=[Depends(require_permissions("leads", PermissionType.WRITE))]
)
async def qualify_lead(
    lead_id: int,
    has_budget: bool,
    has_authority: bool,
    has_need: bool,
    has_timeline: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """BANT kvalifikace leadu."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead.has_budget = has_budget
    lead.has_authority = has_authority
    lead.has_need = has_need
    lead.has_timeline = has_timeline
    
    # Spočítej BANT score
    bant_score = sum([has_budget, has_authority, has_need, has_timeline])
    lead.qualification_score = (bant_score / 4) * 100
    
    # Pokud všechny 4, automaticky kvalifikuj
    if bant_score == 4:
        lead.is_qualified = True
        if lead.status == LeadStatus.NEW:
            lead.status = LeadStatus.QUALIFIED
    
    db.commit()
    db.refresh(lead)
    
    return enrich_lead_with_company(lead, db)