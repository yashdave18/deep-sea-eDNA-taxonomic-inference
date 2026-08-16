from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_JWT_SECRET: str

    # Max upload size in bytes (default 10 MB)
    MAX_UPLOAD_BYTES: int = 10 * 1024 * 1024

    class Config:
        env_file = ".env"


settings = Settings()