# Team Management CRM - Implementation Guide

> **This document is for Claude Code to read and follow when building the project.**

---

## Project Overview

Build an internal team management CRM with:
- **Web CRM** (Next.js) — Desktop browser interface
- **Mobile App** (React Native) — GPS attendance only
- **Backend API** (FastAPI + PostgreSQL) — Dockerized

**Users:** ~20 team members  
**Roles:** Super Admin, Manager, Employee

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI (Python 3.11) |
| Database | PostgreSQL 15 |
| Auth | JWT (python-jose) |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| Frontend Web | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Frontend Mobile | React Native (Expo) |
| State Management | Zustand |
| Container | Docker + Docker Compose |

---

## Core Features (Priority Order)

1. **Authentication & User Management**
   - JWT-based auth (access + refresh tokens)
   - Role-based permissions (super_admin, manager, employee)
   - User CRUD

2. **Attendance Management**
   - GPS-based check-in/check-out (mobile)
   - 50-meter radius validation from lab location
   - Lab coordinates: Store in environment variable `LAB_LATITUDE` and `LAB_LONGITUDE`
   - Attendance history & dashboard

3. **Timesheet**
   - Auto-generated from attendance (check-out - check-in = hours)
   - Manual hour additions allowed
   - Approval workflow (Manager/Admin approves)
   - Status: pending → approved/rejected

4. **Project Management (Kanban)**
   - Projects with members
   - Fixed board columns: "To Do", "In Progress", "Review", "Done"
   - Tasks with: assignee, priority (low/medium/high/urgent), due date, description
   - Drag-and-drop reordering
   - Task comments

5. **Inventory Management**
   - Lab components tracking
   - Categories for organization
   - Stock in/out transactions
   - Transaction history
   - Low stock alerts (when quantity < min_threshold)

---

## Project Structure

Create this folder structure:

```
team-crm/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── attendance.py
│   │   │   ├── timesheet.py
│   │   │   ├── project.py
│   │   │   └── inventory.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── attendance.py
│   │   │   ├── timesheet.py
│   │   │   ├── project.py
│   │   │   └── inventory.py
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── deps.py
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── router.py
│   │   │       ├── auth.py
│   │   │       ├── users.py
│   │   │       ├── attendance.py
│   │   │       ├── timesheets.py
│   │   │       ├── projects.py
│   │   │       └── inventory.py
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── security.py
│   │   │   └── permissions.py
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── attendance.py
│   │       └── timesheet.py
│   ├── alembic/
│   ├── tests/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   └── .env.example
│
├── web-crm/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── store/
│   │   └── types/
│   ├── Dockerfile
│   ├── package.json
│   └── next.config.js
│
├── mobile-app/
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── services/
│   │   └── hooks/
│   ├── App.tsx
│   └── package.json
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Database Schema

### Users & Auth

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (name, permissions) VALUES
('super_admin', '{"all": true}'),
('manager', '{"view_team": true, "approve_timesheet": true, "manage_projects": true, "manage_inventory": true}'),
('employee', '{"view_own": true, "mark_attendance": true, "view_projects": true, "use_inventory": true}');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    role_id UUID REFERENCES roles(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Attendance

```sql
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    check_in_latitude DECIMAL(10, 8),
    check_in_longitude DECIMAL(11, 8),
    check_out_latitude DECIMAL(10, 8),
    check_out_longitude DECIMAL(11, 8),
    check_in_address TEXT,
    check_out_address TEXT,
    status VARCHAR(20) DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);
```

### Timesheet

```sql
CREATE TABLE timesheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    auto_hours DECIMAL(4, 2) DEFAULT 0,
    manual_hours DECIMAL(4, 2) DEFAULT 0,
    total_hours DECIMAL(4, 2) GENERATED ALWAYS AS (auto_hours + manual_hours) STORED,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);
```

### Projects & Tasks (Kanban)

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

CREATE TABLE boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    color VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    assignee_id UUID REFERENCES users(id),
    priority VARCHAR(20) DEFAULT 'medium',
    due_date DATE,
    estimated_hours DECIMAL(4, 2),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Inventory

```sql
CREATE TABLE inventory_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES inventory_categories(id),
    sku VARCHAR(100) UNIQUE,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'pcs',
    location VARCHAR(255),
    min_threshold INTEGER DEFAULT 0,
    unit_price DECIMAL(10, 2),
    supplier VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(20) NOT NULL,
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### Auth
```
POST   /api/v1/auth/register     - Register (admin only creates users)
POST   /api/v1/auth/login        - Login, returns {access_token, refresh_token}
POST   /api/v1/auth/refresh      - Refresh access token
GET    /api/v1/auth/me           - Get current user
```

