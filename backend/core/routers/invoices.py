# backend/routers/invoices.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime, date

from backend.core.services.auth import get_current_user, require_permissions
from backend.core.db import get_db
from backend.core.models.auth import User, PermissionType
from backend.core.models.invocie import Invoice, Company, InvoiceSequence, InvoiceType, InvoiceStatus, VatMode
from backend.core.schemas.invoice import (
    InvoiceCreate, InvoiceUpdate, InvoicePublic, InvoiceListItem
)
from backend.core.utils.search import apply_dynamic_filters, get_filter_params

router = APIRouter()


# =====================================================
# HELPER FUNCTIONS
# =====================================================
def get_or_create_sequence(db: Session, invoice_type: InvoiceType, year: int) -> InvoiceSequence:
    """Získá nebo vytvoří číselnou řadu pro daný typ a rok"""
    sequence = db.query(InvoiceSequence).filter(
        InvoiceSequence.invoice_type == invoice_type,
        InvoiceSequence.year == year
    ).first()

    if not sequence:
        # Definice prefixů podle typu
        prefixes = {
            InvoiceType.INVOICE: "FV",
            InvoiceType.PROFORMA: "PF",
            InvoiceType.CREDIT_NOTE: "D",
            InvoiceType.DEBIT_NOTE: "V",
            InvoiceType.RECEIPT: "P",
        }

        sequence = InvoiceSequence(
            invoice_type=invoice_type,
            year=year,
            prefix=prefixes.get(invoice_type, "X"),
            last_number=0
        )
        db.add(sequence)
        db.flush()

    return sequence


def generate_invoice_number(db: Session, invoice_type: InvoiceType) -> str:
    """Vygeneruje nové číslo faktury"""
    year = datetime.utcnow().year
    sequence = get_or_create_sequence(db, invoice_type, year)
    return sequence.get_next_number()


def copy_company_to_invoice(company: Company, prefix: str) -> dict:
    """Zkopíruje údaje společnosti do dict pro fakturu"""
    return {
        f"{prefix}_name": company.name,
        f"{prefix}_legal_name": company.legal_name,
        f"{prefix}_ico": company.ico,
        f"{prefix}_dic": company.dic,
        f"{prefix}_vat_id": company.vat_id,
        f"{prefix}_address_street": company.address_street,
        f"{prefix}_address_city": company.address_city,
        f"{prefix}_address_zip": company.address_zip,
        f"{prefix}_address_country": company.address_country,
        f"{prefix}_address_country_name": company.address_country_name,
        f"{prefix}_email": company.email,
        f"{prefix}_phone": company.phone,
    }


def calculate_invoice_totals(items: list, vat_mode: VatMode) -> dict:
    """Vypočítá součty z položek faktury"""
    subtotal = 0.0
    discount_total = 0.0
    vat_breakdown = {}

    for item in (items or []):
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
        if vat_mode == VatMode.WITH_VAT:
            item_vat = item_after_discount * (vat_rate / 100)

            rate_key = str(int(vat_rate))
            if rate_key not in vat_breakdown:
                vat_breakdown[rate_key] = {'base': 0.0, 'vat': 0.0}
            vat_breakdown[rate_key]['base'] += item_after_discount
            vat_breakdown[rate_key]['vat'] += item_vat

    total_vat = sum(v['vat'] for v in vat_breakdown.values())

    return {
        'subtotal': round(subtotal, 2),
        'discount_amount': round(discount_total, 2),
        'subtotal_after_discount': round(subtotal - discount_total, 2),
        'vat_breakdown': {k: {'base': round(v['base'], 2), 'vat': round(v['vat'], 2)} for k, v in vat_breakdown.items()},
        'total_vat': round(total_vat, 2),
        'total': round(subtotal - discount_total + total_vat, 2)
    }


