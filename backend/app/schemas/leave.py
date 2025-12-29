from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from uuid import UUID


class LeaveBase(BaseModel):
    start_date: date
    end_date: date
    reason: Optional[str] = None


class LeaveCreate(LeaveBase):
    pass


class LeaveUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    reason: Optional[str] = None


class LeaveApprove(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected)$")
    rejection_reason: Optional[str] = None


class UserBasic(BaseModel):
    id: UUID
    full_name: str
    email: str

    class Config:
        from_attributes = True


class LeaveResponse(LeaveBase):
    id: UUID
    user_id: UUID
    status: str
    approved_by_id: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    user: Optional[UserBasic] = None
    approved_by: Optional[UserBasic] = None

    class Config:
        from_attributes = True