### Users
```
GET    /api/v1/users             - List users (admin, manager)
GET    /api/v1/users/{id}        - Get user
POST   /api/v1/users             - Create user (admin)
PUT    /api/v1/users/{id}        - Update user
DELETE /api/v1/users/{id}        - Deactivate user (admin)
```

### Attendance
```
POST   /api/v1/attendance/check-in   - GPS check-in
POST   /api/v1/attendance/check-out  - GPS check-out
GET    /api/v1/attendance/today      - Today's status
GET    /api/v1/attendance/me         - Own history
GET    /api/v1/attendance            - All attendance (admin, manager)
GET    /api/v1/attendance/user/{id}  - User's attendance (admin, manager)
```

### Timesheets
```
GET    /api/v1/timesheets/me           - Own timesheets
GET    /api/v1/timesheets              - All timesheets (admin, manager)
PUT    /api/v1/timesheets/{id}         - Update (add manual hours)
POST   /api/v1/timesheets/{id}/approve - Approve (manager, admin)
POST   /api/v1/timesheets/{id}/reject  - Reject (manager, admin)
```

### Projects
```
GET    /api/v1/projects              - List projects
POST   /api/v1/projects              - Create project
GET    /api/v1/projects/{id}         - Get project with boards & tasks
PUT    /api/v1/projects/{id}         - Update project
DELETE /api/v1/projects/{id}         - Archive project
POST   /api/v1/projects/{id}/members - Add member
DELETE /api/v1/projects/{id}/members/{user_id} - Remove member
```

### Boards & Tasks
```
POST   /api/v1/projects/{id}/boards  - Create board (auto-creates 4 default)
PUT    /api/v1/boards/{id}           - Update board
PUT    /api/v1/boards/{id}/position  - Reorder board

GET    /api/v1/boards/{id}/tasks     - List tasks
POST   /api/v1/boards/{id}/tasks     - Create task
GET    /api/v1/tasks/{id}            - Get task
PUT    /api/v1/tasks/{id}            - Update task
DELETE /api/v1/tasks/{id}            - Delete task
PUT    /api/v1/tasks/{id}/move       - Move to another board
PUT    /api/v1/tasks/{id}/position   - Reorder within board

POST   /api/v1/tasks/{id}/comments   - Add comment
GET    /api/v1/tasks/{id}/comments   - List comments
```

### Inventory
```
GET    /api/v1/inventory/categories     - List categories
POST   /api/v1/inventory/categories     - Create category (admin)
GET    /api/v1/inventory                - List items
POST   /api/v1/inventory                - Create item (admin, manager)
GET    /api/v1/inventory/{id}           - Get item with history
PUT    /api/v1/inventory/{id}           - Update item
DELETE /api/v1/inventory/{id}           - Delete item (admin)
POST   /api/v1/inventory/{id}/stock-in  - Add stock
POST   /api/v1/inventory/{id}/stock-out - Remove stock
GET    /api/v1/inventory/low-stock      - Get items below threshold
```

---

## Key Implementation Details

### 1. GPS Validation (Attendance)

```python
# services/attendance.py
from math import radians, cos, sin, asin, sqrt

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in meters between two GPS points."""
    R = 6371000  # Earth's radius in meters
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    return R * c

def validate_location(lat: float, lon: float, settings) -> bool:
    """Check if user is within 50m of lab."""
    distance = haversine(lat, lon, settings.LAB_LATITUDE, settings.LAB_LONGITUDE)
    return distance <= 50  # 50 meters
```

### 2. Auto-Generate Timesheet from Attendance

```python
# When check-out happens, calculate hours and create/update timesheet
def process_checkout(attendance: Attendance, db: Session):
    if attendance.check_in and attendance.check_out:
        hours = (attendance.check_out - attendance.check_in).total_seconds() / 3600
        
        timesheet = db.query(Timesheet).filter(
            Timesheet.user_id == attendance.user_id,
            Timesheet.date == attendance.date
        ).first()
        
        if timesheet:
            timesheet.auto_hours = round(hours, 2)
        else:
            timesheet = Timesheet(
                user_id=attendance.user_id,
                date=attendance.date,
                auto_hours=round(hours, 2)
            )
            db.add(timesheet)
        
        db.commit()
```

### 3. Default Kanban Boards

