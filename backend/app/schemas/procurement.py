from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


# User schema for nested responses
class UserInProcurement(BaseModel):
    id: UUID
    full_name: str
    email: str

    class Config:
        from_attributes = True


class ProcurementItemBase(BaseModel):
    name: str
    link: Optional[str] = None
    vendor: str
    quantity: int
    priority: str = "medium"  # low, medium, high, urgent
    notes: Optional[str] = None


class ProcurementItemCreate(ProcurementItemBase):
    pass


class ProcurementItemUpdate(BaseModel):
    name: Optional[str] = None
    link: Optional[str] = None
    vendor: Optional[str] = None
    quantity: Optional[int] = None
    priority: Optional[str] = None
    notes: Optional[str] = None


class ProcurementItemResponse(ProcurementItemBase):
    id: UUID
    status: str
    is_non_gem: bool
    non_gem_completed_at: Optional[datetime] = None
    requested_by: UUID
    received_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    requester: Optional[UserInProcurement] = None

    class Config:
        from_attributes = True
