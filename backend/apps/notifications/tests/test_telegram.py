import pytest
from unittest.mock import patch, MagicMock
from apps.notifications import telegram


def test_send_message_posts_to_telegram(settings):
    settings.TELEGRAM_BOT_TOKEN = "123:ABC"
    with patch("apps.notifications.telegram.httpx.post") as post:
        post.return_value = MagicMock(status_code=200, json=lambda: {"ok": True, "result": {"message_id": 7}})
        out = telegram.send_message("999", "hi", reply_markup={"inline_keyboard": []})
    assert post.called
    url = post.call_args[0][0]
    assert url == "https://api.telegram.org/bot123:ABC/sendMessage"
    payload = post.call_args[1]["json"]
    assert payload["chat_id"] == "999"
    assert payload["text"] == "hi"
    assert "reply_markup" in payload
    assert out == {"ok": True, "result": {"message_id": 7}}


def test_send_message_noop_without_token(settings):
    settings.TELEGRAM_BOT_TOKEN = ""
    with patch("apps.notifications.telegram.httpx.post") as post:
        out = telegram.send_message("999", "hi")
    assert not post.called
    assert out is None
