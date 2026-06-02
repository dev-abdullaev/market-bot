import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from apps.stores.models import Store
from apps.catalog.models import Product
from apps.orders.models import Order

pytestmark = pytest.mark.django_db

def test_create_order_computes_total_from_db_prices():
    store = Store.objects.create(name="S", phone="1")
    p1 = Product.objects.create(store=store, name_ru="a", name_uz="a", price=Decimal("5000"))
    p2 = Product.objects.create(store=store, name_ru="b", name_uz="b", price=Decimal("3000"))
    payload = {
        "store": store.id,
        "customer_name": "Ali", "customer_phone": "998900000000",
        "delivery_address": "Tashkent",
        "items": [{"product": p1.id, "quantity": 2},
                  {"product": p2.id, "quantity": 1}],
    }
    r = APIClient().post("/api/orders", payload, format="json")
    assert r.status_code == 201
    order = Order.objects.get(id=r.json()["id"])
    assert order.total_amount == Decimal("13000")   # 2*5000 + 3000, server-side
    assert order.items.count() == 2
    assert order.items.first().price == Decimal("5000")  # snapshot

def test_create_order_rejects_foreign_product():
    store = Store.objects.create(name="S", phone="1")
    other = Store.objects.create(name="O", phone="2")
    foreign = Product.objects.create(store=other, name_ru="x", name_uz="x", price=1)
    payload = {"store": store.id, "customer_name": "A", "customer_phone": "1",
               "items": [{"product": foreign.id, "quantity": 1}]}
    r = APIClient().post("/api/orders", payload, format="json")
    assert r.status_code == 400
