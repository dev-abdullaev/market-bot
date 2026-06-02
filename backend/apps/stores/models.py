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
