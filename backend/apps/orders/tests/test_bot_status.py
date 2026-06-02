import pytest
from unittest.mock import patch
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.stores.models import Store
from apps.orders.models import Customer, Order

pytestmark = pytest.mark.django_db
SECRET = "s3cr3t"


def _setup():
    store = Store.objects.create(name="S", phone="1")
    User.objects.create_user(username="op", role="operator", store=store, telegram_id="777")
    cust = Customer.objects.create(telegram_id="555", full_name="C")
    order = Order.objects.create(store=store, customer=cust, customer_name="C",
                                 customer_phone="1")
    return store, order


def test_bot_status_updates_and_returns_customer(settings):
    settings.BOT_SHARED_SECRET = SECRET
    store, order = _setup()
    with patch("apps.orders.views.send_message") as send:
        r = APIClient().post("/api/bot/order-status",
                             {"telegram_id": "777", "order_id": order.id, "status": "preparing"},
                             format="json", HTTP_X_BOT_SECRET=SECRET)
    assert r.status_code == 200
    order.refresh_from_db()
    assert order.status == "preparing"
    assert r.json()["customer_telegram_id"] == "555"
    send.assert_called_once()   # customer notified


def test_bot_status_rejects_bad_secret(settings):
    settings.BOT_SHARED_SECRET = SECRET
    store, order = _setup()
    r = APIClient().post("/api/bot/order-status",
                         {"telegram_id": "777", "order_id": order.id, "status": "preparing"},
                         format="json", HTTP_X_BOT_SECRET="wrong")
    assert r.status_code == 403


def test_bot_status_rejects_non_owner(settings):
    settings.BOT_SHARED_SECRET = SECRET
    store, order = _setup()
    other = Store.objects.create(name="O", phone="2")
    User.objects.create_user(username="op2", role="operator", store=other, telegram_id="999")
    r = APIClient().post("/api/bot/order-status",
                         {"telegram_id": "999", "order_id": order.id, "status": "preparing"},
                         format="json", HTTP_X_BOT_SECRET=SECRET)
    assert r.status_code == 404


def test_bot_status_rejects_invalid_status(settings):
    settings.BOT_SHARED_SECRET = SECRET
    store, order = _setup()
    r = APIClient().post("/api/bot/order-status",
                         {"telegram_id": "777", "order_id": order.id, "status": "bogus"},
                         format="json", HTTP_X_BOT_SECRET=SECRET)
    assert r.status_code == 400


def test_bot_status_returns_200_when_send_message_raises(settings):
    """A Telegram failure must never 500 the bot after the DB change took effect (Fix 1)."""
    settings.BOT_SHARED_SECRET = SECRET
    store, order = _setup()
    with patch("apps.orders.views.send_message", side_effect=Exception("telegram down")):
        r = APIClient().post("/api/bot/order-status",
                             {"telegram_id": "777", "order_id": order.id, "status": "preparing"},
                             format="json", HTTP_X_BOT_SECRET=SECRET)
    assert r.status_code == 200
    order.refresh_from_db()
    assert order.status == "preparing"
