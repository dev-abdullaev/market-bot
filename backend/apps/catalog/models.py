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
