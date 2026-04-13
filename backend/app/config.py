from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost/card_vault"
    secret_key: str = "change-me-in-production-use-a-long-random-string"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    upload_dir: str = "/app/uploads"
    # Kommagetrennte Origins, z.B. "http://192.168.1.100:7842,http://localhost:7842"
    # Oder "*" für lokalen Test (niemals in Produktion!)
    cors_origins: str = "http://localhost:7842"
    anthropic_api_key: str = ""

    model_config = {"env_file": ".env"}


settings = Settings()
