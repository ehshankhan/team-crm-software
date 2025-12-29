from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, date
from uuid import UUID


# Role schemas
class RoleBase(BaseModel):
    name: str
    permissions: Optional[Dict[str, Any]] = {}


class RoleCreate(RoleBase):
    pass


class RoleResponse(RoleBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# User schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    password: str
    role_id: UUID


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    role_id: Optional[UUID] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: UUID
    role_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    role: Optional[RoleResponse] = None
    project_count: Optional[int] = 0
    project_names: Optional[List[str]] = []
    current_leave_start: Optional[date] = None
    current_leave_end: Optional[date] = None

    class Config:
        from_attributes = True


# Auth schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str
