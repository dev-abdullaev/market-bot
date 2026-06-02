import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.stores.models import Store
from apps.catalog.models import Category, Product

pytestmark = pytest.mark.django_db

def test_operator_cannot_see_other_store_products():
    store_a = Store.objects.create(name="A", phone="1")
    store_b = Store.objects.create(name="B", phone="2")
    Product.objects.create(store=store_b, name_ru="x", name_uz="x", price=1)
    op_a = User.objects.create_user(username="opa", role="operator", store=store_a)
    c = APIClient(); c.force_authenticate(user=op_a)
    assert c.get("/api/products").json() == []

def test_operator_cannot_edit_other_store_product():
    store_a = Store.objects.create(name="A", phone="1")
    store_b = Store.objects.create(name="B", phone="2")
    p_b = Product.objects.create(store=store_b, name_ru="x", name_uz="x", price=1)
    op_a = User.objects.create_user(username="opa", role="operator", store=store_a)
    c = APIClient(); c.force_authenticate(user=op_a)
    assert c.patch(f"/api/products/{p_b.id}", {"price": "999"}, format="json").status_code == 404


def test_operator_cannot_edit_other_store_category():
    """Operator of store A patching a category belonging to store B must get 404."""
    store_a = Store.objects.create(name="A2", phone="3")
    store_b = Store.objects.create(name="B2", phone="4")
    cat_b = Category.objects.create(store=store_b, name_ru="cat", name_uz="cat")
    op_a = User.objects.create_user(username="opa2", role="operator", store=store_a)
    c = APIClient(); c.force_authenticate(user=op_a)
    assert c.patch(
        f"/api/categories/{cat_b.id}", {"name_ru": "hacked"}, format="json"
    ).status_code == 404


def test_operator_cannot_attach_photo_to_other_store_product():
    """Operator of store A posting a photo to store B's product must get 404."""
    import io
    from PIL import Image
    from django.core.files.uploadedfile import SimpleUploadedFile

    store_a = Store.objects.create(name="A3", phone="5")
    store_b = Store.objects.create(name="B3", phone="6")
    p_b = Product.objects.create(store=store_b, name_ru="y", name_uz="y", price=1)
    op_a = User.objects.create_user(username="opa3", role="operator", store=store_a)

    buf = io.BytesIO()
    Image.new("RGB", (2, 2)).save(buf, "PNG")
    buf.seek(0)
    photo = SimpleUploadedFile("img.png", buf.read(), content_type="image/png")

    c = APIClient(); c.force_authenticate(user=op_a)
    assert c.post(
        f"/api/products/{p_b.id}/photo", {"photo": photo}, format="multipart"
    ).status_code == 404
