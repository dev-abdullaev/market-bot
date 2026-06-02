import pytest
from rest_framework.test import APIClient
from apps.stores.models import Store
from apps.catalog.models import Category, Product

pytestmark = pytest.mark.django_db

def test_public_shop_and_catalog():
    store = Store.objects.create(name="Shop", phone="1")
    cat = Category.objects.create(store=store, name_ru="a", name_uz="a")
    Product.objects.create(store=store, category=cat, name_ru="v", name_uz="v", price=1)
    Product.objects.create(store=store, category=cat, name_ru="hidden", name_uz="h",
                           price=1, is_hidden=True)
    Product.objects.create(store=store, category=cat, name_ru="oos", name_uz="o",
                           price=1, in_stock=False)
    c = APIClient()  # no auth
    assert c.get(f"/api/shop/{store.slug}").json()["name"] == "Shop"
    cat_data = c.get(f"/api/shop/{store.slug}/catalog").json()
    names = [p["name_uz"] for cc in cat_data["categories"] for p in cc["products"]]
    assert names == ["v"]      # hidden & out-of-stock excluded


def test_public_shop_does_not_leak_bot_token():
    """GET /api/shop/{slug} must NOT expose telegram credentials."""
    store = Store.objects.create(
        name="SecretShop",
        phone="2",
        telegram_bot_token="super-secret-token",
        telegram_group_id="-100123456",
    )
    c = APIClient()  # unauthenticated — AllowAny endpoint
    data = c.get(f"/api/shop/{store.slug}").json()
    assert "name" in data
    assert "slug" in data
    assert "telegram_bot_token" not in data, "bot token must NOT appear in public response"
    assert "telegram_group_id" not in data, "group id must NOT appear in public response"
