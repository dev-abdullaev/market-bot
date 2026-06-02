from rest_framework import serializers
from apps.stores.models import Store
from .models import Category, Product


class PublicStoreSerializer(serializers.ModelSerializer):
    """Read-only serializer for the unauthenticated shop endpoint.

    Deliberately excludes ``telegram_bot_token`` and ``telegram_group_id``
    so that credentials are never exposed to anonymous callers.
    """

    class Meta:
        model = Store
        fields = [
            "id",
            "name",
            "slug",
            "activity_type",
            "phone",
            "address",
            "latitude",
            "longitude",
            "logo_url",
            "currency_code",
            "is_delivery_enabled",
            "is_pickup_enabled",
            "showcase_config",
        ]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "parent", "name_ru", "name_uz", "image_url",
                  "sort_order", "is_active"]


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "id", "category", "name_ru", "name_uz", "description_ru",
            "description_uz", "price", "unit", "photo_url",
            "in_stock", "is_hidden", "sort_order",
            # extended talablar-style fields
            "has_discount", "discount_price",
            "packaging", "manufacturer", "brand", "model",
            "barcode", "ikpu",
            "weight_kg", "length_cm", "width_cm", "height_cm",
            "seasonality", "images",
        ]


class PublicProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name_ru", "name_uz", "description_ru", "description_uz",
                  "price", "unit", "photo_url"]


class PublicCategorySerializer(serializers.ModelSerializer):
    products = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name_ru", "name_uz", "image_url", "products"]

    def get_products(self, obj):
        qs = obj.products.filter(in_stock=True, is_hidden=False)
        return PublicProductSerializer(qs, many=True).data
