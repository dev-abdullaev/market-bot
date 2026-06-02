import hashlib, hmac, json
from urllib.parse import urlencode
from apps.accounts.telegram import parse_init_data

BOT_TOKEN = "123:ABC"

def _build_init_data(user: dict) -> str:
    data = {"auth_date": "1700000000", "user": json.dumps(user)}
    check = "\n".join(f"{k}={data[k]}" for k in sorted(data))
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    data["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode(data)

def test_valid_init_data_returns_user():
    init = _build_init_data({"id": 555, "first_name": "Ali"})
    user = parse_init_data(init, BOT_TOKEN)
    assert user["id"] == 555

def test_tampered_init_data_returns_none():
    init = _build_init_data({"id": 555}) + "&extra=1"
    assert parse_init_data(init, BOT_TOKEN) is None
