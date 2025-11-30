from pydantic_settings import BaseSettings,SettingsConfigDict
from logging import DEBUG
from typing import Literal

class Settings(BaseSettings):
    """
    Nastavení aplikace načítané z .env souboru.
    Může obsahovat další informace navíc.
    """
    app_name: str = "Base Backend Application"
    version: str = "1.0.0"
    description: str = "Backend application with authentication and RBAC"
    logging_level: int = 40
    database_url: str = "sqlite:///./database.db"
    #Admin uživatel
    admin_name: str = "admin"
    admin_password: str = "admin123"
    admin_email: str = "admin@admin.com"
    #JWT nastavení
    secret_key: str = "your-secret-key"
    access_token_expire_minutes: int = 60 * 24  # 1 den
    algorithm: str = "HS256"

    # CORS nastavení
    allow_origins: list[str] = ["http://localhost:5173",  # Vite dev server
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000"]

    #Redis nastavení
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0

    #Email nastavení
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "App"

    #Nastavení Pydantic
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8',extra='ignore')

def get_settings() -> Settings:
    return Settings()
