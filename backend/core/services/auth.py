from datetime import datetime, timedelta
from typing import Optional, List,Dict, Set
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHash
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import uuid
from backend.core.config import get_settings
from backend.core.models.auth import User, PermissionType, Module, RoleModuleLink
from backend.core.db import get_db_session, get_db

settings = get_settings()

# Password hashing s Argon2
# Argon2 je moderní standard doporučený OWASP, nemá limit 72 bytů jako bcrypt
ph = PasswordHasher()

# Security
security = HTTPBearer(auto_error=False)


# Password utilities
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Ověří heslo proti hashi.

    Args:
        plain_password: Heslo v plain textu
        hashed_password: Argon2 hash hesla

    Returns:
        True pokud heslo odpovídá, jinak False
    """
    try:
        ph.verify(hashed_password.strip(), plain_password.strip())
        return True
    except (VerifyMismatchError, VerificationError, InvalidHash):
        return False


def get_password_hash(password: str) -> str:
    """
    Vytvoří Argon2 hash z hesla.

    Args:
        password: Heslo k zahashování

    Returns:
        Argon2 hash hesla
    """
    return ph.hash(password.strip())

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Ověří heslo proti hashi.

    Args:
        plain_password: Heslo v plain textu
        hashed_password: Argon2 hash hesla

    Returns:
        True pokud heslo odpovídá, jinak False
    """
    try:
        ph.verify(hashed_password.strip(), plain_password.strip())
        return True
    except (VerifyMismatchError, VerificationError, InvalidHash):
        return False
# JWT Token utilities
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Vytvoří JWT access token."""
    to_encode = data.copy()
    now = datetime.utcnow()

    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.access_token_expire_minutes)

    to_encode.update({
        "exp": expire,
        "iat": now,
        "uuid": uuid.uuid4().hex
    })

    logger.info(f"Creating token with exp: {expire} (UTC)")

    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """
    Ověří a dekóduje JWT token.

    Args:
        token: JWT token k ověření

    Returns:
        Dekódovaný payload nebo None pokud je token neplatný
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def invalidate_token(token: str, db: Session) -> bool:
    """
    Invaliduje token (přidá do blacklistu).
    Pro production použij Redis nebo podobnou in-memory databázi.

    Args:
        token: Token k invalidaci
        db: Database session

    Returns:
        True pokud byl token úspěšně invalidován
    """
    # TODO: Implementuj blacklist v DB nebo Redis
    # Například:
    # from models import TokenBlacklist
    # blacklist_entry = TokenBlacklist(token=token, blacklisted_at=datetime.utcnow())
    # db.add(blacklist_entry)
    # db.commit()
    return True


