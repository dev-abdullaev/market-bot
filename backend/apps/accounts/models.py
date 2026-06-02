from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [("operator", "Operator"), ("customer", "Customer")]

    username = models.CharField(max_length=32, unique=True)   # phone
    full_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    telegram_id = models.CharField(max_length=32, unique=True, null=True, blank=True)
    role = models.CharField(max_length=16, choices=ROLE_CHOICES, default="customer")
    store = models.ForeignKey("stores.Store", null=True, blank=True,
                              on_delete=models.SET_NULL, related_name="operators")
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "username"
    objects = UserManager()

    def __str__(self):
        return f"{self.full_name or self.username} ({self.role})"
