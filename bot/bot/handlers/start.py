from aiogram import Router, F
from aiogram.filters import CommandStart
from aiogram.types import Message, CallbackQuery
from ..config import settings
from ..keyboards import main_menu, language_inline, webapp_ready
from ..i18n import t

router = Router()
_lang = {}  # in-memory per-user language (MVP; persist later)

def _l(uid): return _lang.get(uid, "uz")

@router.message(CommandStart())
async def start(message: Message):
    lang = _l(message.from_user.id)
    await message.answer(t(lang, "welcome"),
                         reply_markup=main_menu(lang, settings.webapp_url))

# Fallback: when FRONTEND_WEBAPP_URL isn't HTTPS the store/add-product buttons
# are plain (no WebApp), so tapping them sends their text here and we reply with
# a regular link instead of Telegram rejecting a non-HTTPS WebApp button.
@router.message(F.text.contains("Do'kon") | F.text.contains("Магазин")
                | F.text.contains("Panel") | F.text.contains("Панель"))
async def store_link(message: Message):
    if webapp_ready(settings.webapp_url):
        return  # HTTPS WebApp buttons open directly; no text message is sent
    await message.answer(t(_l(message.from_user.id), "open_store_link",
                           url=settings.webapp_url or "—"))

@router.message(F.text.contains("Mahsulot") | F.text.contains("товар"))
async def product_link(message: Message):
    if webapp_ready(settings.webapp_url):
        return
    url = f"{settings.webapp_url}/webapp/product" if settings.webapp_url else "—"
    await message.answer(t(_l(message.from_user.id), "open_product_link", url=url))

@router.message(F.text.contains("Yordam") | F.text.contains("Помощь"))
async def help_handler(message: Message):
    await message.answer(t(_l(message.from_user.id), "help"))

@router.message(F.text.contains("Til") | F.text.contains("Язык"))
async def language(message: Message):
    await message.answer("🌐", reply_markup=language_inline())

@router.callback_query(F.data.startswith("lang:"))
async def set_language(callback: CallbackQuery):
    lang = callback.data.split(":")[1]
    _lang[callback.from_user.id] = lang
    await callback.answer(t(lang, "lang_set"))
    await callback.message.answer(t(lang, "welcome"),
                                  reply_markup=main_menu(lang, settings.webapp_url))
