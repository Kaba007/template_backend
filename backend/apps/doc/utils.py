from sqlalchemy.orm import Session
from sqlalchemy.ext.declarative import DeclarativeMeta
from backend.core.models.base import Base
from typing import Dict, Any, Optional

def get_all_models() -> dict[str, DeclarativeMeta]:
    """
    Získá všechny registrované SQLAlchemy modely

    Returns:
        dict: {'table_name': ModelClass, ...}
    """
    models = {}
    for mapper in Base.registry.mappers:
        model = mapper.class_
        # Použij název tabulky jako klíč
        table_name = model.__tablename__
        models[table_name] = model

    return models


def get_model_by_tablename(table_name: str) -> DeclarativeMeta | None:
    """
    Získá model podle názvu tabulky

    Args:
        table_name: Název tabulky (např. 'invoices', 'deals', 'leads')

    Returns:
        Model class nebo None pokud neexistuje
    """
    models = get_all_models()
    return models.get(table_name)


def get_allowed_entity_types() -> list[str]:
    """
    Vrátí seznam všech povolených entity_type (názvů tabulek)
    Užitečné pro validaci na FE nebo v API
    """
    return list(get_all_models().keys())


def verify_entity_exists(db: Session, entity_type: str, entity_id: int) -> bool:
    """Ověří existenci záznamu v libovolné tabulce"""
    model = get_all_models().get(entity_type)
    if not model:
        return False
    return db.query(model).filter(model.id == entity_id).first() is not None


def get_entity_info(db: Session, entity_type: str, entity_id: int) -> Optional[Dict[str, Any]]:
    """
    Získá informace o entitě podle typu a ID
    Vrací slovník s relevantnými informacemi o entitě
    """
    from backend.core.models.invocie import Invoice
    from backend.core.models.deal import Deal
    from backend.core.models.lead import Lead
    from backend.core.models.company import Company
    # Přidejte další entity podle potřeby

    entity_type_lower = entity_type.lower()

    try:

        # INVOICE
        if entity_type_lower == "invoices":
            invoice = db.query(Invoice).filter(Invoice.id == entity_id).first()
            if invoice:
                return {
                    "id": invoice.id,
                    "name": invoice.invoice_number if hasattr(invoice, 'invoice_number') else None,
                    "dir_name":"Faktury"
                }

        # DEAL
        elif entity_type_lower == "deals":
            deal = db.query(Deal).filter(Deal.id == entity_id).first()
            if deal:
                return {
                    "id": deal.id,
                    "name": deal.title if hasattr(deal, 'title') else None,
                    "dir_name":"Objednávky"

                }

        # LEAD
        elif entity_type_lower == "leads":
            lead = db.query(Lead).filter(Lead.id == entity_id).first()
            if lead:
                return {
                    "id": lead.id,
                    "name": lead.title if hasattr(lead, 'title') else None,
                    "dir_name":"Příležitosti"

                }
        #Copany
        elif entity_type_lower == "companies":
            company = db.query(Company).filter(Company.id == entity_id).first()
            if company:
                return {
                    "id": company.id,
                    "name": company.name if hasattr(company, 'name') else None,
                    "dir_name":"Firmy"

                }
        # Pokud entita nebyla nalezena
        return None

    except Exception as e:
        print(f"Error getting entity info for {entity_type}/{entity_id}: {str(e)}")
        return None


if __name__  == '__main__':
    print(get_allowed_entity_types())
