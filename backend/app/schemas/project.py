from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal


# User schemas (minimal for nested responses)
class UserMinimal(BaseModel):
    id: UUID
    full_name: str
    email: str

    class Config:
        from_attributes = True


# Project schemas (minimal for nested responses)
class ProjectMinimal(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


# Project Member schemas
class ProjectMemberBase(BaseModel):
    user_id: UUID
    role: str = "member"


class ProjectMemberCreate(ProjectMemberBase):
    pass


class ProjectMemberResponse(ProjectMemberBase):
    id: UUID
    project_id: UUID
    joined_at: datetime

    class Config:
        from_attributes = True


# Board schemas
class BoardBase(BaseModel):
    name: str
    position: int = 0
    color: Optional[str] = None


class BoardCreate(BoardBase):
    project_id: UUID


class BoardUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class BoardPositionUpdate(BaseModel):
    position: int


class BoardResponse(BoardBase):
    id: UUID
    project_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# Task Comment schemas
class TaskCommentBase(BaseModel):
    content: str


class TaskCommentCreate(TaskCommentBase):
    pass


class TaskCommentResponse(TaskCommentBase):
    id: UUID
    task_id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# Task schemas
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[date] = None
    estimated_hours: Optional[Decimal] = None


class TaskCreate(TaskBase):
    assignee_id: Optional[UUID] = None
    position: int = 0


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[UUID] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[Decimal] = None


class TaskMove(BaseModel):
    board_id: UUID
    position: int = 0


class TaskPositionUpdate(BaseModel):
    position: int


class TaskResponse(TaskBase):
    id: UUID
    board_id: UUID
    position: int
    assignee_id: Optional[UUID] = None
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    comments: Optional[List[TaskCommentResponse]] = []

    class Config:
        from_attributes = True


# Board with project (for deadline tasks)
class BoardWithProject(BaseModel):
    id: UUID
    name: str
    project: ProjectMinimal

    class Config:
        from_attributes = True


# Task with full details (for deadlines)
class TaskWithDetails(TaskBase):
    id: UUID
    board_id: UUID
    position: int
    assignee_id: Optional[UUID] = None
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    board: BoardWithProject
    assignee: Optional[UserMinimal] = None

    class Config:
        from_attributes = True


# Project schemas
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectResponse(ProjectBase):
    id: UUID
    status: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    members: Optional[List[ProjectMemberResponse]] = []
    boards: Optional[List[BoardResponse]] = []

    class Config:
        from_attributes = True
