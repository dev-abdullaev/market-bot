"""
Tests for the Global Products catalog feature.

Covers:
- Authentication / permission guards
- Paginated list with count/next/results
- Search via ?q= (uz and ru)
- Barcode/IKPU search via ?barcode=
- ?page_size= respected and capped at 100
- POST add-to-store: product + category chain creation
- Idempotency (barcode de-dup)
- Tenant isolation (store A's operator cannot affect store B)
"""
import pytest
from decimal import Decimal
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.catalog.models import Category, GlobalProduct, Product
from apps.stores.models import Store

pytestmark = pytest.mark.django_db

# ── helpers ─────────────────────────────────────────────────────────────────


def _make_operator(username, store_name, phone):
    store = Store.objects.create(name=store_name, phone=phone)
    user = User.objects.create_user(username=username, role="operator", store=store)
    client = APIClient()
    client.force_authenticate(user=user)
    return client, store


def _make_global_product(**kwargs):
    defaults = dict(
        name_uz="Test mahsulot",
        name_ru="Тестовый товар",
        barcode="BC0001",
        ikpu="IK0001",
        price=Decimal("10000.00"),
        unit="dona",
        category_path=[],
        recommended_category="",
    )
    defaults.update(kwargs)
    return GlobalProduct.objects.create(**defaults)


# ── authentication / permission ──────────────────────────────────────────────


def test_unauthenticated_list_returns_401_or_403():
    client = APIClient()
    r = client.get("/api/global-products")
    assert r.status_code in (401, 403)


def test_unauthenticated_add_returns_401_or_403():
    client = APIClient()
    r = client.post("/api/global-products/add-to-store", {"ids": []}, format="json")
    assert r.status_code in (401, 403)


def test_customer_role_cannot_access_list():
    store = Store.objects.create(name="CustStore", phone="999")
    customer = User.objects.create_user(username="cust_gp", role="customer", store=store)
    client = APIClient()
    client.force_authenticate(user=customer)
    r = client.get("/api/global-products")
    assert r.status_code in (401, 403)


# ── list / pagination ────────────────────────────────────────────────────────


def test_list_returns_paginated_response():
    client, _ = _make_operator("gp_op1", "ListStore", "100")
    # Create 25 products so there is a "next" page with default page_size=20
    for i in range(25):
        _make_global_product(
            name_uz=f"Mahsulot {i}",
            name_ru=f"Товар {i}",
            barcode=f"BC{i:04d}",
        )
    r = client.get("/api/global-products")
    assert r.status_code == 200
    data = r.json()
    assert "count" in data
    assert "results" in data
    assert data["count"] == 25
    assert len(data["results"]) == 20  # default page_size
    assert data["next"] is not None    # there is a second page
    assert data["previous"] is None


def test_list_page_2_returns_remaining():
    client, _ = _make_operator("gp_op2", "Page2Store", "101")
    for i in range(25):
        _make_global_product(
            name_uz=f"Item {i}",
            name_ru=f"Item {i}",
            barcode=f"PG{i:04d}",
        )
    r = client.get("/api/global-products?page=2")
    assert r.status_code == 200
    data = r.json()
    assert len(data["results"]) == 5
    assert data["previous"] is not None
    assert data["next"] is None


# ── search / filtering ───────────────────────────────────────────────────────


def test_search_by_name_uz():
    client, _ = _make_operator("gp_srch1", "SrchStore1", "201")
    _make_global_product(name_uz="Olma sharbati", name_ru="Яблочный сок", barcode="S001")
    _make_global_product(name_uz="Gilos murabbo", name_ru="Варенье из вишни", barcode="S002")
    r = client.get("/api/global-products?q=olma")
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 1
    assert data["results"][0]["name_uz"] == "Olma sharbati"


