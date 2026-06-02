from bot.config import Settings

def test_settings_reads_env(monkeypatch):
    monkeypatch.setenv("BOT_TOKEN", "123:ABC")
    monkeypatch.setenv("BACKEND_API_URL", "http://api/api")
    monkeypatch.setenv("BOT_SHARED_SECRET", "sec")
    monkeypatch.setenv("WEBAPP_URL", "https://app")
    s = Settings()
    assert s.bot_token == "123:ABC"
    assert s.backend_api_url == "http://api/api"
    assert s.bot_shared_secret == "sec"
    assert s.webapp_url == "https://app"
