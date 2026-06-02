"""
TDD tests for Task 2: Excel/paste import endpoint POST /api/products/import
"""
import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.catalog.models import Category, Product
from apps.stores.models import Store

pytestmark = pytest.mark.django_db


def _make_operator(username, store_name, phone):
    store = Store.objects.create(name=store_name, phone=phone)
    user = User.objects.create_user(username=username, role="operator", store=store)
    c = APIClient()
    c.force_authenticate(user=user)
    return c, store


# ── c) import creates 3-level category chain + products, returns created count ──

def test_import_creates_products_and_3level_category_chain():
    c, store = _make_operator("imp_op1", "ImpStore1", "301")
    payload = {
        "rows": [
            {
                "category_1": "Elektronika",
                "category_2": "Telefonlar",
                "category_3": "Smartfonlar",
                "name_ru": "iPhone 15",
                "name_uz": "iPhone 15",
                "description_ru": "Apple smartfon",
                "description_uz": "Apple smartfon uz",
                "price": "15000000",
                "unit": "dona",
                "barcode": "BC001",
                "ikpu": "IK001",
            }
        ]
    }
    r = c.post("/api/products/import", payload, format="json")
    assert r.status_code == 200, r.content
    data = r.json()
    assert data["created"] == 1
    assert data["skipped"] == 0
    assert data["errors"] == []

    # Verify 3-level chain created under the operator's store
    cat1 = Category.objects.get(store=store, name_uz="Elektronika", parent__isnull=True)
    cat2 = Category.objects.get(store=store, name_uz="Telefonlar", parent=cat1)
    cat3 = Category.objects.get(store=store, name_uz="Smartfonlar", parent=cat2)

    # Verify product assigned to deepest category
    product = Product.objects.get(store=store, name_uz="iPhone 15")
    assert product.category == cat3
    assert product.barcode == "BC001"
    assert product.ikpu == "IK001"
    assert product.price == Decimal("15000000")
    assert product.description_ru == "Apple smartfon"


def test_import_only_two_category_levels():
    """category_3 empty → product goes under category_2."""
    c, store = _make_operator("imp_op2", "ImpStore2", "302")
    payload = {
        "rows": [
            {
                "category_1": "Oziq-ovqat",
                "category_2": "Sut mahsulotlari",
                "category_3": "",
                "name_ru": "Молоко",
                "name_uz": "Sut",
                "price": "8000",
                "unit": "litr",
            }
        ]
    }
    r = c.post("/api/products/import", payload, format="json")
    assert r.status_code == 200, r.content
    data = r.json()
    assert data["created"] == 1

    cat1 = Category.objects.get(store=store, name_uz="Oziq-ovqat", parent__isnull=True)
    cat2 = Category.objects.get(store=store, name_uz="Sut mahsulotlari", parent=cat1)

    product = Product.objects.get(store=store, name_uz="Sut")
    assert product.category == cat2
    assert product.unit == "litr"


def test_import_only_one_category_level():
    """category_2 and category_3 empty → product goes under category_1."""
    c, store = _make_operator("imp_op3", "ImpStore3", "303")
    payload = {
        "rows": [
            {
                "category_1": "Kiyim",
                "category_2": "",
                "category_3": "",
                "name_ru": "Футболка",
                "name_uz": "Futbolka",
                "price": "50000",
            }
        ]
    }
    r = c.post("/api/products/import", payload, format="json")
    assert r.status_code == 200, r.content
    assert r.json()["created"] == 1

    cat1 = Category.objects.get(store=store, name_uz="Kiyim", parent__isnull=True)
    product = Product.objects.get(store=store, name_uz="Futbolka")
    assert product.category == cat1


def test_import_no_category_creates_product_with_no_category():
    """All category fields empty → product category is None."""
    c, store = _make_operator("imp_op_nocat", "ImpStore_nocat", "304")
    payload = {
        "rows": [
            {
                "category_1": "",
                "category_2": "",
                "category_3": "",
                "name_ru": "Без категории",
                "name_uz": "Kategoriyasiz",
                "price": "999",
            }
        ]
    }
    r = c.post("/api/products/import", payload, format="json")
    assert r.status_code == 200, r.content
    assert r.json()["created"] == 1
    product = Product.objects.get(store=store, name_uz="Kategoriyasiz")
    assert product.category is None


def test_import_reuses_existing_category():
    """Running import twice with same category names must not duplicate categories."""
    c, store = _make_operator("imp_op4", "ImpStore4", "305")
    row = {
        "category_1": "Ichimliklar",
        "category_2": "",
        "category_3": "",
        "name_ru": "Чай",
        "name_uz": "Choy",
        "price": "3000",
    }
    c.post("/api/products/import", {"rows": [row]}, format="json")
    c.post("/api/products/import", {"rows": [row]}, format="json")

    assert Category.objects.filter(store=store, name_uz="Ichimliklar").count() == 1
    # Two products (import creates duplicates — that's expected for batch paste)
    assert Product.objects.filter(store=store, name_uz="Choy").count() == 2