```python
# When creating a project, auto-create default boards
DEFAULT_BOARDS = [
    {"name": "To Do", "position": 0, "color": "#6B7280"},
    {"name": "In Progress", "position": 1, "color": "#3B82F6"},
    {"name": "Review", "position": 2, "color": "#F59E0B"},
    {"name": "Done", "position": 3, "color": "#10B981"},
]

def create_project_with_boards(project_data, user_id, db):
    project = Project(**project_data, created_by=user_id)
    db.add(project)
    db.flush()
    
    for board_data in DEFAULT_BOARDS:
        board = Board(project_id=project.id, **board_data)
        db.add(board)
    
    # Add creator as owner
    member = ProjectMember(project_id=project.id, user_id=user_id, role="owner")
    db.add(member)
    
    db.commit()
    return project
```

### 4. Role-Based Permissions

```python
# core/permissions.py
from functools import wraps
from fastapi import HTTPException, status

class Permission:
    SUPER_ADMIN = "super_admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"

def require_roles(*allowed_roles):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user, **kwargs):
            if current_user.role.name not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions"
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

# Usage in routes:
@router.get("/users")
@require_roles(Permission.SUPER_ADMIN, Permission.MANAGER)
async def list_users(current_user: User = Depends(get_current_user)):
    ...
```

---

## Environment Variables

```env
# .env.example

# Database
DB_HOST=db
DB_PORT=5432
DB_NAME=team_crm
DB_USER=postgres
DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Lab Location (for GPS validation)
LAB_LATITUDE=28.6139
LAB_LONGITUDE=77.2090

# App
DEBUG=true
API_V1_PREFIX=/api/v1
```

---

## Docker Compose

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: crm_db
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - crm_network

  backend:
    build: ./backend
    container_name: crm_backend
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
    ports:
      - "8000:8000"
    depends_on:
      - db
    networks:
      - crm_network
    volumes:
      - ./backend:/app

  web:
    build: ./web-crm
    container_name: crm_web
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000/api/v1
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - crm_network

volumes:
  postgres_data:

networks:
  crm_network:
    driver: bridge
```

---

## Implementation Order

### Phase 1: Backend Foundation
1. Create project structure
2. Set up Docker & PostgreSQL
3. Implement database models (SQLAlchemy)
4. Set up Alembic migrations
5. Implement JWT auth (login, register, refresh)
6. Create user CRUD with role-based access
7. Test with Swagger UI at `/docs`

### Phase 2: Attendance Module
1. Create attendance model & schema
2. Implement GPS validation service
3. Create check-in/check-out endpoints
4. Add attendance history endpoints

### Phase 3: Timesheet Module
1. Create timesheet model & schema
2. Implement auto-generation from attendance
3. Add manual hours update
4. Implement approval workflow

### Phase 4: Project Management
1. Create project, board, task models
2. Implement project CRUD with auto-boards
3. Implement task CRUD
4. Add task move/reorder endpoints
5. Add comments

### Phase 5: Inventory Module
1. Create inventory models
2. Implement category CRUD
3. Implement item CRUD
4. Add stock in/out transactions
5. Add low-stock query

### Phase 6: Web Frontend (Next.js)
1. Set up Next.js with Tailwind
2. Implement auth pages (login)
3. Create dashboard layout
4. Build attendance page
5. Build timesheet page with approval
6. Build Kanban board (use @dnd-kit/core for drag-drop)
7. Build inventory management

### Phase 7: Mobile App (React Native)
1. Set up Expo project
2. Implement login screen
3. Build attendance screen with GPS
4. Add attendance history view

---

## Quick Start Commands

```bash
# Start everything
docker-compose up -d

# Run migrations
docker-compose exec backend alembic upgrade head

# Create first admin user (run in backend container)
docker-compose exec backend python -c "
from app.database import SessionLocal
from app.models.user import User, Role
from app.core.security import get_password_hash

db = SessionLocal()
admin_role = db.query(Role).filter(Role.name == 'super_admin').first()
admin = User(
    email='admin@example.com',
    password_hash=get_password_hash('admin123'),
    full_name='Admin User',
    role_id=admin_role.id
)
db.add(admin)
db.commit()
print('Admin created!')
"

# View logs
docker-compose logs -f backend

# Access API docs
open http://localhost:8000/docs
```

---

## Notes for Claude Code

1. **Start with backend** — Get API working first, test with Swagger
2. **Use Alembic** for all schema changes, don't modify DB directly
3. **Validate GPS** before allowing check-in/check-out
4. **Auto-create boards** when creating a project (4 fixed columns)
5. **Auto-generate timesheets** when user checks out
6. **Use Zustand** for state management in frontend
7. **Use @dnd-kit** for Kanban drag-and-drop in Next.js
8. **Use expo-location** for GPS in React Native

When in doubt, refer to this document for specifications!
