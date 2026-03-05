import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./healthplus.db"
    OPENAI_API_KEY: str = ""
    USDA_API_KEY: str = ""
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    TOKEN_EXPIRY_DAYS: int = 7

    class Config:
        env_file = ".env"


settings = Settings()
