STRINGS = {
    "uz": {
        "welcome": "👋 Xush kelibsiz! Do'kon ochish yoki panelга kirish uchun tugmani bosing.",
        "menu_store": "🏪 Do'kon / Panel",
        "menu_add_product": "➕ Mahsulot qo'shish",
        "menu_lang": "🌐 Til",
        "menu_help": "🆘 Yordam",
        "help": "Savollar uchun admin bilan bog'laning. /start — boshlash.",
        "lang_set": "✅ Til o'zgartirildi.",
        "status_updated": "✅ Holat yangilandi: {status}",
        "open_store_link": "🏪 Do'kon / panelni shu havoladan oching:\n{url}",
        "open_product_link": "➕ Mahsulot qo'shish:\n{url}",
    },
    "ru": {
        "welcome": "👋 Добро пожаловать! Нажмите кнопку, чтобы открыть магазин или панель.",
        "menu_store": "🏪 Магазин / Панель",
        "menu_add_product": "➕ Добавить товар",
        "menu_lang": "🌐 Язык",
        "menu_help": "🆘 Помощь",
        "help": "По вопросам обращайтесь к админу. /start — начать.",
        "lang_set": "✅ Язык изменён.",
        "status_updated": "✅ Статус обновлён: {status}",
        "open_store_link": "🏪 Откройте магазин / панель по ссылке:\n{url}",
        "open_product_link": "➕ Добавить товар:\n{url}",
    },
}

def t(lang: str, key: str, **kwargs) -> str:
    lang = lang if lang in STRINGS else "uz"
    s = STRINGS[lang].get(key) or STRINGS["uz"].get(key, "")
    return s.format(**kwargs) if kwargs else s
