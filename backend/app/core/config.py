from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    DATABASE_URL: str = ""
    SECRET_KEY: str = ""
    ADMIN_INITIAL_PASSWORD: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 saat
    FILES_DIR: str = os.path.join(os.path.expanduser("~"), "MedArchivePro", "files")
    MAX_UPLOAD_MB: int = 500
    APP_NAME: str = "MedArchive Pro"
    VERSION: str = "1.0.0"

    class Config:
        env_file = ".env"

settings = Settings()
