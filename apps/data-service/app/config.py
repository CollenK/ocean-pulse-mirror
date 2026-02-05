"""Configuration settings for the data service."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App settings
    app_name: str = "Ocean PULSE Data Service"
    debug: bool = False

    # CORS settings
    cors_origins: list[str] = [
        "http://localhost:3000",
        "https://ocean-pulse.vercel.app",
        "https://ocean-pulse-ochre.vercel.app",
    ]

    # Copernicus Marine Service
    copernicus_username: str = ""
    copernicus_password: str = ""

    # Protected Planet API
    protected_planet_api_token: str = ""

    # Supabase (for polygon updates)
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Pipeline API key (for protected endpoints)
    pipeline_api_key: str = ""

    # Cache settings (in seconds)
    cache_ttl_environmental: int = 3600  # 1 hour
    cache_ttl_species: int = 86400  # 24 hours

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
