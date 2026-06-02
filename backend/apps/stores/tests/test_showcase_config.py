"""Tests for showcase_config field on Store.

Covers:
- PATCH /api/stores/me persists showcase_config and GET returns it
- GET /api/shop/{slug} (public) includes showcase_config
- GET /api/shop/{slug} still does NOT expose telegram_bot_token or telegram_group_id
"""
import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.stores.models import Store

pytestmark = pytest.mark.django_db

SAMPLE_CONFIG = {
    "blocks": [
        {
            "id": "b1",
            "type": "grid_2_3",
            "title": "Mashhur",
            "slots": [1, 2, None],
        }
    ],
    "menu_visible": True,
    "showcase_visible": True,
    "hide_bg": False,
    "menu_icons": {
        "showcase": "\U0001f6cd️",
        "catalog": "\U0001f4cb",
        "favorites": "❤️",
        "cart": "\U0001f6d2",
    },
}


def _operator_client(store):
    user = User.objects.create_user(
        username=f"op_{store.pk}", role="operator", store=store
    )
    c = APIClient()
    c.force_authenticate(user=user)
    return c


class TestShowcaseConfigOperatorEndpoint:
    def test_patch_persists_showcase_config(self):
        store = Store.objects.create(name="TestStore", phone="1")
        c = _operator_client(store)

        r = c.patch(
            "/api/stores/me",
            {"showcase_config": SAMPLE_CONFIG},
            format="json",
        )
        assert r.status_code == 200

        store.refresh_from_db()
        assert store.showcase_config == SAMPLE_CONFIG

    def test_get_returns_showcase_config(self):
        store = Store.objects.create(
            name="TestStore2", phone="2", showcase_config=SAMPLE_CONFIG
        )
        c = _operator_client(store)

        r = c.get("/api/stores/me")
        assert r.status_code == 200
        assert r.json()["showcase_config"] == SAMPLE_CONFIG

    def test_patch_then_get_round_trip(self):
        store = Store.objects.create(name="RoundTrip", phone="3")
        c = _operator_client(store)

        c.patch("/api/stores/me", {"showcase_config": SAMPLE_CONFIG}, format="json")
        body = c.get("/api/stores/me").json()
        assert body["showcase_config"] == SAMPLE_CONFIG

    def test_patch_with_empty_dict_clears_config(self):
        store = Store.objects.create(
            name="ClearConfig", phone="4", showcase_config=SAMPLE_CONFIG
        )
        c = _operator_client(store)

        r = c.patch("/api/stores/me", {"showcase_config": {}}, format="json")
        assert r.status_code == 200
        store.refresh_from_db()
        assert store.showcase_config == {}


class TestShowcaseConfigPublicEndpoint:
    def test_public_shop_includes_showcase_config(self):
        store = Store.objects.create(
            name="PublicShop", phone="5", showcase_config=SAMPLE_CONFIG
        )
        c = APIClient()  # no auth

        data = c.get(f"/api/shop/{store.slug}").json()
        assert "showcase_config" in data
        assert data["showcase_config"] == SAMPLE_CONFIG

    def test_public_shop_still_hides_bot_token(self):
        store = Store.objects.create(
            name="SecretPublic",
            phone="6",
            telegram_bot_token="super-secret-token",
            telegram_group_id="-100999",
            showcase_config=SAMPLE_CONFIG,
        )
        c = APIClient()

        data = c.get(f"/api/shop/{store.slug}").json()
        assert "showcase_config" in data, "showcase_config must be present in public response"
        assert "telegram_bot_token" not in data, "bot token must NOT appear in public response"
        assert "telegram_group_id" not in data, "group id must NOT appear in public response"

    def test_public_shop_default_empty_showcase_config(self):
        store = Store.objects.create(name="DefaultCfg", phone="7")
        c = APIClient()

        data = c.get(f"/api/shop/{store.slug}").json()
        assert "showcase_config" in data
        assert data["showcase_config"] == {}
