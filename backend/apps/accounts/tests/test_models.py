import pytest
from apps.accounts.models import User

pytestmark = pytest.mark.django_db


def test_create_user_with_phone():
    u = User.objects.create_user(username="998901112233", full_name="Ali", password="x")
    assert u.username == "998901112233"
    assert u.role == "customer"          # default
    assert u.check_password("x")


def test_create_operator_with_telegram_id():
    u = User.objects.create_user(username="998901112234", telegram_id="555",
                                 role="operator")
    assert u.role == "operator"
    assert u.telegram_id == "555"
