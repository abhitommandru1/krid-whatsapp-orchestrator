from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongo_uri: str
    mongo_db_name: str = "krid_whatsapp"

    whatsapp_token: str
    whatsapp_phone_number_id: str
    whatsapp_verify_token: str
    whatsapp_app_secret: str = ""

    anthropic_api_key: str = ""

    port: int = 8000

    class Config:
        env_file = ".env"


settings = Settings()
