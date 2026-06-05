from django.db import models


class Category(models.Model):
    store = models.ForeignKey("stores.Store", on_delete=models.CASCADE,
                              related_name="categories")
    parent = models.ForeignKey("self", null=True, blank=True,
                               on_delete=models.CASCADE, related_name="children")
    name_ru = models.CharField(max_length=255)
    name_uz = models.CharField(max_length=255)
    image_url = models.URLField(blank=True)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.name_uz or self.name_ru


class Product(models.Model):
    UNIT_CHOICES = [("dona", "dona"), ("kg", "kg"), ("litr", "litr"), ("portsiya", "portsiya")]

    store = models.ForeignKey("stores.Store", on_delete=models.CASCADE,
                              related_name="products")
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True,
                                 blank=True, related_name="products")
    name_ru = models.CharField(max_length=255)
    name_uz = models.CharField(max_length=255)
    description_ru = models.TextField(blank=True)
    description_uz = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=16, choices=UNIT_CHOICES, default="dona")
    photo_url = models.URLField(blank=True)
    in_stock = models.BooleanField(default=True)
    is_hidden = models.BooleanField(default=False)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ── talablar-style extended fields ────────────────────────────────────────
    has_discount = models.BooleanField(default=False)
    discount_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    packaging = models.CharField(max_length=64, blank=True)
    manufacturer = models.CharField(max_length=128, blank=True)
    brand = models.CharField(max_length=128, blank=True)
    model = models.CharField(max_length=128, blank=True)
    barcode = models.CharField(max_length=64, blank=True)
    ikpu = models.CharField(max_length=64, blank=True)
    weight_kg = models.DecimalField(max_digits=8, decimal_places=3, default=0)
    length_cm = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    width_cm = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    height_cm = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    seasonality = models.CharField(max_length=24, default="all_season")
    images = models.JSONField(default=list, blank=True)
    stock_quantity = models.IntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.name_uz or self.name_ru


class Packaging(models.Model):
    store = models.ForeignKey("stores.Store", on_delete=models.CASCADE,
                              related_name="packagings")
    category = models.ForeignKey(Category, on_delete=models.SET_NULL,
                                 null=True, blank=True, related_name="packagings")
    name = models.CharField(max_length=128)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.name


class GlobalProduct(models.Model):
    """Store-independent global product catalog (shared across all stores)."""

    name_uz = models.CharField(max_length=255)
    name_ru = models.CharField(max_length=255)
    barcode = models.CharField(max_length=64, blank=True, db_index=True)
    ikpu = models.CharField(max_length=64, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    discount_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    unit = models.CharField(max_length=16, default="dona")
    brand = models.CharField(max_length=128, blank=True)
    model = models.CharField(max_length=128, blank=True)
    manufacturer = models.CharField(max_length=128, blank=True)
    weight_kg = models.DecimalField(max_digits=8, decimal_places=3, default=0)
    length_cm = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    width_cm = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    height_cm = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    image_url = models.URLField(max_length=500, blank=True)
    category_path = models.JSONField(default=list, blank=True)
    recommended_category = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.name_uz or self.name_ru
