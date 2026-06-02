import pytest
from decimal import Decimal
from model_bakery import baker
from apps.catalog.models import Product

pytestmark = pytest.mark.django_db


def test_product_defaults():
    store = baker.make("stores.Store")
    cat = baker.make("catalog.Category", store=store)
    p = Product.objects.create(store=store, category=cat, name_ru="Кола",
                               name_uz="Kola", price=Decimal("12000"))
    assert p.in_stock is True
    assert p.is_hidden is False
    assert p.unit == "dona"
