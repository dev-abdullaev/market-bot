import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    def __init__(self):
        self.bot_token = os.getenv("BOT_TOKEN", "")
        self.backend_api_url = os.getenv("BACKEND_API_URL", "http://localhost:8000/api")
        self.bot_shared_secret = os.getenv("BOT_SHARED_SECRET", "")
        self.webapp_url = os.getenv("WEBAPP_URL", "")

settings = Settings()
