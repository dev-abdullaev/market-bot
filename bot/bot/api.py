import httpx
from .config import Settings

async def set_order_status(telegram_id: str, order_id: int, status: str):
    cfg = Settings()
    url = f"{cfg.backend_api_url}/bot/order-status"
    headers = {"X-Bot-Secret": cfg.bot_shared_secret}
    payload = {"telegram_id": str(telegram_id), "order_id": order_id, "status": status}
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(url, json=payload, headers=headers)
        return resp.json() if resp.status_code == 200 else None
