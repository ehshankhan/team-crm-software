# Team Management CRM

A comprehensive Team Management CRM system with attendance tracking, timesheet management, project management (Kanban), and inventory management.

## Tech Stack

- **Backend**: FastAPI (Python 3.11)
- **Database**: PostgreSQL 15
- **Authentication**: JWT (access + refresh tokens)
- **ORM**: SQLAlchemy 2.0
- **Migrations**: Alembic
- **Container**: Docker + Docker Compose

## Features

1. **Authentication & User Management**
   - JWT-based authentication
   - Role-based access control (super_admin, manager, employee)
   - User CRUD operations

2. **Attendance Management** (Coming in Phase 2)
   - GPS-based check-in/check-out
   - 50-meter radius validation

3. **Timesheet Management** (Coming in Phase 3)
   - Auto-generated from attendance
   - Manual hour additions
   - Approval workflow

4. **Project Management - Kanban** (Coming in Phase 4)
   - Projects with members
   - Kanban boards with drag-and-drop
   - Task management with priorities

5. **Inventory Management** (Coming in Phase 5)
   - Lab components tracking
   - Stock in/out transactions
   - Low stock alerts

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Port 8000 and 5432 available

### Setup & Run

1. **Clone the repository** (or you're already in it)

2. **Start the services**

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- FastAPI backend on port 8000

3. **Run database migrations**

```bash
# Run migrations
docker-compose exec backend alembic upgrade head
```

4. **Seed the database**

```bash
# Create initial roles and admin user
docker-compose exec backend python seed.py
```

This creates:
- Three roles: super_admin, manager, employee
- Default admin user:
  - Email: `admin@example.com`
  - Password: `admin123`
  - **IMPORTANT**: Change this password in production!

5. **Access the API**

- API Documentation: http://localhost:8000/docs
- API Base URL: http://localhost:8000/api/v1
- Health Check: http://localhost:8000/health

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register new user (admin only)
- `POST /api/v1/auth/login` - Login and get tokens
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user info

### Users

- `GET /api/v1/users` - List all users (admin/manager)
- `GET /api/v1/users/{id}` - Get user by ID
- `POST /api/v1/users` - Create user (admin only)
- `PUT /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Deactivate user (admin only)

## Testing the API

1. **Login to get tokens**

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

2. **Use the access token for authenticated requests**

```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

3. **Or use the interactive Swagger UI at http://localhost:8000/docs**

## Development

### View Logs

```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Database only
docker-compose logs -f db
```

### Stop Services

```bash
docker-compose down
```

### Stop and Remove Data

```bash
docker-compose down -v
```

### Create New Migration

```bash
docker-compose exec backend alembic revision --autogenerate -m "Your migration message"
```

### Apply Migrations

```bash
docker-compose exec backend alembic upgrade head
```

### Rollback Migration

```bash
docker-compose exec backend alembic downgrade -1
```

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `DB_USER`, `DB_PASSWORD`, `DB_NAME` - Database credentials
- `JWT_SECRET` - Secret key for JWT tokens (change in production!)
- `LAB_LATITUDE`, `LAB_LONGITUDE` - Lab location for GPS validation
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Access token expiration (default: 30)
- `REFRESH_TOKEN_EXPIRE_DAYS` - Refresh token expiration (default: 7)

## Project Structure

```
team-crm-software/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py
│   │   │   └── v1/
│   │   │       ├── auth.py
│   │   │       ├── users.py
│   │   │       └── router.py
│   │   ├── core/
│   │   │   ├── security.py
│   │   │   └── permissions.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── attendance.py
│   │   │   ├── timesheet.py
│   │   │   ├── project.py
│   │   │   └── inventory.py
│   │   ├── schemas/
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── attendance.py
│   │   │   └── timesheet.py
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── alembic/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── seed.py
├── docker-compose.yml
├── .env
└── README.md
```

## Roles & Permissions

### Super Admin
- Full system access
- User management
- All CRUD operations

### Manager
- View team data
- Approve timesheets
- Manage projects
- Manage inventory

### Employee
- View own data
- Mark attendance
- View assigned projects
- Use inventory

## Next Steps

- **Phase 2**: Implement attendance module with GPS validation
- **Phase 3**: Implement timesheet module with auto-generation
- **Phase 4**: Implement project management with Kanban boards
- **Phase 5**: Implement inventory management
- **Phase 6**: Build web frontend (Next.js)
- **Phase 7**: Build mobile app (React Native)

## Support

For issues or questions, please refer to the IMPLEMENTATION_GUIDE.md file.
