from aiogram.types import (ReplyKeyboardMarkup, KeyboardButton, WebAppInfo,
                           InlineKeyboardMarkup, InlineKeyboardButton)
from .i18n import t

def main_menu(lang: str, webapp_url: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=t(lang, "menu_store"),
                            web_app=WebAppInfo(url=webapp_url))],
            [KeyboardButton(text=t(lang, "menu_add_product"),
                            web_app=WebAppInfo(url=f"{webapp_url}/webapp/product"))],
            [KeyboardButton(text=t(lang, "menu_lang")),
             KeyboardButton(text=t(lang, "menu_help"))],
        ],
        resize_keyboard=True,
    )

def language_inline() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="🇺🇿 O'zbekcha", callback_data="lang:uz"),
        InlineKeyboardButton(text="🇷🇺 Русский", callback_data="lang:ru"),
    ]])