def test_import_multiple_rows():
    c, store = _make_operator("imp_op5", "ImpStore5", "306")
    payload = {
        "rows": [
            {
                "category_1": "A", "category_2": "", "category_3": "",
                "name_ru": "P1", "name_uz": "P1", "price": "1000",
            },
            {
                "category_1": "B", "category_2": "", "category_3": "",
                "name_ru": "P2", "name_uz": "P2", "price": "2000",
            },
            {
                "category_1": "C", "category_2": "", "category_3": "",
                "name_ru": "P3", "name_uz": "P3", "price": "3000",
            },
        ]
    }
    r = c.post("/api/products/import", payload, format="json")
    assert r.status_code == 200, r.content
    data = r.json()
    assert data["created"] == 3
    assert data["skipped"] == 0


def test_import_unit_defaults_to_dona():
    """unit field omitted → defaults to 'dona'."""
    c, store = _make_operator("imp_op6", "ImpStore6", "307")
    payload = {
        "rows": [
            {"name_ru": "Test", "name_uz": "Test", "price": "100"}
        ]
    }
    r = c.post("/api/products/import", payload, format="json")
    assert r.status_code == 200
    p = Product.objects.get(store=store, name_uz="Test")
    assert p.unit == "dona"


# ── d) import is tenant-scoped ─────────────────────────────────────────────────

def test_import_products_land_under_operator_store_only():
    """Two operators import; each sees only their own products/categories."""
    c_a, store_a = _make_operator("imp_ten_a", "TenantA", "401")
    c_b, store_b = _make_operator("imp_ten_b", "TenantB", "402")

    row = {
        "category_1": "SharedCat",
        "category_2": "",
        "category_3": "",
        "name_ru": "Shared Product",
        "name_uz": "Shared Product",
        "price": "500",
    }

    c_a.post("/api/products/import", {"rows": [row]}, format="json")
    c_b.post("/api/products/import", {"rows": [row]}, format="json")

    assert Product.objects.filter(store=store_a, name_uz="Shared Product").count() == 1
    assert Product.objects.filter(store=store_b, name_uz="Shared Product").count() == 1
    assert Category.objects.filter(store=store_a, name_uz="SharedCat").count() == 1
    assert Category.objects.filter(store=store_b, name_uz="SharedCat").count() == 1

    # List products through operator A's API → only sees store_a products
    r_a = c_a.get("/api/products")
    assert r_a.status_code == 200
    ids_a = [p["id"] for p in r_a.json()]
    store_a_ids = list(Product.objects.filter(store=store_a).values_list("id", flat=True))
    store_b_ids = list(Product.objects.filter(store=store_b).values_list("id", flat=True))
    for pid in store_b_ids:
        assert pid not in ids_a


# ── e) invalid/empty rows are skipped without 500 ─────────────────────────────

def test_import_skips_row_with_no_name_and_no_price():
    c, store = _make_operator("imp_skip1", "SkipStore1", "501")
    payload = {
        "rows": [
            # Valid row
            {"name_ru": "Valid", "name_uz": "Valid", "price": "100"},
            # Invalid: no name_ru, no name_uz, no price
            {"name_ru": "", "name_uz": "", "price": ""},
            # Invalid: only whitespace
            {"name_ru": "  ", "name_uz": "", "price": ""},
        ]
    }
    r = c.post("/api/products/import", payload, format="json")
    assert r.status_code == 200, r.content
    data = r.json()
    assert data["created"] == 1
    assert data["skipped"] == 2


def test_import_bad_price_row_goes_to_errors_not_500():
    c, store = _make_operator("imp_err1", "ErrStore1", "502")
    payload = {
        "rows": [
            {"name_ru": "Good", "name_uz": "Good", "price": "999"},
            {"name_ru": "Bad Price", "name_uz": "Bad Price", "price": "NOT_A_NUMBER"},
        ]
    }
    r = c.post("/api/products/import", payload, format="json")
    # Must not 500
    assert r.status_code == 200, r.content
    data = r.json()
    # One good row created, one error
    assert data["created"] == 1
    assert len(data["errors"]) == 1
    assert data["skipped"] == 0


def test_import_empty_rows_list_returns_zero_created():
    c, store = _make_operator("imp_empty", "EmptyStore", "503")
    r = c.post("/api/products/import", {"rows": []}, format="json")
    assert r.status_code == 200, r.content
    data = r.json()
    assert data["created"] == 0
    assert data["skipped"] == 0
    assert data["errors"] == []


def test_import_requires_authentication():
    c = APIClient()  # unauthenticated
    r = c.post("/api/products/import", {"rows": []}, format="json")
    assert r.status_code in (401, 403)


def test_import_requires_operator_role():
    store = Store.objects.create(name="CustStore", phone="601")
    customer = User.objects.create_user(username="cust_imp", role="customer", store=store)
    c = APIClient()
    c.force_authenticate(user=customer)
    r = c.post("/api/products/import", {"rows": []}, format="json")
    assert r.status_code in (401, 403)
