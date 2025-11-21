# init_db.py
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from backend.core.db import SessionLocal, engine
from backend.core.models.auth import User, Role, Module, UserRoleLink, RoleModuleLink, PermissionType, Base
from backend.core.services.auth import get_password_hash
from backend.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

def create_admin_user(db: Session) -> User:
    """
    Vytvoří administrátorského uživatele, pokud neexistuje.

    Returns:
        Admin User objekt
    """
    # Zkontroluj, zda admin uživatel existuje
    admin_user = db.query(User).filter(User.client_id == "admin").first()

    if admin_user:
        logger.info("Admin user already exists")
        return admin_user

    # Vytvoř admin uživatele
    admin_user = User(
        client_id=settings.admin_name,
        client_secret=get_password_hash(settings.admin_password[:72]),
        email=settings.admin_email,
        is_active=True,
        created_at=datetime.now()
    )

    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    logger.info(f"Admin user created: {admin_user.client_id}")
    return admin_user


def create_admin_role(db: Session) -> Role:
    """
    Vytvoří administrátorskou roli, pokud neexistuje.

    Returns:
        Admin Role objekt
    """
    # Zkontroluj, zda admin role existuje
    admin_role = db.query(Role).filter(Role.name == "admin").first()

    if admin_role:
        logger.info("Admin role already exists")
        return admin_role

    # Vytvoř admin roli
    admin_role = Role(
        name="admin",
        description="Administrator role with full permissions",
        is_active=True,
        created_at=datetime.utcnow()
    )

    db.add(admin_role)
    db.commit()
    db.refresh(admin_role)

    logger.info(f"Admin role created: {admin_role.name}")
    return admin_role


def create_base_modules(db: Session) -> list[Module]:
    """
    Vytvoří základní moduly pro správu systému.

    Returns:
        Seznam vytvořených modulů
    """
    base_modules = [
        {"name": "users", "description": "User management module"},
        {"name": "roles", "description": "Role management module"},
        {"name": "modules", "description": "Module management module"},
        {"name": "email", "description": "Emial management module"},
    ]

    created_modules = []

    for module_data in base_modules:
        # Zkontroluj, zda modul existuje
        existing_module = db.query(Module).filter(Module.name == module_data["name"]).first()

        if existing_module:
            logger.info(f"Module '{module_data['name']}' already exists")
            created_modules.append(existing_module)
            continue

        # Vytvoř modul
        module = Module(
            name=module_data["name"],
            description=module_data["description"],
            is_active=True,
            created_at=datetime.utcnow()
        )

        db.add(module)
        db.commit()
        db.refresh(module)

        logger.info(f"Module created: {module.name}")
        created_modules.append(module)

    return created_modules


def assign_admin_permissions(db: Session, admin_role: Role, modules: list[Module]) -> None:
    """
    Přiřadí admin roli ADMIN oprávnění na všechny moduly.

    Args:
        admin_role: Admin role objekt
        modules: Seznam modulů
    """
    for module in modules:
        # Přiřaď všechna oprávnění (READ, WRITE, ADMIN)
        for permission in [PermissionType.READ, PermissionType.WRITE, PermissionType.ADMIN]:
            # Zkontroluj, zda vazba existuje
            existing_link = db.query(RoleModuleLink).filter(
                RoleModuleLink.role_id == admin_role.id,
                RoleModuleLink.module_id == module.id,
                RoleModuleLink.permission == permission
            ).first()

            if existing_link:
                logger.info(f"Admin role already has {permission.value} permission on {module.name}")
                continue

            # Vytvoř vazbu
            role_module_link = RoleModuleLink(
                role_id=admin_role.id,
                module_id=module.id,
                permission=permission,
                created_at=datetime.utcnow()
            )

            db.add(role_module_link)
            logger.info(f"Assigned {permission.value} permission on {module.name} to admin role")

    db.commit()


def assign_admin_role_to_user(db: Session, admin_user: User, admin_role: Role) -> None:
    """
    Přiřadí admin roli admin uživateli.

    Args:
        admin_user: Admin user objekt
        admin_role: Admin role objekt
    """
    # Zkontroluj, zda vazba existuje
    existing_link = db.query(UserRoleLink).filter(
        UserRoleLink.user_id == admin_user.id,
        UserRoleLink.role_id == admin_role.id
    ).first()

    if existing_link:
        logger.info("Admin user already has admin role")
        return

    # Vytvoř vazbu
    user_role_link = UserRoleLink(
        user_id=admin_user.id,
        role_id=admin_role.id,
        created_at=datetime.utcnow()
    )

    db.add(user_role_link)
    db.commit()

    logger.info("Admin role assigned to admin user")


def init_database() -> None:
    """
    Inicializuje databázi a vytvoří základní admin uživatele.
    Tato funkce by měla být volána při startu aplikace.
    """
    logger.info("Starting database initialization...")

    # Vytvoř tabulky
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")

    # Vytvoř session
    db = SessionLocal()

    try:
        # 1. Vytvoř základní moduly
        logger.info("Creating base modules...")
        modules = create_base_modules(db)

        # 2. Vytvoř admin roli
        logger.info("Creating admin role...")
        admin_role = create_admin_role(db)

        # 3. Přiřaď admin roli oprávnění na moduly
        logger.info("Assigning permissions to admin role...")
        assign_admin_permissions(db, admin_role, modules)

        # 4. Vytvoř admin uživatele
        logger.info("Creating admin user...")
        admin_user = create_admin_user(db)

        # 5. Přiřaď admin roli admin uživateli
        logger.info("Assigning admin role to admin user...")
        assign_admin_role_to_user(db, admin_user, admin_role)

        logger.info("=" * 60)
        logger.info("Database initialization completed successfully!")
        logger.info("=" * 60)
        logger.info("Admin credentials:")
        logger.info("  client_id: admin")
        logger.info("  client_secret: admin123")
        logger.info("  ⚠️  CHANGE THE PASSWORD IN PRODUCTION! ⚠️")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"Error during database initialization: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    # Můžeš spustit přímo: python init_db.py
    init_database()
