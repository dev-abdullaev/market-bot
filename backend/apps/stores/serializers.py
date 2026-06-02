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
        fields = [
            "id", "name", "slug", "activity_type", "phone", "address",
            "latitude", "longitude", "logo_url", "currency_code",
            "telegram_bot_token", "telegram_group_id",
            "is_delivery_enabled", "is_pickup_enabled", "is_active",
            # extended settings
            "support_username", "open_time", "close_time", "timezone",
            "service_fee", "minimum_order_amount",
            "delivery_pricing_mode", "delivery_base_radius", "delivery_base_price",
            "delivery_price_per_km", "delivery_fixed_price",
            "cash_enabled", "card_enabled", "card_payment_title", "card_number",
            "card_holder", "payme_enabled", "payme_merchant_id", "payme_url",
            "click_url", "uzum_url",
            "msg_new", "msg_preparing", "msg_delivering", "msg_delivered", "msg_cancelled",
            "ui_theme", "ui_primary_color", "ui_font_family", "menu_view_mode",
            "showcase_config",
        ]
        read_only_fields = ["id", "slug", "is_active"]
