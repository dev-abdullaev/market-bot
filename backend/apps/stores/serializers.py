from rest_framework import serializers
from .models import Store

class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = ["id", "name", "slug", "activity_type", "phone", "address",
                  "latitude", "longitude", "logo_url", "currency_code",
                  "telegram_bot_token", "telegram_group_id",
                  "is_delivery_enabled", "is_pickup_enabled", "is_active"]
        read_only_fields = ["id", "slug", "is_active"]
