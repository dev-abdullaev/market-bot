import pytest
from decimal import Decimal
from model_bakery import baker
from apps.notifications.orders import build_status_keyboard, target_chat_id

pytestmark = pytest.mark.django_db


def test_status_keyboard_has_four_status_buttons():
    kb = build_status_keyboard(order_id=42)
    flat = [b for row in kb["inline_keyboard"] for b in row]
    datas = {b["callback_data"] for b in flat}
    assert datas == {"ord:42:preparing", "ord:42:delivering",
                     "ord:42:delivered", "ord:42:cancelled"}


def test_target_chat_prefers_group_then_operator():
    store = baker.make("stores.Store", telegram_group_id="-100500")
    baker.make("accounts.User", role="operator", store=store, telegram_id="777")
    assert target_chat_id(store) == "-100500"
    store2 = baker.make("stores.Store", telegram_group_id="")
    baker.make("accounts.User", role="operator", store=store2, telegram_id="888")
    assert target_chat_id(store2) == "888"