# =====================================================
# ENDPOINTS
# =====================================================
@router.get(
    "/",
    response_model=List[InvoicePublic],
    dependencies=[Depends(require_permissions("invoices", PermissionType.READ))]
)
async def list_invoices(
    skip: int = 0,
    limit: int = 100,
    invoice_type: Optional[InvoiceType] = None,
    status: Optional[InvoiceStatus] = None,
    filters: dict = Depends(get_filter_params()),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí seznam faktur s možností filtrování."""
    query = db.query(Invoice)

    if invoice_type:
        query = query.filter(Invoice.invoice_type == invoice_type)
    if status:
        query = query.filter(Invoice.status == status)

    query = apply_dynamic_filters(query, Invoice, filters)
    return query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()


@router.post(
    "/",
    response_model=InvoicePublic,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permissions("invoices", PermissionType.WRITE))]
)
async def create_invoice(
    invoice_data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vytvoří novou fakturu."""

    # Načti dodavatele
    supplier = db.query(Company).filter(Company.id == invoice_data.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    # Načti odběratele
    customer = db.query(Company).filter(Company.id == invoice_data.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Připrav data
    invoice_dict = invoice_data.model_dump()

    # Vygeneruj číslo faktury
    if not invoice_dict.get('invoice_number'):
        invoice_dict['invoice_number'] = generate_invoice_number(db, invoice_data.invoice_type)

    # Variabilní symbol = číslo faktury (bez písmen)
    if not invoice_dict.get('variable_symbol'):
        invoice_dict['variable_symbol'] = ''.join(filter(str.isdigit, invoice_dict['invoice_number']))

    # Zkopíruj údaje dodavatele
    supplier_data = copy_company_to_invoice(supplier, 'supplier')
    supplier_data['supplier_is_vat_payer'] = supplier.is_vat_payer
    supplier_data['supplier_website'] = supplier.website
    supplier_data['supplier_bank_name'] = supplier.bank_name
    supplier_data['supplier_bank_account'] = supplier.bank_account
    supplier_data['supplier_bank_iban'] = supplier.bank_iban
    supplier_data['supplier_bank_swift'] = supplier.bank_swift
    invoice_dict.update(supplier_data)

    # Zkopíruj údaje odběratele
    customer_data = copy_company_to_invoice(customer, 'customer')
    invoice_dict.update(customer_data)

    # Převeď položky na dict
    invoice_dict['items'] = [
        item.model_dump() if hasattr(item, 'model_dump') else item
        for item in (invoice_dict.get('items') or [])
    ]

    # Vypočítej součty
    totals = calculate_invoice_totals(invoice_dict['items'], invoice_data.vat_mode)

    # Přidej zaokrouhlení
    if invoice_dict.get('rounding'):
        totals['total'] = round(totals['total'] + invoice_dict['rounding'], 2)

    invoice_dict.update(totals)

    # Nastav DUZP pokud není zadáno
    if not invoice_dict.get('tax_date'):
        invoice_dict['tax_date'] = invoice_dict['issue_date']

    # Přidej tvůrce
    invoice_dict['created_by'] = current_user.id
    invoice_dict['status'] = InvoiceStatus.DRAFT

    invoice = Invoice(**invoice_dict)
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    return invoice


@router.get(
    "/next-number/{invoice_type}",
    response_model=dict,
    dependencies=[Depends(require_permissions("invoices", PermissionType.READ))]
)
async def get_next_invoice_number(
    invoice_type: InvoiceType,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí další číslo faktury (preview, neukládá)."""
    year = datetime.utcnow().year
    sequence = get_or_create_sequence(db, invoice_type, year)

    # Preview - neukládáme, jen zobrazíme
    next_num = sequence.last_number + 1
    preview_number = sequence.format_pattern.format(
        prefix=sequence.prefix,
        year=sequence.year,
        number=next_num
    )

    return {"invoice_number": preview_number, "type": invoice_type}


@router.get(
    "/{invoice_id}",
    response_model=InvoicePublic,
    dependencies=[Depends(require_permissions("invoices", PermissionType.READ))]
)
async def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vrátí detail faktury."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.patch("/{invoice_id}", response_model=InvoicePublic, dependencies=[Depends(require_permissions("invoices", PermissionType.WRITE))])
@router.put("/{invoice_id}", response_model=InvoicePublic, dependencies=[Depends(require_permissions("invoices", PermissionType.WRITE))])
async def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aktualizuje fakturu."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    update_data = invoice_data.model_dump(exclude_unset=True)

    # Pokud se mění dodavatel, aktualizuj kopii
    if 'supplier_id' in update_data:
        supplier = db.query(Company).filter(Company.id == update_data['supplier_id']).first()
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
        supplier_data = copy_company_to_invoice(supplier, 'supplier')
        supplier_data['supplier_is_vat_payer'] = supplier.is_vat_payer
        supplier_data['supplier_website'] = supplier.website
        supplier_data['supplier_bank_name'] = supplier.bank_name
        supplier_data['supplier_bank_account'] = supplier.bank_account
        supplier_data['supplier_bank_iban'] = supplier.bank_iban
        supplier_data['supplier_bank_swift'] = supplier.bank_swift
        update_data.update(supplier_data)

    # Pokud se mění odběratel, aktualizuj kopii
    if 'customer_id' in update_data:
        customer = db.query(Company).filter(Company.id == update_data['customer_id']).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        customer_data = copy_company_to_invoice(customer, 'customer')
        update_data.update(customer_data)

    # Pokud se mění položky, přepočítej součty
    if 'items' in update_data:
        update_data['items'] = [
            item.model_dump() if hasattr(item, 'model_dump') else item
            for item in (update_data.get('items') or [])
        ]
        vat_mode = update_data.get('vat_mode', invoice.vat_mode)
        totals = calculate_invoice_totals(update_data['items'], vat_mode)

        rounding = update_data.get('rounding', invoice.rounding) or 0
        totals['total'] = round(totals['total'] + rounding, 2)

        update_data.update(totals)

    # Status changes
    if update_data.get('status') == InvoiceStatus.PAID and not invoice.paid_date:
        update_data['paid_date'] = date.today()
        update_data['paid_amount'] = invoice.total

    if update_data.get('status') == InvoiceStatus.SENT and not invoice.sent_date:
        update_data['sent_date'] = datetime.utcnow()

    for field, value in update_data.items():
        setattr(invoice, field, value)

    db.commit()
    db.refresh(invoice)
    return invoice


@router.delete(
    "/{invoice_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("invoices", PermissionType.WRITE))]
)
async def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Smaže fakturu."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    db.delete(invoice)
    db.commit()
    return None


@router.post(
    "/bulk",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permissions("invoices", PermissionType.WRITE))]
)
async def bulk_delete_invoices(
    ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Hromadné mazání faktur."""
    db.query(Invoice).filter(Invoice.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return None


@router.post(
    "/{invoice_id}/mark-paid",
    response_model=InvoicePublic,
    dependencies=[Depends(require_permissions("invoices", PermissionType.WRITE))]
)
async def mark_invoice_paid(
    invoice_id: int,
    paid_amount: Optional[float] = None,
    paid_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Označí fakturu jako zaplacenou."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice.paid_amount = paid_amount or invoice.total
    invoice.paid_date = paid_date or date.today()

    if invoice.paid_amount >= invoice.total:
        invoice.status = InvoiceStatus.PAID
    else:
        invoice.status = InvoiceStatus.PARTIALLY_PAID

    db.commit()
    db.refresh(invoice)
    return invoice


@router.post(
    "/{invoice_id}/send",
    response_model=InvoicePublic,
    dependencies=[Depends(require_permissions("invoices", PermissionType.WRITE))]
)
async def mark_invoice_sent(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Označí fakturu jako odeslanou."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice.status = InvoiceStatus.SENT
    invoice.sent_date = datetime.utcnow()

    db.commit()
    db.refresh(invoice)
    return invoice


@router.post(
    "/{invoice_id}/cancel",
    response_model=InvoicePublic,
    dependencies=[Depends(require_permissions("invoices", PermissionType.WRITE))]
)
async def cancel_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Stornuje fakturu."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice.status = InvoiceStatus.CANCELLED

    db.commit()
    db.refresh(invoice)
    return invoice