# FastAPI Dependencies
import logging
logger = logging.getLogger(__name__)

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Získá aktuálního uživatele z JWT tokenu.
    Podporuje jak Authorization header, tak session cookie.

    Raises:
        HTTPException: Pokud token není validní nebo uživatel neexistuje
    """

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = None

    # Zkus získat token z Authorization header
    if credentials:
        token = credentials.credentials
    # Zkus získat token ze session cookie
    elif hasattr(request, "session") and "access_token" in request.session:
        token = request.session.get("access_token")

    if not token:
        raise credentials_exception

    # Ověř token
    payload = verify_token(token)
    if payload is None:
        raise credentials_exception

    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception

    # Načti uživatele z DB
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Získá aktivního uživatele.

    Raises:
        HTTPException: Pokud uživatel není aktivní
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


# Permission Dependencies
class PermissionChecker:
    """
    Dependency pro kontrolu oprávnění uživatele.

    Použití:
        @app.get("/items", dependencies=[Depends(PermissionChecker("items", PermissionType.READ))])
    """

    def __init__(self, module_name: str, required_permission: PermissionType):
        self.module_name = module_name
        self.required_permission = required_permission

    async def __call__(
        self,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        """
        Zkontroluje, zda má uživatel požadované oprávnění.

        Raises:
            HTTPException: Pokud uživatel nemá požadované oprávnění
        """


        # Získej modul
        module = db.query(Module).filter(Module.name == self.module_name).first()
        if not module or not module.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module '{self.module_name}' not found"
            )

        # Zkontroluj oprávnění přes role uživatele
        has_permission = False
        for user_role_link in current_user.user_role_links:
            role = user_role_link.role
            if not role.is_active:
                continue

            # Zkontroluj, zda role má přístup k modulu s požadovaným oprávněním
            for role_module_link in role.role_module_links:
                if (role_module_link.module_id == module.id and
                    role_module_link.permission == self.required_permission):
                    has_permission = True
                    break

            if has_permission:
                break

        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Not enough permissions. Required: {self.required_permission.value} on {self.module_name}"
            )

        return current_user


def get_user_permissions(user: User, db: Session) -> Dict[str, List[str]]:
    """
    Vrátí všechna oprávnění uživatele seskupená podle modulů.

    Args:
        user: User objekt
        db: Database session

    Returns:
        Dictionary s permissions v požadovaném formátu
    """
    # Dictionary pro seskupení oprávnění podle modulů
    # Použijeme Set pro automatické odstranění duplicit
    module_permissions: Dict[str, Set[str]] = {}

    # Procházíme všechny role uživatele
    for user_role_link in user.user_role_links:
        role = user_role_link.role

        # Přeskočíme neaktivní role
        if not role.is_active:
            continue

        # Procházíme všechny moduly přiřazené k roli
        for role_module_link in role.role_module_links:
            module = role_module_link.module

            # Přeskočíme neaktivní moduly
            if not module.is_active:
                continue

            # Pokud modul ještě není v dictionary, vytvoříme pro něj Set
            if module.name not in module_permissions:
                module_permissions[module.name] = set()

            # Přidáme oprávnění do Setu (automaticky se vyřeší duplicity)
            module_permissions[module.name].add(role_module_link.permission.value)

    # Převedeme na požadovaný formát
    permissions_list = [
        {
            "module_name": module_name,
            "permissions": sorted(list(perms))  # Seřadíme pro konzistenci
        }
        for module_name, perms in sorted(module_permissions.items())  # Seřadíme moduly
    ]

    return permissions_list

def get_user_info_with_permissions(user: User, db: Session) -> dict:
    """
    Vrátí kompletní informace o uživateli včetně oprávnění.

    Args:
        user: User objekt
        db: Database session

    Returns:
        Dictionary s kompletními informacemi o uživateli
    """
    return {
        "valid": True,
        "user_id": user.id,
        "client_id": user.client_id,
        "is_active": user.is_active,
        "permissions": get_user_permissions(user, db)
    }

def require_permissions(module_name: str, permission: PermissionType):
    """
    Helper funkce pro vytvoření PermissionChecker dependency.

    Použití:
        @app.get("/items", dependencies=[Depends(require_permissions("items", PermissionType.READ))])
    """
    return PermissionChecker(module_name, permission)


# Login endpoint helper
async def authenticate_user(email: str, client_secret: str, db: Session) -> Optional[User]:
    """
    Ověří uživatele podle client_id a client_secret.

    Args:
        client_id: Client ID uživatele
        client_secret: Client secret (plain text)
        db: Database session

    Returns:
        User objekt pokud jsou credentials validní, jinak None
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(client_secret, user.client_secret):
        return None
    if not user.is_active:
        return None
    return user


# Session middleware helper
def set_session_token(request: Request, token: str):
    """
    Nastaví JWT token do session.

    Args:
        request: FastAPI request objekt
        token: JWT token
    """
    request.session["access_token"] = token


def clear_session_token(request: Request):
    """
    Vymaže JWT token ze session.

    Args:
        request: FastAPI request objekt
    """
    if "access_token" in request.session:
        del request.session["access_token"]


if __name__ == "__main__":
    payload = verify_token('eyJhY2Nlc3NfdG9rZW4iOiAiZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnpkV0lpT2lKaFpHMXBiaUlzSW1WNGNDSTZNVGMyTXpZek5qZzVOQ3dpYVdGMElqb3hOall6TlRVME1EazBMQ0oxZFdsa0lqb2laV1kzWmpRek4yRmpZVEJtTkRNMU5EZ3lPVFZrTTJKaU9EbGpOemMyTmpraWZRLjFkUFVzbzE5eUJ5QTRpRlFWVHBzWXpWVG5wMTJGS1VlWGg3ZzJCdUtCMEUifQ==.aR2mHg.uW1GWwWvy4ruzigU4jDHc0cQg3Y')
    print(payload)
