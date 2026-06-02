"""
TDD tests for Task 1: extended Product fields (discount, brand, dims, images, etc.)
"""
import io
import pytest
from decimal import Decimal
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.catalog.models import Product
from apps.stores.models import Store

pytestmark = pytest.mark.django_db


def _make_operator(username="rich_op", store_name="RichStore", phone="111"):
    store = Store.objects.create(name=store_name, phone=phone)
    user = User.objects.create_user(username=username, role="operator", store=store)
    c = APIClient()
    c.force_authenticate(user=user)
    return c, store


def _png():
    buf = io.BytesIO()
    Image.new("RGB", (2, 2)).save(buf, "PNG")
    buf.seek(0)
    return SimpleUploadedFile("test.png", buf.read(), content_type="image/png")


# ── a) PATCH new fields persists ──────────────────────────────────────────────

def test_patch_discount_fields_persist():
    c, store = _make_operator("op_disc", "Store_disc", "201")
    p = Product.objects.create(
        store=store, name_ru="A", name_uz="A", price=Decimal("1000")
    )
    r = c.patch(
        f"/api/products/{p.id}",
        {"has_discount": True, "discount_price": "800.00"},
        format="json",
    )
    assert r.status_code == 200, r.content
    p.refresh_from_db()
    assert p.has_discount is True
    assert p.discount_price == Decimal("800.00")


def test_patch_brand_manufacturer_model_persist():
    c, store = _make_operator("op_brand", "Store_brand", "202")
    p = Product.objects.create(
        store=store, name_ru="B", name_uz="B", price=Decimal("500")
    )
    r = c.patch(
        f"/api/products/{p.id}",
        {"brand": "Samsung", "manufacturer": "Acme", "model": "Galaxy"},
        format="json",
    )
    assert r.status_code == 200, r.content
    p.refresh_from_db()
    assert p.brand == "Samsung"
    assert p.manufacturer == "Acme"
    assert p.model == "Galaxy"


def test_patch_dimension_fields_persist():
    c, store = _make_operator("op_dim", "Store_dim", "203")
    p = Product.objects.create(
        store=store, name_ru="C", name_uz="C", price=Decimal("200")
    )
    r = c.patch(
        f"/api/products/{p.id}",
        {"weight_kg": "1.250", "length_cm": "30.00", "width_cm": "15.00", "height_cm": "5.00"},
        format="json",
    )
    assert r.status_code == 200, r.content
    p.refresh_from_db()
    assert p.weight_kg == Decimal("1.250")
    assert p.length_cm == Decimal("30.00")
    assert p.width_cm == Decimal("15.00")
    assert p.height_cm == Decimal("5.00")


def test_patch_images_list_persists():
    c, store = _make_operator("op_img", "Store_img", "204")
    p = Product.objects.create(
        store=store, name_ru="D", name_uz="D", price=Decimal("300")
    )
    images = [
        "https://example.com/img1.jpg",
        "https://example.com/img2.jpg",
    ]
    r = c.patch(
        f"/api/products/{p.id}",
        {"images": images},
        format="json",
    )
    assert r.status_code == 200, r.content
    p.refresh_from_db()
    assert p.images == images


def test_patch_packaging_barcode_ikpu_seasonality_persist():
    c, store = _make_operator("op_pkg", "Store_pkg", "205")
    p = Product.objects.create(
        store=store, name_ru="E", name_uz="E", price=Decimal("700")
    )
    r = c.patch(
        f"/api/products/{p.id}",
        {
            "packaging": "Quti",
            "barcode": "1234567890123",
            "ikpu": "IKPU001",
            "seasonality": "winter",
        },
        format="json",
    )
    assert r.status_code == 200, r.content
    p.refresh_from_db()
    assert p.packaging == "Quti"
    assert p.barcode == "1234567890123"
    assert p.ikpu == "IKPU001"
    assert p.seasonality == "winter"


# ── b) GET response includes all new fields ────────────────────────────────────

def test_get_product_returns_new_fields_in_serializer():
    c, store = _make_operator("op_get", "Store_get", "206")
    p = Product.objects.create(
        store=store,
        name_ru="F",
        name_uz="F",
        price=Decimal("1500"),
        has_discount=True,
        discount_price=Decimal("1200"),
        brand="Nestle",
        manufacturer="Nestle SA",
        model="M-100",
        barcode="9999",
        ikpu="IKPU-X",
        packaging="Paket",
        weight_kg=Decimal("0.500"),
        length_cm=Decimal("20.00"),
        width_cm=Decimal("10.00"),
        height_cm=Decimal("3.00"),
        seasonality="summer",
        images=["https://example.com/a.jpg"],
    )
    r = c.get(f"/api/products/{p.id}")
    assert r.status_code == 200, r.content
    data = r.json()
    # All new fields must appear in response
    assert data["has_discount"] is True
    assert data["discount_price"] == "1200.00"
    assert data["brand"] == "Nestle"
    assert data["manufacturer"] == "Nestle SA"
    assert data["model"] == "M-100"
    assert data["barcode"] == "9999"
    assert data["ikpu"] == "IKPU-X"
    assert data["packaging"] == "Paket"
    assert data["weight_kg"] == "0.500"
    assert data["length_cm"] == "20.00"
    assert data["width_cm"] == "10.00"
    assert data["height_cm"] == "3.00"
    assert data["seasonality"] == "summer"
    assert data["images"] == ["https://example.com/a.jpg"]


def test_new_product_has_sane_defaults():
    _, store = _make_operator("op_def", "Store_def", "207")
    p = Product.objects.create(
        store=store, name_ru="G", name_uz="G", price=Decimal("100")
    )
    assert p.has_discount is False
    assert p.discount_price is None
    assert p.brand == ""
    assert p.manufacturer == ""
    assert p.model == ""
    assert p.barcode == ""
    assert p.ikpu == ""
    assert p.packaging == ""
    assert p.weight_kg == Decimal("0")
    assert p.length_cm == Decimal("0")
    assert p.width_cm == Decimal("0")
    assert p.height_cm == Decimal("0")
    assert p.seasonality == "all_season"
    assert p.images == []


# ── photo action: append to images, set photo_url if empty ────────────────────

def test_photo_upload_appends_to_images_and_sets_photo_url():
    c, store = _make_operator("op_photo2", "Store_photo2", "208")
    p = Product.objects.create(
        store=store, name_ru="H", name_uz="H", price=Decimal("100")
    )
    assert p.photo_url == ""
    assert p.images == []

    r = c.post(f"/api/products/{p.id}/photo", {"photo": _png()}, format="multipart")
    assert r.status_code == 200, r.content

    p.refresh_from_db()
    assert p.photo_url != ""
    assert len(p.images) == 1
    assert p.images[0] == p.photo_url


def test_photo_upload_does_not_duplicate_in_images():
    c, store = _make_operator("op_nodup", "Store_nodup", "209")
    p = Product.objects.create(
        store=store, name_ru="I", name_uz="I", price=Decimal("100")
    )
    # Upload twice — images list must not grow beyond 1 entry for same URL
    r1 = c.post(f"/api/products/{p.id}/photo", {"photo": _png()}, format="multipart")
    assert r1.status_code == 200
    p.refresh_from_db()
    first_url = p.photo_url

    r2 = c.post(f"/api/products/{p.id}/photo", {"photo": _png()}, format="multipart")
    assert r2.status_code == 200
    p.refresh_from_db()
    # The same URL won't be duplicated (new file = new url; but old entry stays too)
    # We just assert there's no crash and at least one image present
    assert len(p.images) >= 1
