from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


# Enums
class PermissionType(str, PyEnum):
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"


# Association Tables
class UserRoleLink(Base):
    __tablename__ = "user_roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint('user_id', 'role_id', name='unique_user_role'),
        Index('idx_user_role', 'user_id', 'role_id'),
    )

    # Relationships
    user = relationship("User", back_populates="user_role_links", foreign_keys=[user_id])
    role = relationship("Role", back_populates="user_role_links", foreign_keys=[role_id])

    def __repr__(self):
        return f"<UserRoleLink(user_id={self.user_id}, role_id={self.role_id})>"

    def __str__(self):
        return f"User {self.user_id} -> Role {self.role_id}"


class RoleModuleLink(Base):
    __tablename__ = "role_modules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)
    module_id = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True)
    permission = Column(Enum(PermissionType), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint('role_id', 'module_id', 'permission', name='unique_role_module_permission'),
        Index('idx_role_module_permission', 'role_id', 'module_id', 'permission'),
    )

    # Relationships
    role = relationship("Role", back_populates="role_module_links", foreign_keys=[role_id])
    module = relationship("Module", back_populates="role_module_links", foreign_keys=[module_id])

    def __repr__(self):
        return f"<RoleModuleLink(role_id={self.role_id}, module_id={self.module_id}, permission={self.permission})>"

    def __str__(self):
        return f"Role {self.role_id} -> Module {self.module_id} ({self.permission.value})"


# Core Models
class Module(Base):
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(500))
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    roles = relationship(
        "Role",
        secondary="role_modules",
        back_populates="modules",
        viewonly=True
    )
    role_module_links = relationship(
        "RoleModuleLink",
        back_populates="module",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Module(id={self.id}, name='{self.name}', is_active={self.is_active})>"

    def __str__(self):
        return f"{self.display_name} - {self.description}"

    @property
    def display_name(self):
        status = "✅" if self.is_active else "❌"
        return f"{status} {self.name}"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(String(100), unique=True, nullable=False, index=True)
    client_secret = Column(String(255), nullable=False)  # Pro hashed hodnoty
    email = Column(String(255),unique=True,index=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    __table_args__ = (
        Index('idx_user_active_created', 'is_active', 'created_at'),
    )

    # Relationships
    roles = relationship(
        "Role",
        secondary="user_roles",
        back_populates="users",
        viewonly=True
    )
    user_role_links = relationship(
        "UserRoleLink",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<User(id={self.id}, client_id='{self.client_id}', is_active={self.is_active})>"

    def __str__(self):
        return f"{self.display_name} - {self.email if self.email else 'No Email'}"

    @property
    def display_name(self):
        status = "✅" if self.is_active else "❌"
        return f"{status} {self.client_id}"

    @property
    def roles_count(self):
        return len(self.roles) if self.roles else 0


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(500))
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index('idx_role_active_created', 'is_active', 'created_at'),
    )

    # Relationships
    users = relationship(
        "User",
        secondary="user_roles",
        back_populates="roles",
        viewonly=True
    )
    modules = relationship(
        "Module",
        secondary="role_modules",
        back_populates="roles",
        viewonly=True
    )
    user_role_links = relationship(
        "UserRoleLink",
        back_populates="role",
        cascade="all, delete-orphan"
    )
    role_module_links = relationship(
        "RoleModuleLink",
        back_populates="role",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Role(id={self.id}, name='{self.name}', is_active={self.is_active})>"

    def __str__(self):
        return f"{self.display_name} - {self.description}"

    @property
    def display_name(self):
        status = "✅" if self.is_active else "❌"
        return f"{status} {self.name}"

    @property
    def users_count(self):
        return len(self.users) if self.users else 0

    @property
    def modules_count(self):
        return len(self.modules) if self.modules else 0


# API Log model
class ApiLog(Base):
    __tablename__ = 'api_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(255), index=True)
    ip_address = Column(String(45), nullable=False, index=True)  # IPv6 má max 45 znaků
    path = Column(String(500), nullable=False, index=True)
    method = Column(String(10), nullable=False, index=True)
    status_code = Column(Integer, nullable=False, index=True)
    request_body = Column(JSON)
    response_body = Column(JSON)
    query_params = Column(JSON)
    path_params = Column(JSON)
    process_time = Column(Float, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    user_id = Column(String(100), index=True)

    __table_args__ = (
        Index('idx_api_log_created_status', 'created_at', 'status_code'),
        Index('idx_api_log_user_created', 'user_id', 'created_at'),
        Index('idx_api_log_path_method', 'path', 'method'),
    )

    def __repr__(self):
        return f"<ApiLog(id={self.id}, method='{self.method}', path='{self.path}', status={self.status_code})>"

    def __str__(self):
        return f"{self.method} {self.path} - {self.status_code}"

    @property
    def display_name(self):
        status_icon = "✅" if self.status_code < 400 else "❌"
        return f"{status_icon} {self.method} {self.path}"

# Na konec souboru models/auth.py přidej:

class LeadStatus(str, PyEnum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    CONVERTED = "converted"
    PROPOSAL = "proposal"
    WON = "won"
    LOST = "lost"


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(100), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(String(2000))
    status = Column(Enum(LeadStatus), default=LeadStatus.NEW, nullable=False, index=True)
    value = Column(Float, default=0.0)
    email = Column(String(255), index=True)
    phone = Column(String(50))
    company = Column(String(255))
    source = Column(String(100))  # odkud lead přišel (web, telefon, email, atd.)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    converted_at = Column(DateTime, nullable=True)  # kdy byl konvertován na deal

    __table_args__ = (
        Index('idx_lead_user_id_status', 'user_id', 'status'),
        Index('idx_lead_status_created', 'status', 'created_at'),
    )

    # Relationship
    user = relationship("User", backref="leads", foreign_keys=[user_id])

    def __repr__(self):
        return f"<Lead(id={self.id}, title='{self.title}', status={self.status}, client_id='{self.client_id}')>"

    def __str__(self):
        return f"{self.display_name} - {self.title}"

    @property
    def display_name(self):
        status_icon = {
            LeadStatus.NEW: "🆕",
            LeadStatus.CONTACTED: "📞",
            LeadStatus.QUALIFIED: "✅",
            LeadStatus.CONVERTED: "💰",
            LeadStatus.LOST: "❌"
        }.get(self.status, "❓")
        return f"{status_icon} {self.title}"
