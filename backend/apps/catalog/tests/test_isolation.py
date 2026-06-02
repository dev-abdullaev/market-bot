import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.stores.models import Store
from apps.catalog.models import Category, Product

pytestmark = pytest.mark.django_db

def test_operator_cannot_see_other_store_products():
    store_a = Store.objects.create(name="A", phone="1")
    store_b = Store.objects.create(name="B", phone="2")
    Product.objects.create(store=store_b, name_ru="x", name_uz="x", price=1)
    op_a = User.objects.create_user(username="opa", role="operator", store=store_a)
    c = APIClient(); c.force_authenticate(user=op_a)
    assert c.get("/api/products").json() == []

def test_operator_cannot_edit_other_store_product():
    store_a = Store.objects.create(name="A", phone="1")
    store_b = Store.objects.create(name="B", phone="2")
    p_b = Product.objects.create(store=store_b, name_ru="x", name_uz="x", price=1)
    op_a = User.objects.create_user(username="opa", role="operator", store=store_a)
    c = APIClient(); c.force_authenticate(user=op_a)
    assert c.patch(f"/api/products/{p_b.id}", {"price": "999"}, format="json").status_code == 404
