import logging

import httpx

from .config import Settings

logger = logging.getLogger(__name__)

async def set_order_status(telegram_id: str, order_id: int, status: str):
    cfg = Settings()
    url = f"{cfg.backend_api_url}/bot/order-status"
    headers = {"X-Bot-Secret": cfg.bot_shared_secret}
    payload = {"telegram_id": str(telegram_id), "order_id": order_id, "status": status}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload, headers=headers)
    except httpx.HTTPError as exc:
        # Transport failure (DNS, connection refused, timeout) — degrade gracefully
        # so the handler shows the "error" alert instead of crashing.
        logger.warning("order-status call failed: %s", exc)
        return None
    return resp.json() if resp.status_code == 200 else None
