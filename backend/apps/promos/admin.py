from django.contrib import admin
from .models import PromoCode


@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = ["code", "store", "discount_type", "discount_value",
                    "is_active", "used_count", "created_at"]
    list_filter = ["discount_type", "is_active", "store"]
    search_fields = ["code", "store__name"]
