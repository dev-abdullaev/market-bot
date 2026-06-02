from django.db import models


class PromoCode(models.Model):
    TYPES = [("percent", "percent"), ("fixed", "fixed")]
    store = models.ForeignKey("stores.Store", on_delete=models.CASCADE, related_name="promos")
    code = models.CharField(max_length=32)
    discount_type = models.CharField(max_length=8, choices=TYPES, default="percent")
    discount_value = models.DecimalField(max_digits=12, decimal_places=2)
    is_active = models.BooleanField(default=True)
    valid_until = models.DateField(null=True, blank=True)
    usage_limit = models.IntegerField(null=True, blank=True)
    used_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = [("store", "code")]

    def __str__(self):
        return f"{self.code} ({self.store})"
