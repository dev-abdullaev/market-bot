from bot.keyboards import main_menu
from bot.i18n import t

def test_main_menu_has_webapp_buttons():
    kb = main_menu("uz", webapp_url="https://app")
    texts = [b.text for row in kb.keyboard for b in row]
    assert any("Do'kon" in x or "Panel" in x for x in texts)
    # a web_app button must carry the url
    urls = [b.web_app.url for row in kb.keyboard for b in row if b.web_app]
    assert "https://app" in urls[0]

def test_translation_fallback():
    assert t("uz", "help") != ""
    assert t("ru", "help") != ""
