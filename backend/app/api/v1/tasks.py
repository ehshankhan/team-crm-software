from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID
from datetime import date, timedelta
from app.database import get_db
from app.schemas.project import (
    TaskUpdate,
    TaskMove,
    TaskPositionUpdate,
    TaskResponse,
    TaskCommentCreate,
    TaskCommentResponse
)
from app.models.project import Task, TaskComment, Board, ProjectMember, Project
from app.models.user import User
from app.core.permissions import can_manage_projects
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get task details with comments.
    """
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Get board to check project access
    board = db.query(Board).filter(Board.id == task.board_id).first()

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

    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: UUID,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update task details.
    """
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Get board to check project access
    board = db.query(Board).filter(Board.id == task.board_id).first()

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

    # If updating assignee, verify they're a project member
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

    # Update fields
    update_data = task_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)

    return task


@router.delete("/{task_id}", status_code=status.HTTP_200_OK)
def delete_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a task.
    """
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Get board to check project access
    board = db.query(Board).filter(Board.id == task.board_id).first()

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

    db.delete(task)
    db.commit()

    return {"message": "Task deleted successfully"}


@router.put("/{task_id}/move", response_model=TaskResponse)
def move_task(
    task_id: UUID,
    move_data: TaskMove,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Move task to another board (drag-and-drop between columns).
    """
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Get old and new boards
    old_board = db.query(Board).filter(Board.id == task.board_id).first()
    new_board = db.query(Board).filter(Board.id == move_data.board_id).first()

    if not new_board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target board not found"
        )

    # Ensure boards are in the same project
    if old_board.project_id != new_board.project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot move task to a different project"
        )

    # Check access
    if not can_manage_projects(current_user):
        is_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == old_board.project_id,
            ProjectMember.user_id == current_user.id
        ).first()

        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this project"
            )

    # Move task
    task.board_id = move_data.board_id
    task.position = move_data.position

    db.commit()
    db.refresh(task)

    return task


@router.put("/{task_id}/position", response_model=TaskResponse)
def reorder_task(
    task_id: UUID,
    position_data: TaskPositionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reorder task within the same board (drag-and-drop within column).
    """
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Get board to check project access
    board = db.query(Board).filter(Board.id == task.board_id).first()

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

    task.position = position_data.position
    db.commit()
    db.refresh(task)

    return task


# ==================== TASK COMMENTS ====================

@router.get("/{task_id}/comments", response_model=List[TaskCommentResponse])
def list_task_comments(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all comments for a task.
    """
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Get board to check project access
    board = db.query(Board).filter(Board.id == task.board_id).first()

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

    comments = db.query(TaskComment).filter(
        TaskComment.task_id == task_id
    ).order_by(TaskComment.created_at).all()

    return comments


@router.post("/{task_id}/comments", response_model=TaskCommentResponse, status_code=status.HTTP_201_CREATED)
def add_task_comment(
    task_id: UUID,
    comment_data: TaskCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a comment to a task.
    """
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Get board to check project access
    board = db.query(Board).filter(Board.id == task.board_id).first()

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


@router.get("/upcoming-deadlines/all", response_model=List[TaskResponse])
def get_upcoming_deadlines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get tasks with deadlines within 2 days, excluding tasks in Review or Done boards.
    Only returns tasks from projects the user has access to.
    """
    today = date.today()
    deadline_threshold = today + timedelta(days=2)

    # Get all tasks with upcoming deadlines
    query = db.query(Task).options(
        joinedload(Task.board).joinedload(Board.project),
        joinedload(Task.assignee)
    ).join(Board).filter(
        Task.due_date.isnot(None),
        Task.due_date <= deadline_threshold,
        Task.due_date >= today,
        Board.name.notin_(["Review", "Done"])
    )

    # Filter by user access
    if not can_manage_projects(current_user):
        # Get projects where user is a member
        member_projects = db.query(ProjectMember.project_id).filter(
            ProjectMember.user_id == current_user.id
        ).subquery()

        query = query.join(Project).filter(
            Project.id.in_(member_projects)
        )

    tasks = query.order_by(Task.due_date).all()
    return tasks
