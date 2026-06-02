from rest_framework import serializers
from .models import Store

class StoreSerializer(serializers.ModelSerializer):
    # write_only: the token can be set via POST/PATCH but is never echoed back
    # in any response that uses this serializer (defense-in-depth).
    telegram_bot_token = serializers.CharField(
        max_length=128, allow_blank=True, required=False, write_only=True
    )

    class Meta:
        model = Store
        fields = ["id", "name", "slug", "activity_type", "phone", "address",
                  "latitude", "longitude", "logo_url", "currency_code",
                  "telegram_bot_token", "telegram_group_id",
                  "is_delivery_enabled", "is_pickup_enabled", "is_active"]
        read_only_fields = ["id", "slug", "is_active"]
