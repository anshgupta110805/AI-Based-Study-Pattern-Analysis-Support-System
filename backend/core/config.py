import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "NeuroStudy AI"
    PROJECT_VERSION: str = "2.0.0"
    SECRET_KEY: str = "f516d7a31b6c4832968374a2a19857d4" # Generate a real one for production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    DATABASE_URL: str = "sqlite:///./neurostudy_v2.db"
    
    # AI Engine Settings
    XP_PER_MINUTE: int = 10
    PRODUCTIVITY_BASELINE: int = 50

    class Config:
        env_file = ".env"

settings = Settings()
