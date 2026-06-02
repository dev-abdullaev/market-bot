import hmac
import logging
from decimal import Decimal
from datetime import timedelta
from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from django.shortcuts import get_object_or_404
from django.conf import settings
from apps.accounts.models import User
from apps.catalog.permissions import IsOperatorWithStore
from apps.notifications.telegram import send_message
from apps.notifications.broadcast import broadcast_to_customers
from .models import Order, OrderItem
from .serializers import OrderCreateSerializer, OrderSerializer

logger = logging.getLogger(__name__)

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
        if not settings.BOT_SHARED_SECRET or not hmac.compare_digest(secret, settings.BOT_SHARED_SECRET):
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
            try:
                send_message(customer_tg,
                             f"📦 Buyurtmangiz #{order.id} holati: <b>{new}</b>")
            except Exception:
                logger.exception("Failed to send status notification to customer %s for order %s",
                                 customer_tg, order.id)
        return Response({"ok": True, "order_id": order.id, "status": new,
                         "customer_telegram_id": customer_tg})


class StatsView(APIView):
    permission_classes = [IsOperatorWithStore]

    def get(self, request):
        store = request.user.store
        if not store:
            return Response({"detail": "No store"}, status=404)
        period = request.query_params.get("period", "30d")
        qs = Order.objects.filter(store=store).exclude(status="cancelled")
        now = timezone.now()
        if period == "today":
            qs = qs.filter(created_at__date=now.date())
        elif period == "7d":
            qs = qs.filter(created_at__gte=now - timedelta(days=7))
        elif period == "30d":
            qs = qs.filter(created_at__gte=now - timedelta(days=30))
        agg = qs.aggregate(revenue=Sum("total_amount"), cnt=Count("id"))
        revenue = agg["revenue"] or Decimal("0")
        cnt = agg["cnt"] or 0
        avg = (revenue / cnt) if cnt else Decimal("0")
        top = (OrderItem.objects.filter(order__in=qs)
               .values("product_name")
               .annotate(qty=Sum("quantity"), rev=Sum("line_total"))
               .order_by("-qty")[:5])
        return Response({
            "period": period,
            "revenue": f"{revenue:.2f}",
            "orders_count": cnt,
            "avg_check": f"{avg:.2f}",
            "top_products": [{"name": t["product_name"], "qty": t["qty"],
                              "revenue": f"{t['rev']:.2f}"} for t in top],
        })


class ClientsView(APIView):
    permission_classes = [IsOperatorWithStore]

    def get(self, request):
        store = request.user.store
        if not store:
            return Response({"detail": "No store"}, status=404)
        rows = (Order.objects.filter(store=store, customer__isnull=False)
                .values("customer_id", "customer__full_name", "customer__phone",
                        "customer__telegram_id")
                .annotate(orders_count=Count("id"), total=Sum("total_amount"))
                .order_by("-total"))
        return Response([{
            "id": r["customer_id"],
            "full_name": r["customer__full_name"],
            "phone": r["customer__phone"],
            "telegram_id": r["customer__telegram_id"],
            "orders_count": r["orders_count"],
            "total_spent": f"{r['total'] or 0:.2f}",
        } for r in rows])


class BroadcastView(APIView):
    permission_classes = [IsOperatorWithStore]

    def post(self, request):
        store = request.user.store
        if not store:
            return Response({"detail": "No store"}, status=404)
        text = (request.data.get("text") or "").strip()
        if not text:
            return Response({"detail": "Text required"}, status=400)
        sent = broadcast_to_customers(store, text)
        return Response({"sent": sent})
