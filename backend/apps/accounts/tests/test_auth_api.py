import json
import pytest
from urllib.parse import urlencode
import hashlib, hmac
from rest_framework.test import APIClient
from apps.accounts.models import User

pytestmark = pytest.mark.django_db
BOT = "123:ABC"

def _init(user):
    data = {"auth_date": "1700000000", "user": json.dumps(user)}
    check = "\n".join(f"{k}={data[k]}" for k in sorted(data))
    secret = hmac.new(b"WebAppData", BOT.encode(), hashlib.sha256).digest()
    data["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode(data)

def test_login_returns_jwt():
    User.objects.create_user(username="998900000001", password="pass", role="operator")
    r = APIClient().post("/api/auth/login", {"username": "998900000001", "password": "pass"})
    assert r.status_code == 200
    assert "access" in r.json()

def test_me_requires_auth():
    assert APIClient().get("/api/auth/me").status_code == 401

def test_telegram_webapp_creates_user(settings):
    settings.TELEGRAM_BOT_TOKEN = BOT
    r = APIClient().post("/api/auth/telegram-webapp",
                         {"init_data": _init({"id": 777, "first_name": "Ali"})})
    assert r.status_code == 200
    assert "access" in r.json()
    assert User.objects.filter(telegram_id="777").exists()

def test_telegram_webapp_rejects_bad_signature(settings):
    settings.TELEGRAM_BOT_TOKEN = BOT
    r = APIClient().post("/api/auth/telegram-webapp", {"init_data": "user=%7B%7D&hash=bad"})
    assert r.status_code == 401
