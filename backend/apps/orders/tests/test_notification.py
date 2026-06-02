import pytest
from decimal import Decimal
from unittest.mock import patch
from rest_framework.test import APIClient
from apps.stores.models import Store
from apps.catalog.models import Product
from apps.orders.models import Customer, Order

pytestmark = pytest.mark.django_db


def test_order_create_links_customer_and_notifies():
    store = Store.objects.create(name="S", phone="1")
    p = Product.objects.create(store=store, name_ru="a", name_uz="a", price=Decimal("5000"))
    payload = {"store": store.id, "customer_name": "Ali", "customer_phone": "998900000000",
               "telegram_id": "12345", "items": [{"product": p.id, "quantity": 1}]}
    with patch("apps.orders.serializers.notify_new_order") as notify:
        r = APIClient().post("/api/orders", payload, format="json")
    assert r.status_code == 201
    order = Order.objects.get(id=r.json()["id"])
    assert Customer.objects.filter(telegram_id="12345").exists()
    assert order.customer.telegram_id == "12345"
    notify.assert_called_once()
