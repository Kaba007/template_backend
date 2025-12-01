# backend/routers/deals.py
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from backend.core.services.auth import get_current_user, require_permissions
from backend.core.db import get_db
from backend.core.models.auth import User, PermissionType
from backend.core.models.lead import Lead, LeadStatus
from backend.core.models.deal import Deal, DealStatus, PaymentStatus, DealSequence
from backend.core.models.invocie import Invoice, InvoiceType, InvoiceSequence
from backend.core.models.company import Company
from backend.core.schemas.deal import (
    DealCreate, DealUpdate, DealPublic, DealSimple, 
    DealListItem, DealStats, LeadToDealConvert
)
from backend.core.schemas.invoice import InvoiceFromDealCreate, InvoiceFromDealResponse
from backend.core.utils.search import apply_dynamic_filters, get_filter_params

router = APIRouter()


# =====================================================
# HELPERS
# =====================================================
def get_next_deal_number(db: Session, user_id: str) -> str:
    """Vygeneruje další číslo objednávky."""
    current_year = datetime.utcnow().year

    sequence = db.query(DealSequence).filter(
        DealSequence.user_id == user_id,
        DealSequence.year == current_year
    ).first()

    if not sequence:
        sequence = DealSequence(
            user_id=user_id,
            year=current_year,
            prefix="OBJ",
            last_number=0,
            format_pattern="{prefix}{year}-{number:04d}"
        )
        db.add(sequence)

    deal_number = sequence.get_next_number()
    db.flush()
    return deal_number


def get_next_invoice_number(db: Session, invoice_type: InvoiceType) -> str:
    """Vygeneruje další číslo faktury."""
    current_year = datetime.utcnow().year

    sequence = db.query(InvoiceSequence).filter(
        InvoiceSequence.invoice_type == invoice_type,
        InvoiceSequence.year == current_year
    ).first()

    if not sequence:
        prefix_map = {
            InvoiceType.INVOICE: "FV",
            InvoiceType.PROFORMA: "PF",
            InvoiceType.CREDIT_NOTE: "D",
            InvoiceType.DEBIT_NOTE: "V",
            InvoiceType.RECEIPT: "P",
        }
        sequence = InvoiceSequence(
            invoice_type=invoice_type,
            year=current_year,
            prefix=prefix_map.get(invoice_type, "FV"),
            last_number=0,
            format_pattern="{prefix}{year}{number:04d}"
        )
        db.add(sequence)

    invoice_number = sequence.get_next_number()
    db.flush()
    return invoice_number


def enrich_deal_response(deal: Deal, db: Session) -> dict:
    """Obohatí deal response o related data."""
    deal_dict = {
        "id": deal.id,
        "deal_number": deal.deal_number,
        "title": deal.title,
        "description": deal.description,
        "status": deal.status,
        "user_id": deal.user_id,
        "lead_id": deal.lead_id,
        "company_id": deal.company_id,
        "company_name": deal.company_name or (deal.company.name if deal.company else None),
        "contact_person": deal.contact_person,
        "email": deal.email,
        "phone": deal.phone,
        "items": deal.items or [],  # DŮLEŽITÉ: Vrátí prázdné pole místo None
        "currency": deal.currency,
        "subtotal": deal.subtotal,
        "discount": deal.discount,
        "discount_type": deal.discount_type,
        "discount_amount": deal.discount_amount,
        "subtotal_after_discount": deal.subtotal_after_discount,
        "vat_breakdown": deal.vat_breakdown or {},
        "total_vat": deal.total_vat,
        "total": deal.total,
        "rounding": deal.rounding,
        "payment_status": deal.payment_status,
        "paid_amount": deal.paid_amount,
        "remaining_amount": deal.remaining_amount,
        "payment_method": deal.payment_method,
        "deal_date": deal.deal_date,
        "delivery_date": deal.delivery_date,
        "completed_at": deal.completed_at,
        "assigned_to": deal.assigned_to,
        "tags": deal.tags or [],
        "custom_fields": deal.custom_fields or {},
        "notes": deal.notes,
        "internal_notes": deal.internal_notes,
        "is_active": deal.is_active,
        "created_at": deal.created_at,
        "updated_at": deal.updated_at,
        "created_by": deal.created_by,
    }

    # Lead data
    if deal.lead:
        deal_dict["lead_data"] = {
            "id": deal.lead.id,
            "title": deal.lead.title,
            "status": deal.lead.status,
            "source": deal.lead.source,
        }

    # Company data
    if deal.company:
        deal_dict["company_data"] = {
            "id": deal.company.id,
            "name": deal.company.name,
            "ico": getattr(deal.company, 'ico', None),
            "email": getattr(deal.company, 'email', None),
        }

    # Invoices summary
    if deal.invoices:
        deal_dict["invoices_summary"] = [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "invoice_type": inv.invoice_type,
                "status": inv.status,
                "total": inv.total,
                "paid_amount": inv.paid_amount,
            }
            for inv in deal.invoices if inv.is_active
        ]
        deal_dict["invoiced_amount"] = sum(inv.total for inv in deal.invoices if inv.is_active)

    return deal_dict


