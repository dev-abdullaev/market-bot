from bot.keyboards import main_menu, webapp_ready
from bot.i18n import t

def test_main_menu_has_webapp_buttons():
    kb = main_menu("uz", webapp_url="https://app")
    texts = [b.text for row in kb.keyboard for b in row]
    assert any("Do'kon" in x or "Panel" in x for x in texts)
    # a web_app button must carry the url
    urls = [b.web_app.url for row in kb.keyboard for b in row if b.web_app]
    assert "https://app" in urls[0]

def test_main_menu_degrades_without_https():
    # http/empty url -> NO web_app buttons (Telegram rejects non-HTTPS WebApp URLs)
    for url in ("http://localhost:8091", ""):
        kb = main_menu("uz", webapp_url=url)
        webapp_btns = [b for row in kb.keyboard for b in row if b.web_app]
        assert webapp_btns == []
        # but the menu still renders the store/help buttons
        texts = [b.text for row in kb.keyboard for b in row]
        assert any("Do'kon" in x for x in texts)
        assert any("Yordam" in x for x in texts)

def test_webapp_ready():
    assert webapp_ready("https://x") is True
    assert webapp_ready("http://x") is False
    assert webapp_ready("") is False

def test_translation_fallback():
    assert t("uz", "help") != ""
    assert t("ru", "help") != ""
