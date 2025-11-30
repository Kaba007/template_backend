from fastapi import Request
from sqlalchemy import inspect, cast, String, Integer
from sqlalchemy.types import Enum as SQLAlchemyEnum
from typing import Type, TypeVar, Any, List, Union

T = TypeVar("T")


def apply_dynamic_filters(query, model: Type[T], params: dict[str, Any]):
    """
    Dynamicky aplikuje filtry podle query parametrů.

    Podporuje:
    - Přesnou shodu pro ID, enum, boolean, integer
    - ILIKE pro string sloupce
    - IN operátor pro listy hodnot
    - Range filtry (_from, _to suffixes)
    
    Příklady:
    - ?name=test          -> WHERE name ILIKE '%test%'
    - ?status=active      -> WHERE status = 'active'
    - ?id=1               -> WHERE id = 1
    - ?id=1&id=2&id=3     -> WHERE id IN (1, 2, 3)
    - ?status=draft&status=sent  -> WHERE status IN ('draft', 'sent')
    - ?price_from=100     -> WHERE price >= 100
    - ?price_to=500       -> WHERE price <= 500
    """
    mapper = inspect(model)
    columns = {col.key: col for col in mapper.columns}

    for field, value in params.items():
        if not value:
            continue

        # Handle range filters (_from, _to)
        if field.endswith('_from'):
            base_field = field[:-5]  # Remove '_from'
            if base_field in columns:
                try:
                    column = getattr(model, base_field)
                    # Pro list hodnot použij první
                    val = value[0] if isinstance(value, list) else value
                    query = query.filter(column >= val)
                except Exception as e:
                    print(f"Filter error for {field}={value}: {e}")
                continue

        if field.endswith('_to'):
            base_field = field[:-3]  # Remove '_to'
            if base_field in columns:
                try:
                    column = getattr(model, base_field)
                    # Pro list hodnot použij první
                    val = value[0] if isinstance(value, list) else value
                    query = query.filter(column <= val)
                except Exception as e:
                    print(f"Filter error for {field}={value}: {e}")
                continue

        # Standard field filtering
        if field not in columns:
            continue

        try:
            column_obj = columns[field]
            column = getattr(model, field)
            column_type = column_obj.type

            # VALUE JE LIST -> použij IN operátor
            if isinstance(value, list) and len(value) > 0:
                # Pro enum sloupce
                if isinstance(column_type, SQLAlchemyEnum):
                    query = query.filter(column.in_(value))
                
                # Pro integer sloupce
                elif isinstance(column_type, Integer):
                    int_values = [int(v) for v in value if v]
                    if int_values:
                        query = query.filter(column.in_(int_values))
                
                # Pro boolean
                elif str(column_type) == 'BOOLEAN':
                    bool_values = [v.lower() in ('true', '1', 'yes') for v in value]
                    query = query.filter(column.in_(bool_values))
                
                # Pro string - OR kombinace ILIKE
                else:
                    from sqlalchemy import or_
                    conditions = [cast(column, String).ilike(f"%{v}%") for v in value if v]
                    if conditions:
                        query = query.filter(or_(*conditions))

            # VALUE NENÍ LIST -> klasické filtrování
            else:
                # Pro enum sloupce - přesná shoda
                if isinstance(column_type, SQLAlchemyEnum):
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
    """
    Factory pro filter parametry.
    
    Automaticky zpracovává:
    - Single values: ?status=draft
    - Multiple values: ?status=draft&status=sent (vytvoří list)
    - Range filters: ?price_from=100&price_to=500
    """
    excluded = excluded or {"skip", "limit"}

    def _get_params(request: Request) -> dict[str, Union[str, List[str]]]:
        """
        Zpracuje query parametry a seskupí opakující se klíče do listů.
        
        Příklady:
        - ?id=1              -> {"id": "1"}
        - ?id=1&id=2         -> {"id": ["1", "2"]}
        - ?id=1&id=2&id=3    -> {"id": ["1", "2", "3"]}
        - ?status=draft&status=sent -> {"status": ["draft", "sent"]}
        """
        params = {}
        
        for key, value in request.query_params.items():
            if key in excluded:
                continue
                
            # Pokud klíč už existuje, vytvoř list nebo přidej do existujícího
            if key in params:
                if not isinstance(params[key], list):
                    params[key] = [params[key]]
                params[key].append(value)
            else:
                params[key] = value
        
        return params

    return _get_params


def parse_list_param(value: Union[str, List[str]]) -> List[str]:
    """
    Helper pro manuální parsování list parametrů.
    
    Podporuje:
    - ?ids=1,2,3         -> ["1", "2", "3"]
    - ?ids=1&ids=2&ids=3 -> ["1", "2", "3"]
    - ?ids=1             -> ["1"]
    """
    if isinstance(value, list):
        # Už je to list z get_filter_params
        return value
    elif isinstance(value, str):
        # String - zkus rozdělit podle čárky
        if ',' in value:
            return [v.strip() for v in value.split(',') if v.strip()]
        else:
            return [value]
    return []


