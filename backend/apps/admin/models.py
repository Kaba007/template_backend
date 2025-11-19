from sqladmin import ModelView
from starlette.requests import Request
from backend.core.models.auth import User, Role, Module, UserRoleLink, RoleModuleLink, ApiLog
from backend.core.config import get_settings

settings= get_settings()


# ModelView pro každý model
class UserAdmin(ModelView, model=User):
    """Admin view pro User model."""

    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-user"
    # Sloupce v seznamu
    column_list = [
        User.id,
        User.client_id,
        User.email,
        User.is_active,
        User.created_at
    ]

    # Sloupce pro vyhledávání
    column_searchable_list = [User.client_id, User.email]
    # Sloupce pro třídění
    column_sortable_list = [User.id, User.client_id, User.created_at]

    # Sloupce ve formuláři
    form_columns = [
        User.client_id,
        User.client_secret,
        User.email,
        User.is_active
    ]

    # Detaily sloupců
    column_details_list = [
        User.id,
        User.client_id,
        User.email,
        User.is_active,
        User.created_at,
        User.updated_at
    ]

    # Defaultní řazení
    column_default_sort = [(User.created_at, True)]

    # Počet záznamů na stránku
    page_size = 50
    page_size_options = [25, 50, 100, 200]


    async def on_model_change(self, data: dict, model: User, is_created: bool, request: Request) -> None:
        """Hook volaný před uložením modelu."""
        if "client_secret" in data and data["client_secret"]:
            from backend.core.services.auth import get_password_hash
            data["client_secret"] = get_password_hash(data["client_secret"])


class RoleAdmin(ModelView, model=Role):
    """Admin view pro Role model."""

    name = "Role"
    name_plural = "Roles"
    icon = "fa-solid fa-user-shield"

    column_list = [
        Role.id,
        Role.name,
        Role.description,
        Role.is_active,
        Role.created_at
    ]

    column_searchable_list = [Role.name, Role.description]


    column_sortable_list = [Role.id, Role.name, Role.created_at]

    form_columns = [
        Role.name,
        Role.description,
        Role.is_active
    ]

    column_details_list = [
        Role.id,
        Role.name,
        Role.description,
        Role.is_active,
        Role.created_at,
        Role.updated_at
    ]

    column_default_sort = [(Role.name, False)]
    page_size = 50


class ModuleAdmin(ModelView, model=Module):
    """Admin view pro Module model."""

    name = "Module"
    name_plural = "Modules"
    icon = "fa-solid fa-cube"

    column_list = [
        Module.id,
        Module.name,
        Module.description,
        Module.is_active,
        Module.created_at
    ]

    column_searchable_list = [Module.name, Module.description]


    column_sortable_list = [Module.id, Module.name, Module.created_at]

    form_columns = [
        Module.name,
        Module.description,
        Module.is_active
    ]

    column_details_list = [
        Module.id,
        Module.name,
        Module.description,
        Module.is_active,
        Module.created_at,
        Module.updated_at
    ]

    column_default_sort = [(Module.name, False)]
    page_size = 50


class UserRoleLinkAdmin(ModelView, model=UserRoleLink):
    """Admin view pro UserRoleLink model."""

    name = "User-Role Link"
    name_plural = "User-Role Links"
    icon = "fa-solid fa-link"

    column_list = [
        UserRoleLink.id,
        UserRoleLink.user,
        UserRoleLink.role,
        UserRoleLink.created_at
    ]
    column_details_list = [
        UserRoleLink.user, UserRoleLink.role, UserRoleLink.created_at
    ]
    column_searchable_list = [UserRoleLink.user, UserRoleLink.role]

    column_sortable_list = [UserRoleLink.id, UserRoleLink.created_at]

    column_default_sort = [(UserRoleLink.created_at, True)]
    page_size = 50
    form_ajax_refs = {
        "user": {
            "fields": ("client_id", "email"),  # Hledá v těchto sloupcích
            "order_by": "client_id",           # Řazení
            "page_size": 10,                   # Kolik výsledků najednou
        },
        "role": {
            "fields": ("name",),
            "order_by": "name",
            "page_size": 10,
        }
    }


class RoleModuleLinkAdmin(ModelView, model=RoleModuleLink):
    """Admin view pro RoleModuleLink model."""

    name = "Role-Module Link"
    name_plural = "Role-Module Links"
    icon = "fa-solid fa-link"

    column_list = [
        RoleModuleLink.id,
        RoleModuleLink.role,
        RoleModuleLink.module,
        RoleModuleLink.permission,
        RoleModuleLink.created_at
    ]

    column_sortable_list = [RoleModuleLink.id, RoleModuleLink.created_at]

    column_details_list = [
        RoleModuleLink.role, RoleModuleLink.module,
        RoleModuleLink.permission, RoleModuleLink.created_at

    ]
    form_ajax_refs = {
        "role": {
            "fields": ("name", "description"),
            "order_by": "name",
            "page_size": 10,
        },
        "module": {
            "fields": ("name", "description"),
            "order_by": "name",
            "page_size": 10,
        }
    }

    column_default_sort = [(RoleModuleLink.created_at, True)]
    page_size = 50


class ApiLogAdmin(ModelView, model=ApiLog):
    """Admin view pro ApiLog model."""

    name = "API Log"
    name_plural = "API Logs"
    icon = "fa-solid fa-list"

    # Pouze čtení
    can_create = False
    can_edit = False
    can_delete = True

    column_list = [
        ApiLog.id,
        ApiLog.method,
        ApiLog.path,
        ApiLog.status_code,
        ApiLog.ip_address,
        ApiLog.user_id,
        ApiLog.process_time,
        ApiLog.created_at
    ]

    column_searchable_list = [ApiLog.path, ApiLog.user_id, ApiLog.ip_address]

    column_sortable_list = [
        ApiLog.id,
        ApiLog.created_at,
        ApiLog.status_code,
        ApiLog.process_time
    ]

    column_details_list = [
        ApiLog.id,
        ApiLog.request_id,
        ApiLog.ip_address,
        ApiLog.path,
        ApiLog.method,
        ApiLog.status_code,
        ApiLog.process_time,
        ApiLog.user_id,
        ApiLog.query_params,
        ApiLog.path_params,
        ApiLog.request_body,
        ApiLog.response_body,
        ApiLog.created_at
    ]

    column_default_sort = [(ApiLog.created_at, True)]
    page_size = 50
    page_size_options = [25, 50, 100, 200]
