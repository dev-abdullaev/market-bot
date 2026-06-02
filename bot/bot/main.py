import asyncio
import logging
from aiogram import Bot, Dispatcher
from .config import settings
from .handlers import start, orders

async def main():
    logging.basicConfig(level=logging.INFO)
    bot = Bot(token=settings.bot_token)
    dp = Dispatcher()
    dp.include_router(start.router)
    dp.include_router(orders.router)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
