from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import (
    CategoryViewSet,
    GlobalProductAddView,
    GlobalProductListView,
    ProductViewSet,
    ShopCatalogView,
    ShopView,
)

router = SimpleRouter(trailing_slash=False)
router.register("categories", CategoryViewSet, basename="category")
router.register("products", ProductViewSet, basename="product")

urlpatterns = [
    # Global catalog — explicit paths BEFORE router so they win over any prefix clash
    path("global-products/add-to-store", GlobalProductAddView.as_view()),
    path("global-products", GlobalProductListView.as_view()),
    # Public shop endpoints
    path("shop/<slug:slug>", ShopView.as_view()),
    path("shop/<slug:slug>/catalog", ShopCatalogView.as_view()),
] + router.urls
