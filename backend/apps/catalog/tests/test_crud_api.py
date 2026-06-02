import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.stores.models import Store
from apps.catalog.models import Category, Product

pytestmark = pytest.mark.django_db

def _operator():
    store = Store.objects.create(name="S", phone="1")
    user = User.objects.create_user(username="op", role="operator", store=store)
    c = APIClient(); c.force_authenticate(user=user)
    return c, store

def test_create_category():
    c, store = _operator()
    r = c.post("/api/categories", {"name_ru": "Напитки", "name_uz": "Ichimliklar"},
               format="json")
    assert r.status_code == 201
    assert Category.objects.filter(store=store, name_uz="Ichimliklar").exists()

def test_create_and_list_product():
    c, store = _operator()
    cat = Category.objects.create(store=store, name_ru="a", name_uz="a")
    r = c.post("/api/products", {"name_ru": "Кола", "name_uz": "Kola",
                                 "price": "12000", "category": cat.id}, format="json")
    assert r.status_code == 201
    lst = c.get("/api/products").json()
    assert len(lst) == 1
    assert lst[0]["name_uz"] == "Kola"
