from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Telegram
    telegram_bot_token: str
    intel_channel_id: str
    community_group_id: str

    # AI Models
    anthropic_api_key: str
    deepseek_api_key: str = ""
    groq_api_key: str = ""
    gemini_api_key: str = ""
    cerebras_api_key: str = ""
    openrouter_api_key: str = ""
    together_api_key: str = ""

    # Data
    coingecko_api_key: str = ""
    taostats_api_key: str = ""

    # Schedule
    timezone: str = "UTC"
    daily_brief_hour: int = 6
    daily_brief_minute: int = 0

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
