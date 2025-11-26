from fastapi import Request
from sqlalchemy import inspect, cast, String, Integer
from sqlalchemy.types import Enum as SQLAlchemyEnum
from typing import Type, TypeVar, Any

T = TypeVar("T")


def apply_dynamic_filters(query, model: Type[T], params: dict[str, Any]):
    """
    Dynamicky aplikuje filtry podle query parametrů.

    - Pro ID sloupce (končící na _id nebo 'id') používá přesnou shodu (=)
    - Pro enum sloupce používá přesnou shodu
    - Pro ostatní string sloupce používá ILIKE
    """
    mapper = inspect(model)
    columns = {col.key: col for col in mapper.columns}

    for field, value in params.items():
        if not value or field not in columns:
            continue

        try:
            column_obj = columns[field]
            column = getattr(model, field)
            column_type = column_obj.type

            # Pro ID sloupce - přesná shoda
            if field == 'id' or field.endswith('_id'):
                # Přímé porovnání (SQLAlchemy si poradí s typem)
                query = query.filter(column == value)

            # Pro enum sloupce - přesná shoda
            elif isinstance(column_type, SQLAlchemyEnum):
                query = query.filter(column == value)

            # Pro boolean
            elif str(column_type) == 'BOOLEAN':
                bool_value = value.lower() in ('true', '1', 'yes')
                query = query.filter(column == bool_value)

            # Pro integer sloupce - přesná shoda
            elif isinstance(column_type, Integer):
                query = query.filter(column == int(value))

            # Pro ostatní (string) - ILIKE
            else:
                query = query.filter(cast(column, String).ilike(f"%{value}%"))

        except Exception as e:
            # Loguj chyby pro debugging
            print(f"Filter error for {field}={value}: {e}")
            continue

    return query


def get_filter_params(excluded: set[str] = None):
    """Factory pro filter parametry."""
    excluded = excluded or {"skip", "limit"}  # Odebráno is_active

    def _get_params(request: Request) -> dict[str, Any]:
        return {k: v for k, v in request.query_params.items() if k not in excluded}

    return _get_params
