from rest_framework import viewsets
from apps.catalog.permissions import IsOperatorWithStore
from .models import PromoCode
from .serializers import PromoCodeSerializer


class PromoViewSet(viewsets.ModelViewSet):
    serializer_class = PromoCodeSerializer
    permission_classes = [IsOperatorWithStore]

    def get_queryset(self):
        return PromoCode.objects.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)
