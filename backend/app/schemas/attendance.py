from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal


class AttendanceBase(BaseModel):
    notes: Optional[str] = None


class CheckInRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = None


class CheckOutRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = None
    notes: Optional[str] = None


class AttendanceCreate(AttendanceBase):
    user_id: UUID
    date: date
    check_in: Optional[datetime] = None
    check_in_latitude: Optional[Decimal] = None
    check_in_longitude: Optional[Decimal] = None
    check_in_address: Optional[str] = None


class AttendanceUpdate(BaseModel):
    check_out: Optional[datetime] = None
    check_out_latitude: Optional[Decimal] = None
    check_out_longitude: Optional[Decimal] = None
    check_out_address: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class AttendanceResponse(AttendanceBase):
    id: UUID
    user_id: UUID
    date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    check_in_latitude: Optional[Decimal] = None
    check_in_longitude: Optional[Decimal] = None
    check_out_latitude: Optional[Decimal] = None
    check_out_longitude: Optional[Decimal] = None
    check_in_address: Optional[str] = None
    check_out_address: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
