from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal


class DailyLogBase(BaseModel):
    activity: str
    hours_spent: Optional[Decimal] = None
    project_id: Optional[UUID] = None


class DailyLogCreate(BaseModel):
    date: date
    activity: str
    hours_spent: Optional[Decimal] = None
    project_id: Optional[UUID] = None


class DailyLogUpdate(BaseModel):
    activity: Optional[str] = None
    hours_spent: Optional[Decimal] = None
    project_id: Optional[UUID] = None


class DailyLogResponse(DailyLogBase):
    id: UUID
    user_id: UUID
    date: date
    created_at: datetime
    updated_at: datetime
    user: Optional[dict] = None  # Will include user details
    project: Optional[dict] = None  # Will include project details

    class Config:
        from_attributes = True
