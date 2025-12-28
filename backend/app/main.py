from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.v1.router import api_router
from app.database import engine, Base
import app.models  # Import models to register them with Base

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    debug=settings.DEBUG,
    version="1.0.0",
    description="Team Management CRM API"
)

# CORS middleware
# Parse ALLOWED_ORIGINS from settings (comma-separated string to list)
allowed_origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",")] if hasattr(settings, 'ALLOWED_ORIGINS') and settings.ALLOWED_ORIGINS else ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "Team Management CRM API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# Create tables on startup
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
