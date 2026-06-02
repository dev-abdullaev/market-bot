import pytest
from unittest.mock import patch
from decimal import Decimal
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.stores.models import Store
from apps.orders.models import Order, Customer
pytestmark = pytest.mark.django_db

def test_broadcast_sends_to_store_customers():
    s = Store.objects.create(name="S", phone="1")
    u = User.objects.create_user(username="op", role="operator", store=s)
    c1 = Customer.objects.create(telegram_id="11", full_name="A")
    c2 = Customer.objects.create(telegram_id="22", full_name="B")
    Order.objects.create(store=s, customer=c1, customer_name="A", customer_phone="1", total_amount=Decimal("1"))
    Order.objects.create(store=s, customer=c2, customer_name="B", customer_phone="2", total_amount=Decimal("1"))
    client = APIClient(); client.force_authenticate(user=u)
    with patch("apps.orders.views.broadcast_to_customers", return_value=2) as bc:
        r = client.post("/api/admin/broadcast", {"text": "Aksiya!"}, format="json")
    assert r.status_code == 200
    assert r.json()["sent"] == 2
    bc.assert_called_once()

def test_broadcast_requires_text():
    s = Store.objects.create(name="S", phone="1")
    u = User.objects.create_user(username="op", role="operator", store=s)
    client = APIClient(); client.force_authenticate(user=u)
    assert client.post("/api/admin/broadcast", {"text": ""}, format="json").status_code == 400