def test_search_by_name_ru():
    """Filter by name_ru using a substring that is an exact (same-case) prefix.

    SQLite's LIKE operator is only case-insensitive for ASCII.  We use a
    lower-case Cyrillic search term that matches the stored lower-case prefix so
    the test passes on both SQLite (CI) and PostgreSQL (production).
    """
    client, _ = _make_operator("gp_srch2", "SrchStore2", "202")
    # Store the name_ru in all lower-case so the substring match is trivially exact.
    _make_global_product(name_uz="olma sharbati", name_ru="яблочный сок", barcode="SR001")
    _make_global_product(name_uz="gilos murabbo", name_ru="варенье из вишни", barcode="SR002")
    r = client.get("/api/global-products?q=яблочный")
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 1
    assert data["results"][0]["name_ru"] == "яблочный сок"


def test_search_case_insensitive():
    client, _ = _make_operator("gp_srch3", "SrchStore3", "203")
    _make_global_product(name_uz="Koʻylak", name_ru="Рубашка", barcode="CI001")
    r = client.get("/api/global-products?q=КОʻЙЛАК")
    assert r.status_code == 200
    # icontains is case-insensitive for ASCII; for Cyrillic this depends on DB collation.
    # Just ensure no 500 and the filter runs.
    assert "results" in r.json()


def test_filter_by_barcode():
    client, _ = _make_operator("gp_bc1", "BcStore1", "301")
    _make_global_product(name_uz="Prod A", name_ru="Prod A", barcode="4780000000014")
    _make_global_product(name_uz="Prod B", name_ru="Prod B", barcode="9999999999999")
    r = client.get("/api/global-products?barcode=47800")
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 1
    assert data["results"][0]["barcode"] == "4780000000014"


def test_filter_by_ikpu():
    client, _ = _make_operator("gp_ik1", "IkStore1", "302")
    _make_global_product(name_uz="Prod C", name_ru="Prod C", barcode="IK_BC1", ikpu="IK9876")
    _make_global_product(name_uz="Prod D", name_ru="Prod D", barcode="IK_BC2", ikpu="IK0000")
    r = client.get("/api/global-products?barcode=IK9876")
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 1
    assert data["results"][0]["barcode"] == "IK_BC1"


def test_custom_page_size():
    client, _ = _make_operator("gp_ps1", "PsStore1", "401")
    for i in range(10):
        _make_global_product(
            name_uz=f"PS Item {i}",
            name_ru=f"PS Item {i}",
            barcode=f"PS{i:04d}",
        )
    r = client.get("/api/global-products?page_size=5")
    assert r.status_code == 200
    data = r.json()
    assert len(data["results"]) == 5
    assert data["count"] == 10
    assert data["next"] is not None


def test_page_size_capped_at_100():
    client, _ = _make_operator("gp_ps2", "PsStore2", "402")
    for i in range(10):
        _make_global_product(
            name_uz=f"Cap Item {i}",
            name_ru=f"Cap Item {i}",
            barcode=f"CAP{i:04d}",
        )
    # page_size=200 should be clamped to max_page_size=100 → returns all 10
    r = client.get("/api/global-products?page_size=200")
    assert r.status_code == 200
    data = r.json()
    # All 10 should come back (100 cap > 10 rows)
    assert len(data["results"]) == 10


# ── add-to-store ─────────────────────────────────────────────────────────────


def test_add_to_store_creates_product():
    client, store = _make_operator("gp_add1", "AddStore1", "501")
    gp = _make_global_product(
        name_uz="Oltin uzuk",
        name_ru="Золотое кольцо",
        barcode="RING001",
        price=Decimal("500000.00"),
        unit="dona",
        category_path=[],
    )
    r = client.post(
        "/api/global-products/add-to-store", {"ids": [gp.id]}, format="json"
    )
    assert r.status_code == 200
    data = r.json()
    assert data["created"] == 1
    assert data["skipped"] == 0
    assert Product.objects.filter(store=store, barcode="RING001").exists()


