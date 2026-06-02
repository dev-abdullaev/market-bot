import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.stores.models import Store
from apps.orders.models import Order, Customer
pytestmark = pytest.mark.django_db

def _op():
    s = Store.objects.create(name="S", phone="1")
    u = User.objects.create_user(username="op", role="operator", store=s)
    c = APIClient(); c.force_authenticate(user=u); return c, s

def test_clients_list_with_totals():
    c, s = _op()
    cust = Customer.objects.create(telegram_id="55", full_name="Ali", phone="998")
    Order.objects.create(store=s, customer=cust, customer_name="Ali", customer_phone="998",
                         status="delivered", total_amount=Decimal("10000"))
    Order.objects.create(store=s, customer=cust, customer_name="Ali", customer_phone="998",
                         status="delivered", total_amount=Decimal("5000"))
    data = c.get("/api/admin/customers").json()
    assert len(data) == 1
    assert data[0]["full_name"] == "Ali"
    assert data[0]["orders_count"] == 2
    assert data[0]["total_spent"] == "15000.00"

def test_clients_isolated():
    c, s = _op()
    other = Store.objects.create(name="O", phone="2")
    cust = Customer.objects.create(telegram_id="66", full_name="B")
    Order.objects.create(store=other, customer=cust, customer_name="B", customer_phone="1",
                         total_amount=Decimal("1"))
    assert c.get("/api/admin/customers").json() == []
