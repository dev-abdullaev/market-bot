import pytest
from decimal import Decimal
from model_bakery import baker
from apps.orders.models import Order, OrderItem, Customer

pytestmark = pytest.mark.django_db


def test_order_total_from_items():
    store = baker.make("stores.Store")
    order = Order.objects.create(store=store, customer_name="A", customer_phone="1")
    p = baker.make("catalog.Product", store=store, price=Decimal("5000"))
    OrderItem.objects.create(order=order, product=p, product_name="X",
                             price=Decimal("5000"), quantity=2,
                             line_total=Decimal("10000"))
    assert order.status == "new"
    assert order.items.count() == 1
    assert order.items.first().line_total == Decimal("10000")


def test_customer_unique_telegram_id():
    Customer.objects.create(telegram_id="42", full_name="A")
    with pytest.raises(Exception):
        Customer.objects.create(telegram_id="42", full_name="B")
