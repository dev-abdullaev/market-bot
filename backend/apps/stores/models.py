from django.db import models
from django.utils.text import slugify


class Store(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    activity_type = models.CharField(max_length=64, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    address = models.CharField(max_length=512, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    logo_url = models.URLField(blank=True)
    currency_code = models.CharField(max_length=8, default="uz")
    telegram_bot_token = models.CharField(max_length=128, blank=True)
    telegram_group_id = models.CharField(max_length=32, blank=True)
    is_delivery_enabled = models.BooleanField(default=True)
    is_pickup_enabled = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    # working hours
    support_username = models.CharField(max_length=64, blank=True)
    open_time = models.CharField(max_length=5, blank=True)      # "HH:MM"
    close_time = models.CharField(max_length=5, blank=True)
    timezone = models.CharField(max_length=64, default="Asia/Tashkent")
    service_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    minimum_order_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # delivery
    delivery_pricing_mode = models.CharField(max_length=8, default="dynamic")  # dynamic|fixed
    delivery_base_radius = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    delivery_base_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    delivery_price_per_km = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    delivery_fixed_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # payments
    cash_enabled = models.BooleanField(default=True)
    card_enabled = models.BooleanField(default=False)
    card_payment_title = models.CharField(max_length=128, blank=True)
    card_number = models.CharField(max_length=32, blank=True)
    card_holder = models.CharField(max_length=128, blank=True)
    payme_enabled = models.BooleanField(default=False)
    payme_merchant_id = models.CharField(max_length=64, blank=True)
    payme_url = models.CharField(max_length=256, blank=True)
    click_url = models.CharField(max_length=256, blank=True)
    uzum_url = models.CharField(max_length=256, blank=True)
    # bot order-status message templates
    msg_new = models.TextField(blank=True)
    msg_preparing = models.TextField(blank=True)
    msg_delivering = models.TextField(blank=True)
    msg_delivered = models.TextField(blank=True)
    msg_cancelled = models.TextField(blank=True)
    # UI
    ui_theme = models.CharField(max_length=16, default="classic")
    ui_primary_color = models.CharField(max_length=16, blank=True)
    ui_font_family = models.CharField(max_length=16, default="sans")
    menu_view_mode = models.CharField(max_length=24, default="grid_categories")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name) or "store"
            slug, i = base, 1
            while Store.objects.exclude(pk=self.pk).filter(slug=slug).exists():
                i += 1
                slug = f"{base}-{i}"
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
