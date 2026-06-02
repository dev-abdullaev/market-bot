import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.stores.models import Store

pytestmark = pytest.mark.django_db

def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c

def test_create_store_links_operator():
    user = User.objects.create_user(username="998900000002", role="customer")
    c = _auth(user)
    r = c.post("/api/stores", {"name": "Ali Shop", "phone": "998900000002",
                               "activity_type": "market"}, format="json")
    assert r.status_code == 201
    store = Store.objects.get(name="Ali Shop")
    user.refresh_from_db()
    assert user.store_id == store.id
    assert user.role == "operator"

def test_stores_me_returns_own_store():
    store = Store.objects.create(name="S", phone="1")
    user = User.objects.create_user(username="998900000003", role="operator", store=store)
    r = _auth(user).get("/api/stores/me")
    assert r.status_code == 200
    assert r.json()["slug"] == store.slug


# Fix 3: block store re-registration
def test_create_store_rejects_if_already_has_store():
    """A user who already owns a store must get HTTP 400 on POST /api/stores;
    no second Store row must be created."""
    existing_store = Store.objects.create(name="First Shop", phone="998900000004")
    user = User.objects.create_user(
        username="998900000004", role="operator", store=existing_store
    )
    c = _auth(user)
    store_count_before = Store.objects.count()
    r = c.post(
        "/api/stores",
        {"name": "Second Shop", "phone": "998900000004", "activity_type": "market"},
        format="json",
    )
    assert r.status_code == 400
    assert "detail" in r.json()
    assert Store.objects.count() == store_count_before
