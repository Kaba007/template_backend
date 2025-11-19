from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from backend.core.models.auth import PermissionType


# Module Schemas
class ModuleBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_active: bool = True


class ModuleCreate(ModuleBase):
    pass


class ModuleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None


class ModulePublic(ModuleBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# User Schemas
class UserBase(BaseModel):
    client_id: str = Field(min_length=1, max_length=100)
    is_active: bool = True
    email: Optional[str] = Field(None, max_length=255)


class UserCreate(UserBase):
    client_secret: str = Field(min_length=1)


class UserUpdate(BaseModel):
    client_id: Optional[str] = Field(None, min_length=1, max_length=100)
    client_secret: Optional[str] = Field(None, min_length=1)
    email: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None


class UserPublic(UserBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserWithRoles(UserPublic):
    roles: List["RolePublic"] = []

    model_config = ConfigDict(from_attributes=True)


# Role Schemas
class RoleBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_active: bool = True


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None


class RolePublic(RoleBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RoleWithPermissions(RolePublic):
    modules: List[ModulePublic] = []

    model_config = ConfigDict(from_attributes=True)


# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    client_id: Optional[str] = None


class LoginRequest(BaseModel):
    client_id: str
    client_secret: str


class LoginResponse(BaseModel):
    message: str
    user_id: str
    access_token: str
    expires_in: int


# Permission Schemas
class UserPermission(BaseModel):
    module_name: str
    permissions: List[PermissionType]


class UserRoleAssignment(BaseModel):
    role_id: int


class RoleModuleAssignment(BaseModel):
    module_id: int
    permission: PermissionType


# API Log Schemas
class ApiLogBase(BaseModel):
    request_id: Optional[str] = None
    ip_address: str
    path: str
    method: str
    status_code: int
    request_body: Optional[dict] = None
    response_body: Optional[dict] = None
    query_params: Optional[dict] = None
    path_params: Optional[dict] = None
    process_time: float
    user_id: Optional[str] = None


class ApiLogCreate(ApiLogBase):
    pass


class ApiLogPublic(ApiLogBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Association Schemas
class UserRoleLinkPublic(BaseModel):
    id: int
    user_id: int
    role_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RoleModuleLinkPublic(BaseModel):
    id: int
    role_id: int
    module_id: int
    permission: PermissionType
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
