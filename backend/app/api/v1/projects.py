from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectMemberCreate,
    ProjectMemberResponse,
    BoardCreate,
    BoardUpdate,
    BoardPositionUpdate,
    BoardResponse,
    TaskCreate,
    TaskUpdate,
    TaskMove,
    TaskPositionUpdate,
    TaskResponse,
    TaskCommentCreate,
    TaskCommentResponse
)
from app.models.project import Project, ProjectMember, Board, Task, TaskComment
from app.models.user import User
from app.core.permissions import require_role, Permission, can_manage_projects
from app.api.deps import get_current_user

router = APIRouter()

# Default boards to create with each project
DEFAULT_BOARDS = [
    {"name": "To Do", "position": 0, "color": "#6B7280"},
    {"name": "In Progress", "position": 1, "color": "#3B82F6"},
    {"name": "Review", "position": 2, "color": "#F59E0B"},
    {"name": "Done", "position": 3, "color": "#10B981"},
]


# ==================== PROJECT ENDPOINTS ====================

@router.get("/", response_model=List[ProjectResponse])
def list_projects(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all projects.

    Returns projects the user is a member of, or all projects for managers/admins.
    """
    if can_manage_projects(current_user):
        # Managers and admins can see all projects
        projects = db.query(Project).offset(skip).limit(limit).all()
    else:
        # Employees see only projects they're members of
        projects = db.query(Project).join(ProjectMember).filter(
            ProjectMember.user_id == current_user.id
        ).offset(skip).limit(limit).all()

    return projects


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new project with default Kanban boards.

    Automatically creates 4 boards: To Do, In Progress, Review, Done.
    Creator is automatically added as project owner.
    """
    # Check permissions
    if not can_manage_projects(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and admins can create projects"
        )

    # Create project
    project = Project(
        name=project_data.name,
        description=project_data.description,
        start_date=project_data.start_date,
        end_date=project_data.end_date,
        created_by=current_user.id,
        status="active"
    )
    db.add(project)
    db.flush()  # Get project ID

    # Create default boards
    for board_data in DEFAULT_BOARDS:
        board = Board(
            project_id=project.id,
            name=board_data["name"],
            position=board_data["position"],
            color=board_data["color"]
        )
        db.add(board)

    # Add creator as project owner
    project_member = ProjectMember(
        project_id=project.id,
        user_id=current_user.id,
        role="owner"
    )
    db.add(project_member)

    db.commit()
    db.refresh(project)

    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get project details with boards and members.
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Check if user has access to this project
    if not can_manage_projects(current_user):
        is_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id
        ).first()

        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this project"
            )

    return project


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: UUID,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update project details.
    """
    # Check permissions
    if not can_manage_projects(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and admins can update projects"
        )

    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Update fields
    update_data = project_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)

    return project


@router.delete("/{project_id}", status_code=status.HTTP_200_OK)
def archive_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Archive a project (sets status to 'archived').

    Doesn't delete the project, just marks it as archived.
    """
    # Check permissions
    if not can_manage_projects(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and admins can archive projects"
        )

    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    project.status = "archived"
    db.commit()

    return {"message": "Project archived successfully"}


# ==================== PROJECT MEMBER ENDPOINTS ====================

@router.post("/{project_id}/members", response_model=ProjectMemberResponse, status_code=status.HTTP_201_CREATED)
def add_project_member(
    project_id: UUID,
    member_data: ProjectMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a member to a project.
    """
    # Check permissions
    if not can_manage_projects(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and admins can add project members"
        )

    # Check if project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Check if user exists
    user = db.query(User).filter(User.id == member_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if already a member
    existing_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == member_data.user_id
    ).first()

    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a project member"
        )

    # Add member
    project_member = ProjectMember(
        project_id=project_id,
        user_id=member_data.user_id,
        role=member_data.role
    )
    db.add(project_member)
    db.commit()
    db.refresh(project_member)

    return project_member


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_200_OK)
def remove_project_member(
    project_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove a member from a project.
    """
    # Check permissions
    if not can_manage_projects(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and admins can remove project members"
        )

    project_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()

    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project member not found"
        )

    db.delete(project_member)
    db.commit()

    return {"message": "Project member removed successfully"}
