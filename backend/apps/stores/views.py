import os

from django.core.files.storage import default_storage
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Store
from .serializers import StoreSerializer

class StoreCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Fix 3: block re-registration — orphaning a store's catalog/orders is
        # a data-integrity hazard; one user may own at most one store.
        if request.user.store_id:
            return Response(
                {"detail": "You already own a store. Use PATCH /api/stores/me to update it."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = StoreSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        store = ser.save()
        user = request.user
        user.store = store
        user.role = "operator"
        if not user.phone:
            user.phone = store.phone
        user.save(update_fields=["store", "role", "phone"])
        return Response(StoreSerializer(store).data, status=status.HTTP_201_CREATED)

class StoreMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.store_id:
            return Response({"detail": "No store"}, status=404)
        return Response(StoreSerializer(request.user.store).data)

    def patch(self, request):
        if not request.user.store_id:
            return Response({"detail": "No store"}, status=404)
        ser = StoreSerializer(request.user.store, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


class StoreLogoView(APIView):
    """Upload a logo for the authenticated user's store.

    POST multipart ``file`` field.  Saves to ``logos/<store_id>_<basename>``
    via default_storage and sets ``store.logo_url``.
    Returns ``{"logo_url": "<absolute url>"}``.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if not request.user.store_id:
            return Response({"detail": "No store"}, status=404)
        f = request.FILES.get("file")
        if not f:
            return Response({"detail": "No file"}, status=400)
        safe_name = os.path.basename(f.name)
        store = request.user.store
        path = default_storage.save(f"logos/{store.id}_{safe_name}", f)
        url = request.build_absolute_uri(default_storage.url(path))
        store.logo_url = url
        store.save(update_fields=["logo_url"])
        return Response({"logo_url": url})
