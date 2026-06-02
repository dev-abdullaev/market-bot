import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.stores.models import Store
pytestmark = pytest.mark.django_db

def test_patch_extended_settings():
    store = Store.objects.create(name="S", phone="1")
    user = User.objects.create_user(username="op", role="operator", store=store)
    c = APIClient(); c.force_authenticate(user=user)
    r = c.patch("/api/stores/me", {
        "open_time": "09:00", "close_time": "22:00",
        "delivery_pricing_mode": "fixed", "delivery_fixed_price": "10000",
        "minimum_order_amount": "20000", "service_fee": "1500",
        "cash_enabled": True, "card_enabled": True, "card_number": "8600 1234",
        "payme_enabled": True, "payme_merchant_id": "abc", "click_url": "https://click",
        "msg_new": "Buyurtmangiz qabul qilindi", "ui_primary_color": "#ff0000",
        "ui_theme": "classic", "menu_view_mode": "grid_categories",
        "support_username": "@help",
    }, format="json")
    assert r.status_code == 200
    store.refresh_from_db()
    assert store.open_time == "09:00"
    assert store.delivery_pricing_mode == "fixed"
    assert str(store.delivery_fixed_price) == "10000.00"
    assert store.payme_enabled is True
    assert store.msg_new == "Buyurtmangiz qabul qilindi"

def test_settings_response_hides_bot_token():
    store = Store.objects.create(name="S", phone="1", telegram_bot_token="SECRET")
    user = User.objects.create_user(username="op", role="operator", store=store)
    c = APIClient(); c.force_authenticate(user=user)
    body = c.get("/api/stores/me").json()
    assert "telegram_bot_token" not in body or body.get("telegram_bot_token") in (None, "")
