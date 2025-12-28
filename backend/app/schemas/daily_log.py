from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal


# Nested schemas for user and project
class UserInLog(BaseModel):
    id: UUID
    full_name: str
    email: str

    class Config:
        from_attributes = True


class ProjectInLog(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


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
    user: Optional[UserInLog] = None
    project: Optional[ProjectInLog] = None

    class Config:
        from_attributes = True
