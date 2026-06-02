import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.stores.models import Store
from apps.orders.models import Order

pytestmark = pytest.mark.django_db

def _op(store):
    u = User.objects.create_user(username=f"op{store.id}", role="operator", store=store)
    c = APIClient(); c.force_authenticate(user=u)
    return c

def test_operator_lists_only_own_orders():
    a = Store.objects.create(name="A", phone="1")
    b = Store.objects.create(name="B", phone="2")
    Order.objects.create(store=a, customer_name="x", customer_phone="1")
    Order.objects.create(store=b, customer_name="y", customer_phone="2")
    assert len(_op(a).get("/api/admin/orders").json()) == 1

def test_operator_updates_status():
    a = Store.objects.create(name="A", phone="1")
    o = Order.objects.create(store=a, customer_name="x", customer_phone="1")
    r = _op(a).patch(f"/api/admin/orders/{o.id}/status", {"status": "preparing"},
                     format="json")
    assert r.status_code == 200
    o.refresh_from_db()
    assert o.status == "preparing"

def test_operator_cannot_update_other_store_order():
    a = Store.objects.create(name="A", phone="1")
    b = Store.objects.create(name="B", phone="2")
    o = Order.objects.create(store=b, customer_name="x", customer_phone="1")
    assert _op(a).patch(f"/api/admin/orders/{o.id}/status",
                        {"status": "preparing"}, format="json").status_code == 404

def test_invalid_status_rejected():
    a = Store.objects.create(name="A", phone="1")
    o = Order.objects.create(store=a, customer_name="x", customer_phone="1")
    assert _op(a).patch(f"/api/admin/orders/{o.id}/status",
                        {"status": "bogus"}, format="json").status_code == 400
