import hashlib
import hmac
import json
from urllib.parse import parse_qsl

def parse_init_data(init_data: str, bot_token: str):
    """Validate Telegram WebApp initData. Returns the user dict or None."""
    # Fix 1: fail closed when bot_token is unset — an empty token makes the
    # HMAC key fully public, allowing any attacker to forge a valid signature.
    if not bot_token:
        return None
    try:
        pairs = dict(parse_qsl(init_data, strict_parsing=False))
    except ValueError:
        return None
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        return None
    check_string = "\n".join(f"{k}={pairs[k]}" for k in sorted(pairs))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received_hash):
        return None
    # Fix 2: honour the "user dict or None" contract — an absent/empty user
    # field must return None (not {}) so callers can rely on truthiness checks.
    try:
        user = json.loads(pairs.get("user", "{}"))
    except json.JSONDecodeError:
        return None
    return user if user else None
