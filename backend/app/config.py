from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:your_secure_password@db:5432/team_crm"

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Lab Location (for GPS validation)
    LAB_LATITUDE: float = 28.5398
    LAB_LONGITUDE: float = 77.1866
    LAB_RADIUS_METERS: int = 1000

    # App
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Team Management CRM"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001,https://team-crm-software.vercel.app"

    # Pydantic v2 configuration
    model_config = SettingsConfigDict(
        env_file=".env" if os.path.exists(".env") else None,
        env_file_encoding='utf-8',
        case_sensitive=True,
        extra='ignore'
    )


settings = Settings()
