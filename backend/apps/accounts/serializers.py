from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    store_id = serializers.IntegerField(source="store.id", read_only=True, default=None)
    store_name = serializers.CharField(source="store.name", read_only=True, default=None)
    store_slug = serializers.CharField(source="store.slug", read_only=True, default=None)

    class Meta:
        model = User
        fields = ["id", "username", "full_name", "phone", "telegram_id", "role",
                  "store_id", "store_name", "store_slug", "is_staff"]
