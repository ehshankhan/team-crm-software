from fastapi import HTTPException, status
from typing import List
from app.models.user import User


class Permission:
    """Permission constants for role-based access control."""
    SUPER_ADMIN = "super_admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"


def check_user_role(user: User, allowed_roles: List[str]) -> bool:
    """Check if user has one of the allowed roles."""
    if not user.role:
        return False
    return user.role.name in allowed_roles


def require_role(user: User, allowed_roles: List[str]) -> None:
    """Require user to have one of the allowed roles, raise exception if not."""
    if not check_user_role(user, allowed_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )


def is_super_admin(user: User) -> bool:
    """Check if user is a super admin."""
    return user.role and user.role.name == Permission.SUPER_ADMIN


def is_manager_or_admin(user: User) -> bool:
    """Check if user is a manager or super admin."""
    return user.role and user.role.name in [Permission.SUPER_ADMIN, Permission.MANAGER]


def can_manage_users(user: User) -> bool:
    """Check if user can manage other users."""
    return is_super_admin(user)


def can_approve_timesheet(user: User) -> bool:
    """Check if user can approve timesheets."""
    return is_manager_or_admin(user)


def can_manage_projects(user: User) -> bool:
    """Check if user can manage projects."""
    return is_manager_or_admin(user)


def can_manage_inventory(user: User) -> bool:
    """Check if user can manage inventory."""
    return is_manager_or_admin(user)
