from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from uuid import UUID
from app.database import get_db
from app.schemas.timesheet import (
    TimesheetResponse,
    TimesheetUpdate,
    TimesheetApprove,
    TimesheetReject
)
from app.models.timesheet import Timesheet
from app.models.user import User
from app.core.permissions import require_role, Permission, can_approve_timesheet
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/me", response_model=List[TimesheetResponse])
def get_my_timesheets(
    skip: int = 0,
    limit: int = 30,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's timesheets.

    Optionally filter by date range.
    """
    query = db.query(Timesheet).filter(Timesheet.user_id == current_user.id)

    if start_date:
        query = query.filter(Timesheet.date >= start_date)
    if end_date:
        query = query.filter(Timesheet.date <= end_date)

    timesheets = query.order_by(Timesheet.date.desc()).offset(skip).limit(limit).all()
    return timesheets


@router.get("/", response_model=List[TimesheetResponse])
def get_all_timesheets(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all timesheets (admin and manager only).

    Optionally filter by date range and status.
    """
    # Check permissions
    require_role(current_user, [Permission.SUPER_ADMIN, Permission.MANAGER])

    query = db.query(Timesheet)

    if start_date:
        query = query.filter(Timesheet.date >= start_date)
    if end_date:
        query = query.filter(Timesheet.date <= end_date)
    if status_filter:
        query = query.filter(Timesheet.status == status_filter)

    timesheets = query.order_by(Timesheet.date.desc()).offset(skip).limit(limit).all()
    return timesheets


@router.get("/user/{user_id}", response_model=List[TimesheetResponse])
def get_user_timesheets(
    user_id: UUID,
    skip: int = 0,
    limit: int = 30,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific user's timesheets (admin and manager only).

    Optionally filter by date range.
    """
    # Check permissions
    require_role(current_user, [Permission.SUPER_ADMIN, Permission.MANAGER])

    query = db.query(Timesheet).filter(Timesheet.user_id == user_id)

    if start_date:
        query = query.filter(Timesheet.date >= start_date)
    if end_date:
        query = query.filter(Timesheet.date <= end_date)

    timesheets = query.order_by(Timesheet.date.desc()).offset(skip).limit(limit).all()
    return timesheets


@router.get("/{timesheet_id}", response_model=TimesheetResponse)
def get_timesheet(
    timesheet_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific timesheet by ID.

    Users can view their own timesheets, managers/admins can view any.
    """
    timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()

    if not timesheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timesheet not found"
        )

    # Check permissions - users can view their own timesheets
    if timesheet.user_id != current_user.id:
        require_role(current_user, [Permission.SUPER_ADMIN, Permission.MANAGER])

    return timesheet


@router.put("/{timesheet_id}", response_model=TimesheetResponse)
def update_timesheet(
    timesheet_id: UUID,
    update_data: TimesheetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a timesheet (add manual hours and notes).

    Users can update their own pending timesheets.
    Approved/rejected timesheets cannot be modified.
    """
    timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()

    if not timesheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timesheet not found"
        )

    # Only the owner can update their own timesheet
    if timesheet.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own timesheets"
        )

    # Cannot update approved or rejected timesheets
    if timesheet.status in ["approved", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update a {timesheet.status} timesheet"
        )

    # Update fields
    if update_data.manual_hours is not None:
        if update_data.manual_hours < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Manual hours cannot be negative"
            )
        timesheet.manual_hours = update_data.manual_hours

    if update_data.notes is not None:
        timesheet.notes = update_data.notes

    timesheet.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(timesheet)

    return timesheet


@router.post("/{timesheet_id}/approve", response_model=TimesheetResponse)
def approve_timesheet(
    timesheet_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Approve a timesheet (manager/admin only).

    Sets status to 'approved' and records who approved it.
    """
    # Check permissions
    if not can_approve_timesheet(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and admins can approve timesheets"
        )

    timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()

    if not timesheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timesheet not found"
        )

    # Cannot approve own timesheet
    if timesheet.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot approve your own timesheet"
        )

    # Check if already approved or rejected
    if timesheet.status == "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Timesheet is already approved"
        )

    # Update timesheet
    timesheet.status = "approved"
    timesheet.approved_by = current_user.id
    timesheet.approved_at = datetime.utcnow()
    timesheet.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(timesheet)

    return timesheet


@router.post("/{timesheet_id}/reject", response_model=TimesheetResponse)
def reject_timesheet(
    timesheet_id: UUID,
    reject_data: TimesheetReject,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reject a timesheet (manager/admin only).

    Sets status to 'rejected' and optionally adds rejection notes.
    """
    # Check permissions
    if not can_approve_timesheet(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and admins can reject timesheets"
        )

    timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()

    if not timesheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timesheet not found"
        )

    # Cannot reject own timesheet
    if timesheet.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot reject your own timesheet"
        )

    # Check if already rejected
    if timesheet.status == "rejected":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Timesheet is already rejected"
        )

    # Update timesheet
    timesheet.status = "rejected"
    timesheet.approved_by = current_user.id  # Track who rejected it
    timesheet.approved_at = datetime.utcnow()

    if reject_data.notes:
        timesheet.notes = reject_data.notes

    timesheet.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(timesheet)

    return timesheet
