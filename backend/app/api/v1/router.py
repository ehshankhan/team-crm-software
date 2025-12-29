from fastapi import APIRouter
from app.api.v1 import auth, users, attendance, timesheets, projects, boards, tasks, inventory, dashboard, daily_logs, procurement

api_router = APIRouter()

# Include all routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["Attendance"])
api_router.include_router(timesheets.router, prefix="/timesheets", tags=["Timesheets"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(boards.router, prefix="/boards", tags=["Boards"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(daily_logs.router, prefix="/daily-logs", tags=["Daily Logs"])
api_router.include_router(procurement.router, prefix="/procurement", tags=["Procurement"])
