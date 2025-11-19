# admin.py
from sqladmin import Admin
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from sqlalchemy.orm import Session

from backend.core.models.auth import User
from backend.core.db import SessionLocal
from backend.core.services.auth import verify_token
from backend.core.config import get_settings

settings= get_settings()


class AdminAuthBackend(AuthenticationBackend):
    """
    Vlastní authentication backend pro SQLAdmin.
    Ověřuje oproti JWT tokenu a vyžaduje admin roli.
    """

    async def logout(self, request: Request) -> bool:
        """
        Zpracuje logout request.
        """
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        """
        Ověří, zda je uživatel autentizován.
        Volá se při každém requestu do admin panelu.
        """
        token = request.session.get("access_token")

        if not token:
            return False

        # Ověř JWT token
        payload = verify_token(token)
        if not payload:
            return False

        client_id = payload.get("sub")
        if not client_id:
            return False

        # Ověř, že uživatel stále existuje a má admin roli
        db: Session = SessionLocal()
        try:
            user = db.query(User).filter(User.client_id == client_id).first()
            if not user or not user.is_active:
                return False

            # Zkontroluj admin roli
            has_admin_role = False
            for user_role_link in user.user_role_links:
                role = user_role_link.role
                if role.name == "admin" and role.is_active:
                    has_admin_role = True
                    break

            return has_admin_role

        finally:
            db.close()

def setup_admin(app) -> Admin:
    """
    Nastaví SQLAdmin pro FastAPI aplikaci.

    Args:
        app: FastAPI aplikace

    Returns:
        Admin instance
    """
    from backend.core.db import engine
    from backend.apps.admin.models import (
        UserAdmin,
        RoleAdmin,
        ModuleAdmin,
        UserRoleLinkAdmin,
        RoleModuleLinkAdmin,
        ApiLogAdmin
    )
    # Vytvoř authentication backend
    authentication_backend = AdminAuthBackend(secret_key=settings.secret_key)

    # Vytvoř admin
    admin = Admin(
        app=app,
        engine=engine,
        authentication_backend=authentication_backend,
        title="Auth API Admin",
        base_url="/admin"
    )

    # Registruj ModelViews
    admin.add_view(UserAdmin)
    admin.add_view(RoleAdmin)
    admin.add_view(ModuleAdmin)
    admin.add_view(UserRoleLinkAdmin)
    admin.add_view(RoleModuleLinkAdmin)
    admin.add_view(ApiLogAdmin)

    return admin
