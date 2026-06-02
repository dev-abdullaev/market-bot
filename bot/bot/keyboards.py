from aiogram.types import (ReplyKeyboardMarkup, KeyboardButton, WebAppInfo,
                           InlineKeyboardMarkup, InlineKeyboardButton)
from .i18n import t


def webapp_ready(url: str) -> bool:
    """Telegram only allows WebApp (mini-app) buttons over HTTPS."""
    return bool(url) and url.startswith("https://")


def main_menu(lang: str, webapp_url: str) -> ReplyKeyboardMarkup:
    """Main reply keyboard.

    With a public HTTPS ``webapp_url`` we attach Telegram WebApp buttons
    (open the mini-app in-chat). Otherwise we fall back to plain buttons so
    /start never fails with "Only HTTPS links are allowed" — the text
    handlers then reply with a regular link.
    """
    if webapp_ready(webapp_url):
        store_btn = KeyboardButton(text=t(lang, "menu_store"),
                                   web_app=WebAppInfo(url=webapp_url))
        add_btn = KeyboardButton(text=t(lang, "menu_add_product"),
                                 web_app=WebAppInfo(url=f"{webapp_url}/webapp/product"))
    else:
        store_btn = KeyboardButton(text=t(lang, "menu_store"))
        add_btn = KeyboardButton(text=t(lang, "menu_add_product"))
    return ReplyKeyboardMarkup(
        keyboard=[
            [store_btn],
            [add_btn],
            [KeyboardButton(text=t(lang, "menu_lang")),
             KeyboardButton(text=t(lang, "menu_help"))],
        ],
        resize_keyboard=True,
    )


def language_inline() -> InlineKeyboardMarkup:
    # Plain text (no flag/regional-indicator emojis): some Telegram clients
    # fail to render flag emojis and the button then appears empty.
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="O'zbekcha", callback_data="lang:uz"),
        InlineKeyboardButton(text="Русский", callback_data="lang:ru"),
    ]])
