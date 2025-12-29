from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from uuid import UUID
from app.database import get_db
from app.schemas.leave import LeaveCreate, LeaveUpdate, LeaveApprove, LeaveResponse
from app.models.leave import Leave, LeaveStatus
from app.models.user import User
from app.core.permissions import require_role, Permission
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=LeaveResponse, status_code=status.HTTP_201_CREATED)
def create_leave(
    leave_data: LeaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a leave request.

    Any user can request leave for themselves.
    """
    # Validate dates
    if leave_data.end_date < leave_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after or equal to start date"
        )

    # Check for overlapping leave
    existing_leave = db.query(Leave).filter(
        Leave.user_id == current_user.id,
        Leave.status.in_([LeaveStatus.PENDING, LeaveStatus.APPROVED]),
        Leave.start_date <= leave_data.end_date,
        Leave.end_date >= leave_data.start_date
    ).first()

    if existing_leave:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a leave request for overlapping dates"
        )

    # Create leave
    new_leave = Leave(
        user_id=current_user.id,
        start_date=leave_data.start_date,
        end_date=leave_data.end_date,
        reason=leave_data.reason,
        status=LeaveStatus.PENDING
    )

    db.add(new_leave)
    db.commit()
    db.refresh(new_leave)

    return new_leave


@router.get("/me", response_model=List[LeaveResponse])
def get_my_leaves(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's leave requests.
    """
    query = db.query(Leave).filter(Leave.user_id == current_user.id)

    if status_filter:
        query = query.filter(Leave.status == status_filter)

    leaves = query.order_by(Leave.start_date.desc()).offset(skip).limit(limit).all()
    return leaves


@router.get("/", response_model=List[LeaveResponse])
def get_all_leaves(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    user_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all leave requests (admin and manager only).
    """
    require_role(current_user, [Permission.SUPER_ADMIN, Permission.MANAGER])

    query = db.query(Leave)

    if status_filter:
        query = query.filter(Leave.status == status_filter)

    if user_id:
        query = query.filter(Leave.user_id == user_id)

    leaves = query.order_by(Leave.start_date.desc()).offset(skip).limit(limit).all()
    return leaves


@router.get("/{leave_id}", response_model=LeaveResponse)
def get_leave(
    leave_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific leave request.

    Users can view their own leaves, managers and admins can view all.
    """
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found"
        )

    # Check permissions
    if leave.user_id != current_user.id:
        require_role(current_user, [Permission.SUPER_ADMIN, Permission.MANAGER])

    return leave


@router.put("/{leave_id}", response_model=LeaveResponse)
def update_leave(
    leave_id: UUID,
    leave_data: LeaveUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a leave request.

    Users can only update their own pending leaves.
    """
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found"
        )

    # Only user's own pending leaves can be updated
    if leave.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own leave requests"
        )

    if leave.status != LeaveStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending leave requests can be updated"
        )

    # Update fields
    update_data = leave_data.model_dump(exclude_unset=True)

    # Validate dates if updated
    start_date = update_data.get("start_date", leave.start_date)
    end_date = update_data.get("end_date", leave.end_date)

    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after or equal to start date"
        )

    for field, value in update_data.items():
        setattr(leave, field, value)

    db.commit()
    db.refresh(leave)

    return leave


@router.put("/{leave_id}/approve", response_model=LeaveResponse)
def approve_or_reject_leave(
    leave_id: UUID,
    approval_data: LeaveApprove,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Approve or reject a leave request (admin and manager only).
    """
    require_role(current_user, [Permission.SUPER_ADMIN, Permission.MANAGER])

    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found"
        )

    if leave.status != LeaveStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Leave request has already been processed"
        )

    # Update leave status
    leave.status = LeaveStatus(approval_data.status)
    leave.approved_by_id = current_user.id
    leave.approved_at = datetime.utcnow()

    if approval_data.status == "rejected" and approval_data.rejection_reason:
        leave.rejection_reason = approval_data.rejection_reason

    db.commit()
    db.refresh(leave)

    return leave


@router.delete("/{leave_id}", status_code=status.HTTP_200_OK)
def delete_leave(
    leave_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a leave request.

    Users can delete their own pending leaves.
    Admins can delete any leave.
    """
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found"
        )

    # Check permissions
    is_admin = current_user.role and current_user.role.name == Permission.SUPER_ADMIN
    is_own_leave = leave.user_id == current_user.id

    if not is_own_leave and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own leave requests"
        )

    # Users can only delete pending leaves
    if not is_admin and leave.status != LeaveStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only delete pending leave requests"
        )

    db.delete(leave)
    db.commit()

    return {"message": "Leave request deleted successfully"}
