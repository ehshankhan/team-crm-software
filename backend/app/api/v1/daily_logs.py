from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date, datetime
from uuid import UUID
from app.database import get_db
from app.schemas.daily_log import DailyLogCreate, DailyLogUpdate, DailyLogResponse
from app.models.daily_log import DailyLog
from app.models.user import User
from app.models.project import Project
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=DailyLogResponse, status_code=status.HTTP_201_CREATED)
def create_daily_log(
    log_data: DailyLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new daily log entry.

    Users can log what they worked on for a specific date.
    """
    # Verify project exists if provided
    if log_data.project_id:
        project = db.query(Project).filter(Project.id == log_data.project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

    # Create daily log
    daily_log = DailyLog(
        user_id=current_user.id,
        date=log_data.date,
        activity=log_data.activity,
        hours_spent=log_data.hours_spent,
        project_id=log_data.project_id
    )

    db.add(daily_log)
    db.commit()
    db.refresh(daily_log)

    # Load relationships
    db.refresh(daily_log)
    daily_log.user
    if daily_log.project_id:
        daily_log.project

    return daily_log


@router.get("/my-logs", response_model=List[DailyLogResponse])
def get_my_daily_logs(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's daily logs.

    Optionally filter by date range.
    """
    query = db.query(DailyLog).options(
        joinedload(DailyLog.user),
        joinedload(DailyLog.project)
    ).filter(DailyLog.user_id == current_user.id)

    if start_date:
        query = query.filter(DailyLog.date >= start_date)
    if end_date:
        query = query.filter(DailyLog.date <= end_date)

    logs = query.order_by(DailyLog.date.desc(), DailyLog.created_at.desc()).all()
    return logs


@router.get("/team", response_model=List[DailyLogResponse])
def get_team_daily_logs(
    log_date: Optional[date] = None,
    user_id: Optional[UUID] = None,
    project_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all team members' daily logs.

    Anyone can view everyone's logs.
    Optionally filter by specific date, user, project, or date range.
    """
    query = db.query(DailyLog).options(
        joinedload(DailyLog.user),
        joinedload(DailyLog.project)
    )

    if log_date:
        query = query.filter(DailyLog.date == log_date)
    if user_id:
        query = query.filter(DailyLog.user_id == user_id)
    if project_id:
        query = query.filter(DailyLog.project_id == project_id)
    if start_date:
        query = query.filter(DailyLog.date >= start_date)
    if end_date:
        query = query.filter(DailyLog.date <= end_date)

    logs = query.order_by(DailyLog.date.desc(), DailyLog.created_at.desc()).all()
    return logs


@router.put("/{log_id}", response_model=DailyLogResponse)
def update_daily_log(
    log_id: UUID,
    log_data: DailyLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a daily log entry.

    Users can only update their own logs, and only for today's date.
    """
    daily_log = db.query(DailyLog).filter(DailyLog.id == log_id).first()

    if not daily_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily log not found"
        )

    # Check ownership
    if daily_log.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own daily logs"
        )

    # Check if it's today's log
    today = date.today()
    if daily_log.date != today:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit today's logs"
        )

    # Verify project exists if updating project_id
    if log_data.project_id:
        project = db.query(Project).filter(Project.id == log_data.project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

    # Update fields
    update_data = log_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(daily_log, field, value)

    db.commit()
    db.refresh(daily_log)

    # Load relationships
    daily_log.user
    if daily_log.project_id:
        daily_log.project

    return daily_log


@router.delete("/{log_id}", status_code=status.HTTP_200_OK)
def delete_daily_log(
    log_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a daily log entry.

    Users can only delete their own logs, and only for today's date.
    """
    daily_log = db.query(DailyLog).filter(DailyLog.id == log_id).first()

    if not daily_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily log not found"
        )

    # Check ownership
    if daily_log.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own daily logs"
        )

    # Check if it's today's log
    today = date.today()
    if daily_log.date != today:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete today's logs"
        )

    db.delete(daily_log)
    db.commit()

    return {"message": "Daily log deleted successfully"}
