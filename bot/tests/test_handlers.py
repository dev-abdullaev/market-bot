import pytest
from unittest.mock import AsyncMock, patch
from bot.handlers.orders import handle_status_callback

@pytest.mark.asyncio
async def test_status_callback_parses_and_calls_api():
    cb = AsyncMock()
    cb.data = "ord:42:preparing"
    cb.from_user.id = 777
    cb.message.edit_reply_markup = AsyncMock()
    with patch("bot.handlers.orders.set_order_status",
               new=AsyncMock(return_value={"ok": True, "customer_telegram_id": "555",
                                           "status": "preparing"})) as api, \
         patch("bot.handlers.orders.send_customer_note", new=AsyncMock()) as note:
        await handle_status_callback(cb)
    api.assert_awaited_once_with(telegram_id=777, order_id=42, status="preparing")
    cb.answer.assert_awaited()           # acknowledges the tap
    note.assert_awaited_once()           # customer notified

@pytest.mark.asyncio
async def test_status_callback_ignores_bad_data():
    cb = AsyncMock()
    cb.data = "garbage"
    with patch("bot.handlers.orders.set_order_status", new=AsyncMock()) as api:
        await handle_status_callback(cb)
    api.assert_not_awaited()
