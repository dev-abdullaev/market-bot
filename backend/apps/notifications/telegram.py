import logging
import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

API_BASE = "https://api.telegram.org/bot{token}/{method}"


def _call(method: str, payload: dict):
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        return None
    url = API_BASE.format(token=token, method=method)
    try:
        resp = httpx.post(url, json=payload, timeout=10)
        return resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("Telegram %s failed: %s", method, exc)
        return None


def send_message(chat_id, text: str, reply_markup: dict | None = None):
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    if reply_markup is not None:
        payload["reply_markup"] = reply_markup
    return _call("sendMessage", payload)


def edit_message_text(chat_id, message_id, text: str, reply_markup: dict | None = None):
    payload = {"chat_id": chat_id, "message_id": message_id, "text": text, "parse_mode": "HTML"}
    if reply_markup is not None:
        payload["reply_markup"] = reply_markup
    return _call("editMessageText", payload)