# =====================================================
# LIST & SEARCH
# =====================================================
@router.get(
    "/",
    response_model=List[DealPublic],
    dependencies=[Depends(require_permissions("deals", PermissionType.READ))]
)
async def list_deals(
    skip: int = 0,
    limit: int = 100,
    status: Optional[DealStatus] = None,
    payment_status: Optional[PaymentStatus] = None,
    company_id: Optional[int] = None,
    search: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    filters: dict = Depends(get_filter_params()),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Vrátí seznam dealů s možností filtrování.
    
    - **status**: Filtr podle stavu (draft, confirmed, in_progress, completed, cancelled)
    - **payment_status**: Filtr podle stavu platby
    - **company_id**: Filtr podle firmy
    - **search**: Hledání v čísle a názvu
    - **date_from/date_to**: Filtr podle data uzavření
    """
    query = db.query(Deal).options(
        joinedload(Deal.lead),
        joinedload(Deal.company),
        joinedload(Deal.invoices)
    ).filter(
        Deal.user_id == current_user.id,
        Deal.is_active == True
    )

    if status:
        query = query.filter(Deal.status == status)

    if payment_status:
        query = query.filter(Deal.payment_status == payment_status)

    if company_id:
        query = query.filter(Deal.company_id == company_id)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Deal.deal_number.ilike(search_term)) |
            (Deal.title.ilike(search_term)) |
            (Deal.company_name.ilike(search_term))
        )

    if date_from:
        query = query.filter(Deal.deal_date >= date_from)

    if date_to:
        query = query.filter(Deal.deal_date <= date_to)

    query = apply_dynamic_filters(query, Deal, filters)
    query = query.order_by(Deal.created_at.desc())

    deals = query.offset(skip).limit(limit).all()
    
    # Obohať všechny dealy o related data
    return [enrich_deal_response(deal, db) for deal in deals]


@router.get(
    "/simple",
    response_model=List[DealSimple],
    dependencies=[Depends(require_permissions("deals", PermissionType.READ))]
)
async def list_deals_simple(
    search: Optional[str] = None,
    status: Optional[DealStatus] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí zjednodušený seznam dealů pro dropdown."""
    query = db.query(Deal).filter(
        Deal.user_id == current_user.id,
        Deal.is_active == True
    )

    if status:
        query = query.filter(Deal.status == status)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Deal.deal_number.ilike(search_term)) |
            (Deal.title.ilike(search_term))
        )

    query = query.order_by(Deal.created_at.desc())
    return query.limit(limit).all()


