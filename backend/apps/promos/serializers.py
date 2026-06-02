from rest_framework import serializers
from .models import PromoCode


class PromoCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromoCode
        fields = ["id", "code", "discount_type", "discount_value", "is_active",
                  "valid_until", "usage_limit", "used_count", "created_at"]
        read_only_fields = ["used_count", "created_at"]
