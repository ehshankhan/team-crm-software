from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from uuid import UUID
from app.database import get_db
from app.schemas.attendance import (
    CheckInRequest,
    CheckOutRequest,
    AttendanceResponse
)
from app.models.attendance import Attendance
from app.models.user import User
from app.core.permissions import require_role, Permission
from app.api.deps import get_current_user
from app.services.attendance import validate_location
from app.services.timesheet import process_checkout

router = APIRouter()


@router.post("/check-in", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
def check_in(
    check_in_data: CheckInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check-in with GPS validation.

    Validates that the user is within 200 meters of the lab location.
    Creates a new attendance record for today.
    """
    # Validate GPS location
    if not validate_location(check_in_data.latitude, check_in_data.longitude):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are not within 200 meters of the office location. Please check-in from the office premises."
        )

    # Check if user has already checked in today
    today = date.today()
    existing_attendance = db.query(Attendance).filter(
        Attendance.user_id == current_user.id,
        Attendance.date == today
    ).first()

    if existing_attendance and existing_attendance.check_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already checked in today"
        )

    # Create or update attendance record
    if existing_attendance:
        # Update existing record
        existing_attendance.check_in = datetime.utcnow()
        existing_attendance.check_in_latitude = check_in_data.latitude
        existing_attendance.check_in_longitude = check_in_data.longitude
        existing_attendance.check_in_address = check_in_data.address
        attendance = existing_attendance
    else:
        # Create new record
        attendance = Attendance(
            user_id=current_user.id,
            date=today,
            check_in=datetime.utcnow(),
            check_in_latitude=check_in_data.latitude,
            check_in_longitude=check_in_data.longitude,
            check_in_address=check_in_data.address,
            status="present"
        )
        db.add(attendance)

    # Set user as active when they check in (except super_admin who is always active)
    if current_user.role and current_user.role.name != Permission.SUPER_ADMIN:
        current_user.is_active = True

    db.commit()
    db.refresh(attendance)

    return attendance


@router.post("/check-out", response_model=AttendanceResponse)
def check_out(
    check_out_data: CheckOutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check-out with GPS validation.

    Validates GPS location and updates attendance record.
    Automatically generates/updates timesheet entry.
    """
    # Validate GPS location
    if not validate_location(check_out_data.latitude, check_out_data.longitude):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are not within 200 meters of the office location. Please check-out from the office premises."
        )

    # Get today's attendance
    today = date.today()
    attendance = db.query(Attendance).filter(
        Attendance.user_id == current_user.id,
        Attendance.date == today
    ).first()

    if not attendance or not attendance.check_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You haven't checked in today. Please check-in first."
        )

    if attendance.check_out:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already checked out today"
        )

    # Update check-out information
    attendance.check_out = datetime.utcnow()
    attendance.check_out_latitude = check_out_data.latitude
    attendance.check_out_longitude = check_out_data.longitude
    attendance.check_out_address = check_out_data.address

    if check_out_data.notes:
        attendance.notes = check_out_data.notes

    # Set user as inactive when they check out (except super_admin who is always active)
    if current_user.role and current_user.role.name != Permission.SUPER_ADMIN:
        current_user.is_active = False

    db.commit()
    db.refresh(attendance)

    # Auto-generate/update timesheet
    process_checkout(attendance, db)

    return attendance


@router.get("/today", response_model=Optional[AttendanceResponse])
def get_today_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's attendance status for today.
    """
    today = date.today()
    attendance = db.query(Attendance).filter(
        Attendance.user_id == current_user.id,
        Attendance.date == today
    ).first()

    return attendance


@router.get("/me", response_model=List[AttendanceResponse])
def get_my_attendance(
    skip: int = 0,
    limit: int = 30,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's attendance history.

    Optionally filter by date range.
    """
    query = db.query(Attendance).filter(Attendance.user_id == current_user.id)

    if start_date:
        query = query.filter(Attendance.date >= start_date)
    if end_date:
        query = query.filter(Attendance.date <= end_date)

    attendances = query.order_by(Attendance.date.desc()).offset(skip).limit(limit).all()
    return attendances


@router.get("/", response_model=List[AttendanceResponse])
def get_all_attendance(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all attendance records (admin and manager only).

    Optionally filter by date range.
    """
    # Check permissions
    require_role(current_user, [Permission.SUPER_ADMIN, Permission.MANAGER])

    query = db.query(Attendance)

    if start_date:
        query = query.filter(Attendance.date >= start_date)
    if end_date:
        query = query.filter(Attendance.date <= end_date)

    attendances = query.order_by(Attendance.date.desc()).offset(skip).limit(limit).all()
    return attendances


@router.get("/user/{user_id}", response_model=List[AttendanceResponse])
def get_user_attendance(
    user_id: UUID,
    skip: int = 0,
    limit: int = 30,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific user's attendance history (admin and manager only).

    Optionally filter by date range.
    """
    # Check permissions
    require_role(current_user, [Permission.SUPER_ADMIN, Permission.MANAGER])

    query = db.query(Attendance).filter(Attendance.user_id == user_id)

    if start_date:
        query = query.filter(Attendance.date >= start_date)
    if end_date:
        query = query.filter(Attendance.date <= end_date)

    attendances = query.order_by(Attendance.date.desc()).offset(skip).limit(limit).all()
    return attendances
