from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from django.shortcuts import get_object_or_404
from django.conf import settings
from apps.accounts.models import User
from apps.notifications.telegram import send_message
from .models import Order
from .serializers import OrderCreateSerializer, OrderSerializer

VALID_STATUSES = {s for s, _ in Order.STATUS}


class OrderCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = OrderCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        order = ser.save()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        qs = Order.objects.filter(store=self.request.user.store)
        st = self.request.query_params.get("status")
        return qs.filter(status=st) if st else qs


class OrderStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        order = get_object_or_404(Order, pk=pk, store=request.user.store)
        new = request.data.get("status")
        if new not in VALID_STATUSES:
            return Response({"detail": "Invalid status"}, status=400)
        order.status = new
        order.save(update_fields=["status", "updated_at"])
        return Response(OrderSerializer(order).data)


class BotOrderStatusView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        secret = request.headers.get("X-Bot-Secret", "")
        if not settings.BOT_SHARED_SECRET or secret != settings.BOT_SHARED_SECRET:
            return Response({"detail": "forbidden"}, status=403)
        new = request.data.get("status")
        if new not in VALID_STATUSES:
            return Response({"detail": "Invalid status"}, status=400)
        operator = User.objects.filter(
            telegram_id=str(request.data.get("telegram_id")), role="operator").first()
        if not operator or not operator.store_id:
            return Response({"detail": "not found"}, status=404)
        order = Order.objects.filter(pk=request.data.get("order_id"),
                                     store_id=operator.store_id).first()
        if not order:
            return Response({"detail": "not found"}, status=404)
        order.status = new
        order.save(update_fields=["status", "updated_at"])
        customer_tg = order.customer.telegram_id if order.customer else None
        if customer_tg:
            send_message(customer_tg,
                         f"📦 Buyurtmangiz #{order.id} holati: <b>{new}</b>")
        return Response({"ok": True, "order_id": order.id, "status": new,
                         "customer_telegram_id": customer_tg})