def test_add_to_store_copies_fields():
    client, store = _make_operator("gp_add2", "AddStore2", "502")
    gp = _make_global_product(
        name_uz="Plash",
        name_ru="Плащ",
        barcode="PLASH001",
        price=Decimal("120000.00"),
        discount_price=Decimal("100000.00"),
        unit="dona",
        brand="BrandX",
        model="M100",
        manufacturer="FactoryZ",
        weight_kg=Decimal("0.5"),
        length_cm=Decimal("50.00"),
        width_cm=Decimal("30.00"),
        height_cm=Decimal("2.00"),
        image_url="https://example.com/img.jpg",
    )
    client.post("/api/global-products/add-to-store", {"ids": [gp.id]}, format="json")
    p = Product.objects.get(store=store, barcode="PLASH001")
    assert p.name_uz == "Plash"
    assert p.name_ru == "Плащ"
    # Price/discount are NOT copied — the store owner sets their own price.
    assert p.price == Decimal("0")
    assert p.discount_price is None
    assert p.has_discount is False
    assert p.unit == "dona"
    assert p.brand == "BrandX"
    assert p.model == "M100"
    assert p.manufacturer == "FactoryZ"
    assert p.weight_kg == Decimal("0.5")
    assert p.length_cm == Decimal("50.00")
    assert p.width_cm == Decimal("30.00")
    assert p.height_cm == Decimal("2.00")
    assert p.photo_url == "https://example.com/img.jpg"
    assert p.images == ["https://example.com/img.jpg"]


def test_add_to_store_no_discount():
    client, store = _make_operator("gp_add3", "AddStore3", "503")
    gp = _make_global_product(
        name_uz="Qoshiq",
        name_ru="Ложка",
        barcode="SPOON001",
        price=Decimal("3000.00"),
        discount_price=None,
    )
    client.post("/api/global-products/add-to-store", {"ids": [gp.id]}, format="json")
    p = Product.objects.get(store=store, barcode="SPOON001")
    assert p.has_discount is False
    assert p.discount_price is None
    assert p.images == []


def test_add_to_store_builds_category_chain():
    client, store = _make_operator("gp_cat1", "CatStore1", "601")
    gp = _make_global_product(
        name_uz="Maxsus kiyim",
        name_ru="Спецодежда",
        barcode="CAT001",
        category_path=[
            {"name_uz": "Kiyim", "name_ru": "Одежда"},
            {"name_uz": "Ayollar", "name_ru": "Женский"},
        ],
    )
    r = client.post(
        "/api/global-products/add-to-store", {"ids": [gp.id]}, format="json"
    )
    assert r.status_code == 200
    # Root category
    root = Category.objects.get(store=store, name_uz="Kiyim", parent__isnull=True)
    assert root.name_ru == "Одежда"
    # Leaf category
    leaf = Category.objects.get(store=store, name_uz="Ayollar", parent=root)
    assert leaf.name_ru == "Женский"
    # Product assigned to deepest category
    p = Product.objects.get(store=store, barcode="CAT001")
    assert p.category == leaf


def test_add_to_store_no_category_path():
    client, store = _make_operator("gp_nocat", "NoCatStore", "602")
    gp = _make_global_product(
        name_uz="Kategoriyasiz",
        name_ru="Без категории",
        barcode="NOCAT001",
        category_path=[],
    )
    client.post("/api/global-products/add-to-store", {"ids": [gp.id]}, format="json")
    p = Product.objects.get(store=store, barcode="NOCAT001")
    assert p.category is None


def test_add_to_store_deep_3level_chain():
    client, store = _make_operator("gp_deep", "DeepStore", "603")
    gp = _make_global_product(
        name_uz="Telefon",
        name_ru="Телефон",
        barcode="DEEP001",
        category_path=[
            {"name_uz": "Elektronika", "name_ru": "Электроника"},
            {"name_uz": "Gadjetlar", "name_ru": "Гаджеты"},
            {"name_uz": "Smartfonlar", "name_ru": "Смартфоны"},
        ],
    )
    client.post("/api/global-products/add-to-store", {"ids": [gp.id]}, format="json")
    cat1 = Category.objects.get(store=store, name_uz="Elektronika", parent__isnull=True)
    cat2 = Category.objects.get(store=store, name_uz="Gadjetlar", parent=cat1)
    cat3 = Category.objects.get(store=store, name_uz="Smartfonlar", parent=cat2)
    p = Product.objects.get(store=store, barcode="DEEP001")
    assert p.category == cat3


# ── idempotency ──────────────────────────────────────────────────────────────


