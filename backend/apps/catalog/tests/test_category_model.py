import pytest
from model_bakery import baker
from apps.catalog.models import Category

pytestmark = pytest.mark.django_db


def test_category_hierarchy():
    store = baker.make("stores.Store")
    parent = Category.objects.create(store=store, name_ru="Напитки", name_uz="Ichimliklar")
    child = Category.objects.create(store=store, name_ru="Соки", name_uz="Sharbatlar",
                                    parent=parent)
    assert child.parent == parent
    assert list(parent.children.all()) == [child]
