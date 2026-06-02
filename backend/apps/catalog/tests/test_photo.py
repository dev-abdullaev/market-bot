import io
import pytest
from PIL import Image
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.accounts.models import User
from apps.stores.models import Store
from apps.catalog.models import Product

pytestmark = pytest.mark.django_db

def _png():
    buf = io.BytesIO()
    Image.new("RGB", (2, 2)).save(buf, "PNG")
    buf.seek(0)
    return SimpleUploadedFile("p.png", buf.read(), content_type="image/png")

def test_upload_product_photo():
    store = Store.objects.create(name="S", phone="1")
    user = User.objects.create_user(username="op", role="operator", store=store)
    p = Product.objects.create(store=store, name_ru="a", name_uz="a", price=1)
    c = APIClient(); c.force_authenticate(user=user)
    r = c.post(f"/api/products/{p.id}/photo", {"photo": _png()}, format="multipart")
    assert r.status_code == 200
    p.refresh_from_db()
    assert p.photo_url.endswith(".png") or "/media/" in p.photo_url
