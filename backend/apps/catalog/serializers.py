from rest_framework import serializers
from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "parent", "name_ru", "name_uz", "image_url",
                  "sort_order", "is_active"]


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "category", "name_ru", "name_uz", "description_ru",
                  "description_uz", "price", "unit", "photo_url",
                  "in_stock", "is_hidden", "sort_order"]


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
