from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal


class TimesheetBase(BaseModel):
    notes: Optional[str] = None


class TimesheetCreate(TimesheetBase):
    user_id: UUID
    date: date
    auto_hours: Optional[Decimal] = Decimal("0.00")
    manual_hours: Optional[Decimal] = Decimal("0.00")


class TimesheetUpdate(BaseModel):
    manual_hours: Optional[Decimal] = None
    notes: Optional[str] = None


class TimesheetApprove(BaseModel):
    pass


class TimesheetReject(BaseModel):
    notes: Optional[str] = None


class TimesheetResponse(TimesheetBase):
    id: UUID
    user_id: UUID
    date: date
    auto_hours: Decimal
    manual_hours: Decimal
    total_hours: Optional[Decimal] = None
    status: str
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
