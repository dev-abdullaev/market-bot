import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.stores.models import Store
from apps.orders.models import Order, OrderItem
from apps.catalog.models import Product
pytestmark = pytest.mark.django_db

def _op():
    s = Store.objects.create(name="S", phone="1")
    u = User.objects.create_user(username="op", role="operator", store=s)
    c = APIClient(); c.force_authenticate(user=u); return c, s

def test_stats_revenue_and_top_products():
    c, s = _op()
    p = Product.objects.create(store=s, name_ru="a", name_uz="Kola", price=Decimal("5000"))
    for _ in range(2):
        o = Order.objects.create(store=s, customer_name="x", customer_phone="1",
                                 status="delivered", total_amount=Decimal("10000"))
        OrderItem.objects.create(order=o, product=p, product_name="Kola",
                                 price=Decimal("5000"), quantity=2, line_total=Decimal("10000"))
    Order.objects.create(store=s, customer_name="y", customer_phone="2",
                         status="cancelled", total_amount=Decimal("99999"))
    r = c.get("/api/admin/stats?period=all")
    assert r.status_code == 200
    d = r.json()
    assert d["orders_count"] == 2            # cancelled excluded
    assert d["revenue"] == "20000.00"
    assert d["avg_check"] == "10000.00"
    assert d["top_products"][0]["name"] == "Kola"
    assert d["top_products"][0]["qty"] == 4

def test_stats_tenant_isolated():
    c, s = _op()
    other = Store.objects.create(name="O", phone="2")
    Order.objects.create(store=other, customer_name="z", customer_phone="3",
                         status="delivered", total_amount=Decimal("50000"))
    assert c.get("/api/admin/stats?period=all").json()["orders_count"] == 0
