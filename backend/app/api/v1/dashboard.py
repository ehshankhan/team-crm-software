from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from app.database import get_db
from app.models.user import User
from app.models.attendance import Attendance
from app.models.project import Project
from app.models.inventory import InventoryItem
from app.api.deps import get_current_user
from pydantic import BaseModel

router = APIRouter()


class DashboardStats(BaseModel):
    total_users: int
    todays_attendance: int
    active_projects: int
    low_stock_items: int


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get dashboard statistics.

    Returns:
    - Total active users count
    - Today's attendance count
    - Active projects count
    - Low stock items count
    """
    # Total active users
    total_users = db.query(User).filter(User.is_active == True).count()

    # Today's attendance (users who checked in)
    today = date.today()
    todays_attendance = db.query(Attendance).filter(
        Attendance.date == today,
        Attendance.check_in.isnot(None)
    ).count()

    # Active projects
    active_projects = db.query(Project).filter(
        Project.status == "active"
    ).count()

    # Low stock items (quantity < min_threshold)
    low_stock_items = db.query(InventoryItem).filter(
        InventoryItem.quantity < InventoryItem.min_threshold
    ).count()

    return DashboardStats(
        total_users=total_users,
        todays_attendance=todays_attendance,
        active_projects=active_projects,
        low_stock_items=low_stock_items
    )
