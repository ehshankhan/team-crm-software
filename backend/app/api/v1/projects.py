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

    All users can view all projects, but only members can edit/add tasks.
    """
    # All users can see all projects
    projects = db.query(Project).offset(skip).limit(limit).all()

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

    All users can view project details, but only members can edit/add tasks.
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # All users can view projects (viewing is allowed, editing is restricted to members)
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


# ==================== BOARD ENDPOINTS ====================

@router.get("/boards/{board_id}/tasks", response_model=List[TaskResponse])
def list_board_tasks(
    board_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all tasks for a board.

    All users can view tasks (read-only for non-members).
    """
    # Verify board exists and get its project
    board = db.query(Board).filter(Board.id == board_id).first()

    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found"
        )

    # All users can view tasks (editing restricted to project members)
    tasks = db.query(Task).filter(Task.board_id == board_id).order_by(Task.position).all()

    return tasks


@router.put("/boards/{board_id}", response_model=BoardResponse)
def update_board(
    board_id: UUID,
    board_data: BoardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a board.

    Only managers/admins can update boards.
    """
    board = db.query(Board).filter(Board.id == board_id).first()

    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found"
        )

    # Check permissions
    if not can_manage_projects(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and admins can update boards"
        )

    # Update fields
    update_data = board_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(board, field, value)

    db.commit()
    db.refresh(board)

    return board


# ==================== TASK ENDPOINTS ====================

@router.post("/boards/{board_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    board_id: UUID,
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new task in a board.

    Only project members can create tasks.
    """
    # Verify board exists
    board = db.query(Board).filter(Board.id == board_id).first()

    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found"
        )

    # Check if user is a project member or manager/admin
    if not can_manage_projects(current_user):
        is_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == board.project_id,
            ProjectMember.user_id == current_user.id
        ).first()

        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a project member to create tasks"
            )

    # Create task
    task = Task(
        board_id=board_id,
        title=task_data.title,
        description=task_data.description,
        priority=task_data.priority,
        due_date=task_data.due_date,
        estimated_hours=task_data.estimated_hours,
        assignee_id=task_data.assignee_id,
        position=task_data.position,
        created_by=current_user.id
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    return task


@router.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get task details.

    All users can view tasks (read-only for non-members).
    """
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # All users can view tasks (editing restricted to project members)
    return task


@router.put("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: UUID,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a task.

    Only project members can update tasks.
    """
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Check if user is a project member or manager/admin
    board = db.query(Board).filter(Board.id == task.board_id).first()

    if not can_manage_projects(current_user):
        is_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == board.project_id,
            ProjectMember.user_id == current_user.id
        ).first()

        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a project member to update tasks"
            )

    # Update fields
    update_data = task_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)

    return task


@router.put("/tasks/{task_id}/move", response_model=TaskResponse)
def move_task(
    task_id: UUID,
    move_data: TaskMove,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Move a task to a different board.

    Only project members can move tasks.
    """
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Verify target board exists
    target_board = db.query(Board).filter(Board.id == move_data.board_id).first()

    if not target_board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target board not found"
        )

    # Get source board
    source_board = db.query(Board).filter(Board.id == task.board_id).first()

    # Verify both boards belong to same project
    if source_board.project_id != target_board.project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot move task to a board in a different project"
        )

    # Check if user is a project member or manager/admin
    if not can_manage_projects(current_user):
        is_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == target_board.project_id,
            ProjectMember.user_id == current_user.id
        ).first()

        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a project member to move tasks"
            )

    # Move task
    task.board_id = move_data.board_id
    task.position = move_data.position

    db.commit()
    db.refresh(task)

    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_200_OK)
def delete_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a task.

    Only project members can delete tasks.
    """
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Check if user is a project member or manager/admin
    board = db.query(Board).filter(Board.id == task.board_id).first()

    if not can_manage_projects(current_user):
        is_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == board.project_id,
            ProjectMember.user_id == current_user.id
        ).first()

        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a project member to delete tasks"
            )

    db.delete(task)
    db.commit()

    return {"message": "Task deleted successfully"}


# ==================== TASK COMMENT ENDPOINTS ====================

@router.post("/tasks/{task_id}/comments", response_model=TaskCommentResponse, status_code=status.HTTP_201_CREATED)
def create_task_comment(
    task_id: UUID,
    comment_data: TaskCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a comment to a task.

    Only project members can comment.
    """
    # Verify task exists
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Check if user is a project member or manager/admin
    board = db.query(Board).filter(Board.id == task.board_id).first()

    if not can_manage_projects(current_user):
        is_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == board.project_id,
            ProjectMember.user_id == current_user.id
        ).first()

        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a project member to comment"
            )

    # Create comment
    comment = TaskComment(
        task_id=task_id,
        user_id=current_user.id,
        content=comment_data.content
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return comment


@router.delete("/tasks/{task_id}/comments/{comment_id}", status_code=status.HTTP_200_OK)
def delete_task_comment(
    task_id: UUID,
    comment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a task comment.

    Only the comment author or managers/admins can delete comments.
    """
    comment = db.query(TaskComment).filter(
        TaskComment.id == comment_id,
        TaskComment.task_id == task_id
    ).first()

    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )

    # Only comment author or managers/admins can delete
    if comment.user_id != current_user.id and not can_manage_projects(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own comments"
        )

    db.delete(comment)
    db.commit()

    return {"message": "Comment deleted successfully"}
