from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.schemas.project import (
    BoardCreate,
    BoardUpdate,
    BoardPositionUpdate,
    BoardResponse,
    TaskCreate,
    TaskResponse
)
from app.models.project import Board, Task, ProjectMember
from app.models.user import User
from app.core.permissions import can_manage_projects
from app.api.deps import get_current_user

router = APIRouter()


@router.put("/{board_id}", response_model=BoardResponse)
def update_board(
    board_id: UUID,
    board_data: BoardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update board details (name, color).
    """
    board = db.query(Board).filter(Board.id == board_id).first()

    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found"
        )

    # Check if user has access to this project
    if not can_manage_projects(current_user):
        is_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == board.project_id,
            ProjectMember.user_id == current_user.id
        ).first()

        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this project"
            )

    # Update fields
    update_data = board_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(board, field, value)

    db.commit()
    db.refresh(board)

    return board


@router.put("/{board_id}/position", response_model=BoardResponse)
def reorder_board(
    board_id: UUID,
    position_data: BoardPositionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reorder board position.
    """
    board = db.query(Board).filter(Board.id == board_id).first()

    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found"
        )

    # Check permissions
    if not can_manage_projects(current_user):
        is_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == board.project_id,
            ProjectMember.user_id == current_user.id
        ).first()

        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this project"
            )

    board.position = position_data.position
    db.commit()
    db.refresh(board)

    return board


@router.get("/{board_id}/tasks", response_model=List[TaskResponse])
def list_board_tasks(
    board_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all tasks in a board, ordered by position.
    """
    board = db.query(Board).filter(Board.id == board_id).first()

    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found"
        )

    # Check access
    if not can_manage_projects(current_user):
        is_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == board.project_id,
            ProjectMember.user_id == current_user.id
        ).first()

        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this project"
            )

    tasks = db.query(Task).filter(Task.board_id == board_id).order_by(Task.position).all()
    return tasks


@router.post("/{board_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    board_id: UUID,
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new task in a board.
    """
    board = db.query(Board).filter(Board.id == board_id).first()

    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found"
        )

    # Check access
    if not can_manage_projects(current_user):
        is_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == board.project_id,
            ProjectMember.user_id == current_user.id
        ).first()

        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this project"
            )

    # If assignee is specified, verify they're a project member
    if task_data.assignee_id:
        assignee_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == board.project_id,
            ProjectMember.user_id == task_data.assignee_id
        ).first()

        if not assignee_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assignee must be a project member"
            )

    # Create task
    task = Task(
        board_id=board_id,
        title=task_data.title,
        description=task_data.description,
        assignee_id=task_data.assignee_id,
        priority=task_data.priority,
        due_date=task_data.due_date,
        estimated_hours=task_data.estimated_hours,
        position=task_data.position,
        created_by=current_user.id
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    return task
