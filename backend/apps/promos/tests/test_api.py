import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.stores.models import Store
from apps.promos.models import PromoCode
pytestmark = pytest.mark.django_db

def _op(store):
    u = User.objects.create_user(username=f"op{store.id}", role="operator", store=store)
    c = APIClient(); c.force_authenticate(user=u); return c

def test_create_and_list_promo():
    s = Store.objects.create(name="S", phone="1")
    c = _op(s)
    r = c.post("/api/promos", {"code": "SALE10", "discount_type": "percent",
                               "discount_value": "10"}, format="json")
    assert r.status_code == 201
    assert c.get("/api/promos").json()[0]["code"] == "SALE10"

def test_promo_tenant_isolated():
    a = Store.objects.create(name="A", phone="1")
    b = Store.objects.create(name="B", phone="2")
    PromoCode.objects.create(store=b, code="X", discount_type="fixed", discount_value=1)
    assert _op(a).get("/api/promos").json() == []
