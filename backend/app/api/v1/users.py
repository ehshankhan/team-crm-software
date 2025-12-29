from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.schemas.user import UserCreate, UserUpdate, UserResponse, RoleResponse
from app.models.user import User, Role
from app.core.security import get_password_hash
from app.core.permissions import require_role, Permission
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/roles", response_model=List[RoleResponse])
def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all available roles.
    """
    roles = db.query(Role).all()
    return roles


@router.get("/", response_model=List[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all users (admin and manager only).
    """
    # Check permissions
    require_role(current_user, [Permission.SUPER_ADMIN, Permission.MANAGER])

    # Get users with project count
    from app.models.project import ProjectMember
    from sqlalchemy import func

    users = db.query(User).offset(skip).limit(limit).all()

    # Add project count to each user
    for user in users:
        project_count = db.query(func.count(ProjectMember.id)).filter(
            ProjectMember.user_id == user.id
        ).scalar()
        user.project_count = project_count or 0

    return users


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific user by ID.

    Users can view their own profile, managers and admins can view any user.
    """
    # Get the user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check permissions - users can view their own profile
    if user.id != current_user.id:
        require_role(current_user, [Permission.SUPER_ADMIN, Permission.MANAGER])

    return user


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new user (admin only).
    """
    # Check permissions
    require_role(current_user, [Permission.SUPER_ADMIN])

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Verify role exists
    role = db.query(Role).filter(Role.id == user_data.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        full_name=user_data.full_name,
        phone=user_data.phone,
        avatar_url=user_data.avatar_url,
        role_id=user_data.role_id,
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a user.

    Users can update their own profile (limited fields).
    Admins can update any user including role and active status.
    """
    # Get the user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check permissions
    is_own_profile = user.id == current_user.id
    is_admin = current_user.role and current_user.role.name == Permission.SUPER_ADMIN

    if not is_own_profile and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )

    # Update fields
    update_data = user_data.model_dump(exclude_unset=True)

    # Only admins can update role_id and is_active
    if not is_admin:
        update_data.pop("role_id", None)
        update_data.pop("is_active", None)

    # Verify role exists if updating role
    if "role_id" in update_data and update_data["role_id"]:
        role = db.query(Role).filter(Role.id == update_data["role_id"]).first()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )

    # Update user
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    return user


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def deactivate_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deactivate a user (admin only).

    This doesn't delete the user, just sets is_active to False.
    """
    # Check permissions
    require_role(current_user, [Permission.SUPER_ADMIN])

    # Get the user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent self-deactivation
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )

    # Deactivate user
    user.is_active = False
    db.commit()

    return {"message": "User deactivated successfully"}
