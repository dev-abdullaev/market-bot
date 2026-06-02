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


def _build_init_data_no_user(token: str) -> str:
    """Build a validly-signed payload that has NO user field."""
    data = {"auth_date": "1700000000"}
    check = "\n".join(f"{k}={data[k]}" for k in sorted(data))
    secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    data["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode(data)


def _build_init_data_with_empty_token(user: dict) -> str:
    """Build a payload signed with an empty bot token."""
    data = {"auth_date": "1700000000", "user": json.dumps(user)}
    check = "\n".join(f"{k}={data[k]}" for k in sorted(data))
    secret = hmac.new(b"WebAppData", b"", hashlib.sha256).digest()
    data["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode(data)


def test_valid_init_data_returns_user():
    init = _build_init_data({"id": 555, "first_name": "Ali"})
    user = parse_init_data(init, BOT_TOKEN)
    assert user["id"] == 555

def test_tampered_init_data_returns_none():
    init = _build_init_data({"id": 555}) + "&extra=1"
    assert parse_init_data(init, BOT_TOKEN) is None


# Fix 1: empty bot_token must always return None (fail closed)
def test_empty_bot_token_returns_none():
    """An initData signed with an empty token must be rejected even if the
    HMAC would verify — the token being absent/empty means the secret is
    fully public and the signature is forgeable."""
    init = _build_init_data_with_empty_token({"id": 999})
    assert parse_init_data(init, "") is None


# Fix 2: valid signature but no user field must return None (not {})
def test_valid_signature_no_user_returns_none():
    """A correctly-signed payload with no user field must return None so
    callers can rely on the 'user dict or None' contract."""
    init = _build_init_data_no_user(BOT_TOKEN)
    assert parse_init_data(init, BOT_TOKEN) is None
