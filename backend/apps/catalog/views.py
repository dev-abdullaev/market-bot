from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.generics import RetrieveAPIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.files.storage import default_storage
from django.shortcuts import get_object_or_404

from apps.stores.models import Store
from apps.stores.serializers import StoreSerializer
from .models import Category, Product
from .permissions import IsOperatorWithStore
from .serializers import (
    CategorySerializer,
    ProductSerializer,
    PublicCategorySerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsOperatorWithStore]

    def get_queryset(self):
        return Category.objects.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsOperatorWithStore]

    def get_queryset(self):
        qs = Product.objects.filter(store=self.request.user.store)
        cat = self.request.query_params.get("category")
        return qs.filter(category_id=cat) if cat else qs

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser, FormParser])
    def photo(self, request, pk=None):
        product = self.get_object()
        f = request.FILES.get("photo")
        if not f:
            return Response({"detail": "No file"}, status=400)
        path = default_storage.save(f"products/{product.id}_{f.name}", f)
        product.photo_url = request.build_absolute_uri(default_storage.url(path))
        product.save(update_fields=["photo_url"])
        return Response({"photo_url": product.photo_url})


class ShopView(RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = StoreSerializer
    lookup_field = "slug"
    queryset = Store.objects.filter(is_active=True)


class ShopCatalogView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        store = get_object_or_404(Store, slug=slug, is_active=True)
        cats = store.categories.filter(is_active=True)
        return Response({"categories": PublicCategorySerializer(cats, many=True).data})
