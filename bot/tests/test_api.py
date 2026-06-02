import pytest
from unittest.mock import patch, MagicMock
from bot.api import set_order_status

@pytest.mark.asyncio
async def test_set_order_status_calls_backend(monkeypatch):
    monkeypatch.setenv("BACKEND_API_URL", "http://api/api")
    monkeypatch.setenv("BOT_SHARED_SECRET", "sec")
    fake = MagicMock(status_code=200, json=lambda: {"ok": True, "customer_telegram_id": "555", "status": "preparing"})
    class FakeClient:
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, url, json, headers):
            assert url == "http://api/api/bot/order-status"
            assert headers["X-Bot-Secret"] == "sec"
            assert json == {"telegram_id": "777", "order_id": 42, "status": "preparing"}
            return fake
    with patch("bot.api.httpx.AsyncClient", return_value=FakeClient()):
        out = await set_order_status(telegram_id="777", order_id=42, status="preparing")
    assert out["customer_telegram_id"] == "555"
