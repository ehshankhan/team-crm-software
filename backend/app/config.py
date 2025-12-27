from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:your_secure_password@db:5432/team_crm"

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Lab Location (for GPS validation)
    LAB_LATITUDE: float = 28.544396761789827
    LAB_LONGITUDE: float = 77.19271651688473
    LAB_RADIUS_METERS: int = 200

    # App
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Team Management CRM"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
