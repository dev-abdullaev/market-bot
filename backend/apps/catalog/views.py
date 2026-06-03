import os

from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.files.storage import default_storage
from django.shortcuts import get_object_or_404

from apps.stores.models import Store
from .models import Category, GlobalProduct, Product
from .permissions import IsOperatorWithStore
from .serializers import (
    CategorySerializer,
    GlobalProductSerializer,
    ProductSerializer,
    PublicCategorySerializer,
    PublicStoreSerializer,
)
from .services import add_global_products_to_store, import_products


class GlobalProductPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class GlobalProductListView(ListAPIView):
    serializer_class = GlobalProductSerializer
    permission_classes = [IsOperatorWithStore]
    pagination_class = GlobalProductPagination

    def get_queryset(self):
        qs = GlobalProduct.objects.all()
        q = self.request.query_params.get("q", "").strip()
        barcode = self.request.query_params.get("barcode", "").strip()
        if q:
            qs = qs.filter(Q(name_uz__icontains=q) | Q(name_ru__icontains=q))
        if barcode:
            qs = qs.filter(Q(barcode__icontains=barcode) | Q(ikpu__icontains=barcode))
        return qs


class GlobalProductAddView(APIView):
    permission_classes = [IsOperatorWithStore]

    def post(self, request):
        # Accept {items: [{id, price, category_id?}]} or legacy {ids: [...]}
        items = request.data.get("items") or request.data.get("ids", [])
        if not isinstance(items, list):
            return Response({"detail": "items must be a list"}, status=400)
        result = add_global_products_to_store(store=request.user.store, items=items)
        return Response(result, status=200)


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

    @action(detail=False, methods=["post"], url_path="import")
    def import_rows(self, request):
        """POST /api/products/import

        Body: {"rows": [{...}, ...]}
        Returns: {"created": N, "skipped": M, "errors": [...]}
        """
        rows = request.data.get("rows", [])
        if not isinstance(rows, list):
            return Response({"detail": "rows must be a list"}, status=400)
        result = import_products(store=request.user.store, rows=rows)
        return Response(result)

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser, FormParser])
    def photo(self, request, pk=None):
        product = self.get_object()
        f = request.FILES.get("photo")
        if not f:
            return Response({"detail": "No file"}, status=400)
        safe_name = os.path.basename(f.name)
        path = default_storage.save(f"products/{product.id}_{safe_name}", f)
        url = request.build_absolute_uri(default_storage.url(path))
        product.photo_url = url
        # Also maintain the images list: append if not already present,
        # and set photo_url as the first image when the list is empty.
        images = list(product.images) if product.images else []
        if url not in images:
            images.append(url)
        product.images = images
        product.save(update_fields=["photo_url", "images"])
        return Response({"photo_url": product.photo_url})


class ShopView(RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = PublicStoreSerializer
    lookup_field = "slug"
    queryset = Store.objects.filter(is_active=True)


class ShopCatalogView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        store = get_object_or_404(Store, slug=slug, is_active=True)
        cats = store.categories.filter(is_active=True)
        return Response({"categories": PublicCategorySerializer(cats, many=True).data})
