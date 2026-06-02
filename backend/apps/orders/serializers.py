from django.db import transaction
from rest_framework import serializers
from apps.catalog.models import Product
from .models import Order, OrderItem


class OrderItemInput(serializers.Serializer):
    product = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_name", "price", "quantity", "line_total"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ["id", "store", "customer_name", "customer_phone", "status",
                  "delivery_address", "latitude", "longitude", "total_amount",
                  "payment_method", "comment", "items", "created_at"]
        read_only_fields = ["status", "total_amount", "created_at"]


class OrderCreateSerializer(serializers.Serializer):
    store = serializers.IntegerField()
    customer_name = serializers.CharField()
    customer_phone = serializers.CharField()
    delivery_address = serializers.CharField(required=False, allow_blank=True)
    latitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False, allow_null=True)
    comment = serializers.CharField(required=False, allow_blank=True)
    telegram_id = serializers.CharField(required=False, allow_blank=True)
    items = OrderItemInput(many=True, allow_empty=False)

    def create(self, validated):
        items = validated.pop("items")
        store_id = validated.pop("store")
        validated.pop("telegram_id", None)
        with transaction.atomic():
            order = Order.objects.create(store_id=store_id, **validated)
            total = 0
            for it in items:
                product = Product.objects.filter(id=it["product"], store_id=store_id).first()
                if not product:
                    raise serializers.ValidationError("Product not in this store")
                line = product.price * it["quantity"]
                OrderItem.objects.create(order=order, product=product,
                                         product_name=product.name_uz or product.name_ru,
                                         price=product.price, quantity=it["quantity"],
                                         line_total=line)
                total += line
            order.total_amount = total
            order.save(update_fields=["total_amount"])
        return order