@router.get(
    "/stats",
    response_model=DealStats,
    dependencies=[Depends(require_permissions("deals", PermissionType.READ))]
)
async def get_deal_stats(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí statistiky dealů."""
    query = db.query(Deal).filter(
        Deal.user_id == current_user.id,
        Deal.is_active == True
    )

    if date_from:
        query = query.filter(Deal.deal_date >= date_from)
    if date_to:
        query = query.filter(Deal.deal_date <= date_to)

    deals = query.all()

    by_status = {}
    total_value = 0
    paid_value = 0

    for deal in deals:
        status_key = deal.status.value if deal.status else "unknown"
        by_status[status_key] = by_status.get(status_key, 0) + 1
        total_value += deal.total or 0
        paid_value += deal.paid_amount or 0

    return {
        "total_count": len(deals),
        "by_status": by_status,
        "total_value": round(total_value, 2),
        "paid_value": round(paid_value, 2),
        "unpaid_value": round(total_value - paid_value, 2),
        "avg_deal_value": round(total_value / len(deals), 2) if deals else 0,
    }


# =====================================================
# CRUD
# =====================================================
@router.post(
    "/",
    response_model=DealPublic,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("deals", PermissionType.WRITE))]
)
async def create_deal(
    deal_data: DealCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Vytvoří nový deal.
    
    Minimální požadavky:
    - title (název)
    
    user_id a deal_number se doplní automaticky.
    """
    data = deal_data.model_dump()
    data['user_id'] = current_user.id
    data['created_by'] = current_user.id
    data['deal_number'] = get_next_deal_number(db, current_user.id)

    deal = Deal(**data)
    deal.recalculate_totals()

    db.add(deal)
    db.commit()
    db.refresh(deal)

    return enrich_deal_response(deal, db)


@router.get(
    "/{deal_id}",
    response_model=DealPublic,
    dependencies=[Depends(require_permissions("deals", PermissionType.READ))]
)
async def get_deal(
    deal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí detail dealu včetně souvisejících dat."""
    deal = db.query(Deal).options(
        joinedload(Deal.lead),
        joinedload(Deal.company),
        joinedload(Deal.invoices)
    ).filter(
        Deal.id == deal_id,
        Deal.user_id == current_user.id
    ).first()

    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal nenalezen"
        )

    return enrich_deal_response(deal, db)


@router.patch("/{deal_id}", response_model=DealPublic, dependencies=[Depends(require_permissions("deals", PermissionType.WRITE))])
@router.put("/{deal_id}", response_model=DealPublic, dependencies=[Depends(require_permissions("deals", PermissionType.WRITE))])
async def update_deal(
    deal_id: int,
    deal_data: DealUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aktualizuje deal."""
    deal = db.query(Deal).filter(
        Deal.id == deal_id,
        Deal.user_id == current_user.id
    ).first()

    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal nenalezen"
        )

    update_data = deal_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(deal, field, value)

    # Přepočítej součty pokud se změnily položky
    if 'items' in update_data or 'discount' in update_data or 'discount_type' in update_data:
        deal.recalculate_totals()

    db.commit()
    db.refresh(deal)

    return enrich_deal_response(deal, db)


@router.delete(
    "/{deal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("deals", PermissionType.WRITE))]
)
async def delete_deal(
    deal_id: int,
    permanent: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Smaže deal.
    
    - **permanent=False**: Soft delete
    - **permanent=True**: Trvalé smazání (pouze pokud nemá faktury)
    """
    deal = db.query(Deal).filter(
        Deal.id == deal_id,
        Deal.user_id == current_user.id
    ).first()

    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal nenalezen"
        )

    if permanent:
        # Kontrola faktur
        if deal.invoices and any(inv.is_active for inv in deal.invoices):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nelze smazat deal s aktivními fakturami"
            )
        db.delete(deal)
    else:
        deal.is_active = False

    db.commit()
    return None


# =====================================================
# WORKFLOW - Konverze Lead → Deal
# =====================================================
@router.post(
    "/from-lead",
    response_model=DealPublic,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("deals", PermissionType.WRITE))]
)
async def create_deal_from_lead(
    convert_data: LeadToDealConvert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Vytvoří deal z leadu a označí lead jako konvertovaný.
    
    Lead musí patřit aktuálnímu uživateli.
    """
    # Najdi lead
    lead = db.query(Lead).filter(
        Lead.id == convert_data.lead_id,
        Lead.user_id == current_user.id
    ).first()

    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead nenalezen"
        )

    if lead.status == LeadStatus.WON:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lead již byl konvertován"
        )

    # Připrav data pro deal
    deal_data = lead.convert_to_deal(deal_title=convert_data.title)
    deal_data['deal_number'] = get_next_deal_number(db, current_user.id)
    deal_data['created_by'] = current_user.id
    deal_data['deal_date'] = convert_data.deal_date or date.today()
    deal_data['items'] = [item.model_dump() for item in convert_data.items] if convert_data.items else []

    if convert_data.notes:
        deal_data['notes'] = convert_data.notes

    # Vytvoř deal
    deal = Deal(**deal_data)
    deal.recalculate_totals()
    db.add(deal)
    db.flush()

    # Označ lead jako konvertovaný
    lead.mark_as_converted(deal.id)

    db.commit()
    db.refresh(deal)

    return enrich_deal_response(deal, db)


