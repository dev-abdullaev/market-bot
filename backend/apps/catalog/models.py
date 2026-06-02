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

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.name_uz or self.name_ru
