from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import CategoryViewSet, ProductViewSet, ShopView, ShopCatalogView

router = SimpleRouter(trailing_slash=False)
router.register("categories", CategoryViewSet, basename="category")
router.register("products", ProductViewSet, basename="product")

urlpatterns = [
    path("shop/<slug:slug>", ShopView.as_view()),
    path("shop/<slug:slug>/catalog", ShopCatalogView.as_view()),
] + router.urls