# =====================================================
# WORKFLOW - Vytvoření faktury z dealu
# =====================================================
@router.post(
    "/{deal_id}/create-invoice",
    response_model=InvoiceFromDealResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("invoices", PermissionType.WRITE))]
)
async def create_invoice_from_deal(
    deal_id: int,
    invoice_data: InvoiceFromDealCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Vytvoří fakturu z dealu.
    
    Položky se automaticky zkopírují z dealu.
    K jednomu dealu může být více faktur (zálohy, částečné fakturace, dobropisy).
    """
    # Načti deal
    deal = db.query(Deal).options(
        joinedload(Deal.company)
    ).filter(
        Deal.id == deal_id,
        Deal.user_id == current_user.id
    ).first()

    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal nenalezen"
        )

    # Načti dodavatele
    supplier = db.query(Company).filter(
        Company.id == invoice_data.supplier_id
    ).first()

    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dodavatel nenalezen"
        )

    # Kontrola customer
    if not deal.company_id and not deal.company_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deal nemá přiřazenou firmu - nelze vystavit fakturu"
        )

    # Typ faktury
    invoice_type = InvoiceType(invoice_data.invoice_type) if invoice_data.invoice_type else InvoiceType.INVOICE

    # Připrav kwargs pro create_from_deal
    create_kwargs = {
        'issue_date': invoice_data.issue_date,
        'due_date': invoice_data.due_date,
        'tax_date': invoice_data.tax_date or invoice_data.issue_date,
        'created_by': current_user.id,
    }
    
    # Přidej optional fieldy pouze pokud jsou zadané
    if invoice_data.variable_symbol:
        create_kwargs['variable_symbol'] = invoice_data.variable_symbol
    if invoice_data.header_text:
        create_kwargs['header_text'] = invoice_data.header_text
    if invoice_data.footer_text:
        create_kwargs['footer_text'] = invoice_data.footer_text
    if invoice_data.notes:
        create_kwargs['notes'] = invoice_data.notes
    if invoice_data.payment_instructions:
        create_kwargs['payment_instructions'] = invoice_data.payment_instructions
    if invoice_data.vat_mode:
        create_kwargs['vat_mode'] = invoice_data.vat_mode
    if invoice_data.currency:
        create_kwargs['currency'] = invoice_data.currency

    # Vytvoř fakturu
    invoice = Invoice.create_from_deal(
        deal=deal,
        supplier=supplier,
        invoice_type=invoice_type,
        **create_kwargs
    )

    # Generuj číslo faktury
    invoice.invoice_number = get_next_invoice_number(db, invoice_type)

    # Variabilní symbol = číslo faktury bez prefixu (nebo custom)
    if not invoice.variable_symbol:
        invoice.variable_symbol = invoice.invoice_number.replace("-", "").replace("/", "")[-10:]

    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    return {
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "deal_id": deal.id,
        "deal_number": deal.deal_number,
        "total": invoice.total,
        "currency": invoice.currency,
        "message": f"Faktura {invoice.invoice_number} úspěšně vytvořena z dealu {deal.deal_number}"
    }


# =====================================================
# WORKFLOW - Status změny
# =====================================================
@router.post(
    "/{deal_id}/confirm",
    response_model=DealPublic,
    dependencies=[Depends(require_permissions("deals", PermissionType.WRITE))]
)
async def confirm_deal(
    deal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Potvrdí deal (změní status na confirmed)."""
    deal = db.query(Deal).filter(
        Deal.id == deal_id,
        Deal.user_id == current_user.id
    ).first()

    if not deal:
        raise HTTPException(status_code=404, detail="Deal nenalezen")

    if deal.status != DealStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Pouze koncepty lze potvrdit")

    deal.status = DealStatus.CONFIRMED
    deal.deal_date = deal.deal_date or date.today()

    db.commit()
    db.refresh(deal)
    return enrich_deal_response(deal, db)


@router.post(
    "/{deal_id}/start",
    response_model=DealPublic,
    dependencies=[Depends(require_permissions("deals", PermissionType.WRITE))]
)
async def start_deal(
    deal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Zahájí realizaci dealu (změní status na in_progress)."""
    deal = db.query(Deal).filter(
        Deal.id == deal_id,
        Deal.user_id == current_user.id
    ).first()

    if not deal:
        raise HTTPException(status_code=404, detail="Deal nenalezen")

    if deal.status not in [DealStatus.DRAFT, DealStatus.CONFIRMED]:
        raise HTTPException(status_code=400, detail="Deal nelze zahájit")

    deal.status = DealStatus.IN_PROGRESS

    db.commit()
    db.refresh(deal)
    return enrich_deal_response(deal, db)


@router.post(
    "/{deal_id}/complete",
    response_model=DealPublic,
    dependencies=[Depends(require_permissions("deals", PermissionType.WRITE))]
)
async def complete_deal(
    deal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Dokončí deal (změní status na completed)."""
    deal = db.query(Deal).filter(
        Deal.id == deal_id,
        Deal.user_id == current_user.id
    ).first()

    if not deal:
        raise HTTPException(status_code=404, detail="Deal nenalezen")

    deal.status = DealStatus.COMPLETED
    deal.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(deal)
    return enrich_deal_response(deal, db)


@router.post(
    "/{deal_id}/cancel",
    response_model=DealPublic,
    dependencies=[Depends(require_permissions("deals", PermissionType.WRITE))]
)
async def cancel_deal(
    deal_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Zruší deal."""
    deal = db.query(Deal).filter(
        Deal.id == deal_id,
        Deal.user_id == current_user.id
    ).first()

    if not deal:
        raise HTTPException(status_code=404, detail="Deal nenalezen")

    if deal.status == DealStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Dokončený deal nelze zrušit")

    deal.status = DealStatus.CANCELLED
    if reason:
        deal.internal_notes = f"{deal.internal_notes or ''}\n\nDůvod zrušení: {reason}".strip()

    db.commit()
    db.refresh(deal)
    return enrich_deal_response(deal, db)


# =====================================================
# WORKFLOW - Přepočet plateb
# =====================================================
@router.post(
    "/{deal_id}/recalculate-payments",
    response_model=DealPublic,
    dependencies=[Depends(require_permissions("deals", PermissionType.WRITE))]
)
async def recalculate_deal_payments(
    deal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Přepočítá stav plateb z faktur."""
    deal = db.query(Deal).options(
        joinedload(Deal.invoices)
    ).filter(
        Deal.id == deal_id,
        Deal.user_id == current_user.id
    ).first()

    if not deal:
        raise HTTPException(status_code=404, detail="Deal nenalezen")

    deal.recalculate_payment_status()

    db.commit()
    db.refresh(deal)
    return enrich_deal_response(deal, db)


# =====================================================
# BULK OPERATIONS
# =====================================================
@router.delete(
    "/bulk",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("deals", PermissionType.WRITE))]
)
async def bulk_delete_deals(
    deal_ids: List[int],
    permanent: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Hromadné smazání dealů."""
    deals = db.query(Deal).filter(
        Deal.id.in_(deal_ids),
        Deal.user_id == current_user.id
    ).all()

    if not deals:
        raise HTTPException(status_code=404, detail="Žádné dealy nenalezeny")

    for deal in deals:
        if permanent:
            if deal.invoices and any(inv.is_active for inv in deal.invoices):
                continue  # Skip deals with invoices
            db.delete(deal)
        else:
            deal.is_active = False

    db.commit()
    return None