from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/anime_db"
    SECRET_KEY: str = "change-this-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Iyzico — empty = mock mode (no real API calls)
    IYZICO_API_KEY: str = ""
    IYZICO_SECRET_KEY: str = ""
    # NOTE: iyzipay SDK uses HTTPSConnection which expects bare hostname (no https://)
    IYZICO_BASE_URL: str = "sandbox-api.iyzipay.com"

    # URLs used in payment callback redirect
    # Set CALLBACK_URL to wherever /api/payments/callback is reachable by Iyzico's servers
    # (for local dev with Iyzico: use ngrok/cloudflare tunnel and set this to the tunnel URL)
    CALLBACK_URL: str = "http://localhost:8000/api/payments/callback"
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
