from django.db import models
from django.utils import timezone


class Customer(models.Model):
    telegram_id = models.CharField(max_length=32, unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    last_address = models.CharField(max_length=512, blank=True)
    last_latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    last_longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.full_name or self.telegram_id


class Order(models.Model):
    STATUS = [("new", "new"), ("preparing", "preparing"), ("delivering", "delivering"),
              ("delivered", "delivered"), ("cancelled", "cancelled")]
    PAYMENT = [("cash", "cash")]

    store = models.ForeignKey("stores.Store", on_delete=models.CASCADE, related_name="orders")
    customer = models.ForeignKey(Customer, null=True, blank=True,
                                 on_delete=models.SET_NULL, related_name="orders")
    customer_name = models.CharField(max_length=255)
    customer_phone = models.CharField(max_length=32)
    status = models.CharField(max_length=16, choices=STATUS, default="new")
    delivery_address = models.CharField(max_length=512, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=16, choices=PAYMENT, default="cash")
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order #{self.pk} ({self.status})"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("catalog.Product", null=True, on_delete=models.SET_NULL)
    product_name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)


class Segment(models.Model):
    store = models.ForeignKey("stores.Store", on_delete=models.CASCADE, related_name="segments")
    name = models.CharField(max_length=64)
    sort_order = models.IntegerField(default=1)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.name


class StoreCustomer(models.Model):
    """Per-store customer profile — segment assignment."""
    store = models.ForeignKey("stores.Store", on_delete=models.CASCADE, related_name="store_customers")
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="store_profiles")
    segment = models.ForeignKey(Segment, on_delete=models.SET_NULL, null=True, blank=True, related_name="customers")

    class Meta:
        unique_together = [("store", "customer")]


class ScheduledBroadcast(models.Model):
    REPEAT_CHOICES = [("once", "once"), ("daily", "daily"), ("weekly", "weekly")]
    STATUS_CHOICES = [
        ("pending", "pending"),
        ("sent", "sent"),
        ("failed", "failed"),
        ("cancelled", "cancelled"),
    ]

    store = models.ForeignKey(
        "stores.Store", on_delete=models.CASCADE, related_name="scheduled_broadcasts"
    )
    text = models.TextField()
    image_url = models.URLField(max_length=500, blank=True)
    repeat = models.CharField(max_length=8, choices=REPEAT_CHOICES, default="once")
    scheduled_at = models.DateTimeField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    sent_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["scheduled_at"]

    def __str__(self):
        return f"ScheduledBroadcast #{self.pk} ({self.status}) store={self.store_id}"