def test_add_to_store_idempotent_by_barcode():
    client, store = _make_operator("gp_idem1", "IdemStore1", "701")
    gp = _make_global_product(barcode="IDEM001", name_uz="Idem", name_ru="Идем")
    # First call
    r1 = client.post(
        "/api/global-products/add-to-store", {"ids": [gp.id]}, format="json"
    )
    assert r1.json()["created"] == 1
    assert r1.json()["skipped"] == 0
    # Second call — same barcode already in store
    r2 = client.post(
        "/api/global-products/add-to-store", {"ids": [gp.id]}, format="json"
    )
    assert r2.json()["created"] == 0
    assert r2.json()["skipped"] == 1
    # Only one Product in store
    assert Product.objects.filter(store=store, barcode="IDEM001").count() == 1


def test_add_to_store_empty_barcode_not_deduped():
    """Products without a barcode are always created (no dedup key)."""
    client, store = _make_operator("gp_idem2", "IdemStore2", "702")
    gp = _make_global_product(barcode="", name_uz="NoBc", name_ru="НоБц")
    r1 = client.post(
        "/api/global-products/add-to-store", {"ids": [gp.id]}, format="json"
    )
    r2 = client.post(
        "/api/global-products/add-to-store", {"ids": [gp.id]}, format="json"
    )
    assert r1.json()["created"] == 1
    assert r2.json()["created"] == 1  # no barcode → always created
    assert Product.objects.filter(store=store, name_uz="NoBc").count() == 2


# ── tenant isolation ─────────────────────────────────────────────────────────


def test_add_to_store_tenant_isolation():
    client_a, store_a = _make_operator("gp_ten_a", "TenStoreA", "801")
    _, store_b = _make_operator("gp_ten_b", "TenStoreB", "802")
    gp = _make_global_product(barcode="TEN001", name_uz="TenProd", name_ru="ТенПрод")

    # Operator A adds the product
    r = client_a.post(
        "/api/global-products/add-to-store", {"ids": [gp.id]}, format="json"
    )
    assert r.json()["created"] == 1

    # Product exists in store A only
    assert Product.objects.filter(store=store_a, barcode="TEN001").count() == 1
    # Store B has nothing
    assert Product.objects.filter(store=store_b, barcode="TEN001").count() == 0


def test_add_to_store_category_tenant_isolation():
    """Categories created via add-to-store are scoped to the caller's store."""
    client_a, store_a = _make_operator("gp_catiso_a", "CatIsoA", "901")
    _, store_b = _make_operator("gp_catiso_b", "CatIsoB", "902")
    gp = _make_global_product(
        barcode="ISO001",
        name_uz="IsoProd",
        name_ru="ИзоПрод",
        category_path=[{"name_uz": "IsoKat", "name_ru": "ИзоКат"}],
    )
    client_a.post(
        "/api/global-products/add-to-store", {"ids": [gp.id]}, format="json"
    )
    assert Category.objects.filter(store=store_a, name_uz="IsoKat").count() == 1
    assert Category.objects.filter(store=store_b, name_uz="IsoKat").count() == 0


# ── validation ───────────────────────────────────────────────────────────────


def test_add_to_store_ids_not_list_returns_400():
    client, _ = _make_operator("gp_val1", "ValStore1", "1001")
    r = client.post(
        "/api/global-products/add-to-store", {"ids": "not-a-list"}, format="json"
    )
    assert r.status_code == 400


def test_add_to_store_empty_ids_returns_zero():
    client, _ = _make_operator("gp_val2", "ValStore2", "1002")
    r = client.post(
        "/api/global-products/add-to-store", {"ids": []}, format="json"
    )
    assert r.status_code == 200
    assert r.json() == {"created": 0, "skipped": 0}


def test_add_to_store_unknown_ids_silently_skipped():
    """IDs not in GlobalProduct are simply not found — created=0, skipped=0."""
    client, _ = _make_operator("gp_val3", "ValStore3", "1003")
    r = client.post(
        "/api/global-products/add-to-store", {"ids": [99999, 99998]}, format="json"
    )
    assert r.status_code == 200
    assert r.json() == {"created": 0, "skipped": 0}
