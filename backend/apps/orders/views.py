import hmac
import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import timedelta, date as date_type, datetime
from django.db.models import Sum, Count, Q
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
        if st:
            qs = qs.filter(status=st)
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        return qs


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


class AnalyticsView(APIView):
    """
    GET /api/admin/analytics?period=day|month|year&date=YYYY-MM-DD

    Returns comprehensive analytics scoped to request.user.store.
    period defaults to "day"; date defaults to today.
    """
    permission_classes = [IsOperatorWithStore]

    # Payment types as ordered in the spec
    _PAYMENT_TYPES = [
        ("payme", "Payme"),
        ("click", "Click"),
        ("uzum", "Uzum bank"),
        ("xazna", "Xazna"),
        ("bank", "Bank"),
        ("card", "Karta"),
        ("cash", "Naqd"),
    ]

    def get(self, request):
        store = request.user.store

        # --- Parse & validate params ---
        raw_period = request.query_params.get("period", "day")
        period = raw_period if raw_period in ("day", "month", "year") else "day"

        raw_date = request.query_params.get("date", "")
        if raw_date:
            try:
                ref_date = date_type.fromisoformat(raw_date)
            except ValueError:
                return Response({"detail": "Invalid date format, use YYYY-MM-DD"}, status=400)
        else:
            ref_date = date_type.today()

        # --- Build period queryset ---
        base_qs = Order.objects.filter(store=store)
        if period == "day":
            base_qs = base_qs.filter(created_at__date=ref_date)
        elif period == "month":
            base_qs = base_qs.filter(
                created_at__year=ref_date.year,
                created_at__month=ref_date.month,
            )
        else:  # year
            base_qs = base_qs.filter(created_at__year=ref_date.year)

        non_cancelled = base_qs.exclude(status="cancelled")

        # --- Revenue & order aggregates ---
        agg = non_cancelled.aggregate(
            total_revenue=Sum("total_amount"),
            total_orders=Count("id"),
            delivered_count=Count("id", filter=Q(status="delivered")),
        )
        total_revenue = agg["total_revenue"] or Decimal("0")
        total_orders = agg["total_orders"] or 0
        delivered_count = agg["delivered_count"] or 0

        avg_check = (total_revenue / total_orders) if total_orders else Decimal("0")
        service_fee_total = store.service_fee * total_orders

        # --- Status counts (all 6 buckets including "accepted" = always 0) ---
        status_rows = base_qs.values("status").annotate(cnt=Count("id"))
        status_map = {r["status"]: r["cnt"] for r in status_rows}
        status_counts = {
            "new": status_map.get("new", 0),
            "accepted": 0,
            "preparing": status_map.get("preparing", 0),
            "delivering": status_map.get("delivering", 0),
            "delivered": status_map.get("delivered", 0),
            "cancelled": status_map.get("cancelled", 0),
        }

        # --- Payments ---
        payment_rows = (
            non_cancelled
            .values("payment_method")
            .annotate(cnt=Count("id"), total=Sum("total_amount"))
        )
        payment_map = {r["payment_method"]: r for r in payment_rows}
        payments = []
        for ptype, label in self._PAYMENT_TYPES:
            row = payment_map.get(ptype)
            if row:
                cnt = row["cnt"]
                psum = row["total"] or Decimal("0")
                pct = round(cnt / total_orders * 100, 2) if total_orders else 0.0
            else:
                cnt = 0
                psum = Decimal("0")
                pct = 0.0
            payments.append({
                "type": ptype,
                "label": label,
                "count": cnt,
                "percent": pct,
                "sum": f"{psum:.2f}",
            })

        # --- Hourly buckets ---
        hourly_rows = (
            non_cancelled
            .values("created_at__hour")
            .annotate(cnt=Count("id"), rev=Sum("total_amount"))
        )
        hourly_map = {r["created_at__hour"]: r for r in hourly_rows}
        hourly_finance = []
        hourly_orders = []
        peak_count = 0
        peak_hour = None
        for h in range(24):
            label = f"{h:02d}:00"
            row = hourly_map.get(h)
            if row:
                rev_val = int(row["rev"] or 0)
                ord_val = row["cnt"]
            else:
                rev_val = 0
                ord_val = 0
            hourly_finance.append({"hour": label, "value": rev_val})
            hourly_orders.append({"hour": label, "value": ord_val})
            if ord_val > peak_count:
                peak_count = ord_val
                peak_hour = label
        if peak_count == 0:
            peak_hour = None

        # --- Geography ---
        geo_qs = non_cancelled.filter(
            latitude__isnull=False, longitude__isnull=False
        ).values("latitude", "longitude").annotate(cnt=Count("id"))
        geography = [
            {"lat": str(r["latitude"]), "lng": str(r["longitude"]), "count": r["cnt"]}
            for r in geo_qs
        ]

        # --- Top products ---
        top_products_qs = (
            OrderItem.objects
            .filter(order__in=non_cancelled)
            .values("product_name")
            .annotate(qty=Sum("quantity"), rev=Sum("line_total"))
            .order_by("-qty")[:5]
        )
        top_products = [
            {"name": t["product_name"], "qty": t["qty"],
             "revenue": f"{t['rev'] or Decimal('0'):.2f}"}
            for t in top_products_qs
        ]

        # --- Top customers ---
        top_customers_qs = (
            non_cancelled
            .filter(customer__isnull=False)
            .values("customer_id", "customer__full_name")
            .annotate(orders_count=Count("id"), total_spent=Sum("total_amount"))
            .order_by("-total_spent")[:5]
        )
        top_customers = [
            {
                "name": r["customer__full_name"] or "",
                "orders_count": r["orders_count"],
                "total_spent": f"{r['total_spent'] or Decimal('0'):.2f}",
            }
            for r in top_customers_qs
        ]

        # --- Static stubs ---
        product_views = []
        reviews = {
            "average": "0.00",
            "count": 0,
            "comment_share": 0.0,
            "low_share": 0.0,
            "distribution": {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0},
            "top_products": [],
            "recent": [],
        }
        segments = [
            {"name": "Segment 1", "customers": 0, "sales_qty": 0, "sum": "0.00"},
            {"name": "Segment 2", "customers": 0, "sales_qty": 0, "sum": "0.00"},
        ]

        return Response({
            "period": period,
            "date": str(ref_date),
            "currency_code": store.currency_code,
            "revenue": {
                "total": f"{total_revenue:.2f}",
                "products": f"{total_revenue:.2f}",
                "delivery": "0.00",
            },
            "orders": {
                "total": total_orders,
                "delivered": delivered_count,
            },
            "packaging_total": "0.00",
            "service_fee_total": f"{service_fee_total:.2f}",
            "avg_check": f"{avg_check:.2f}",
            "peak_hour": peak_hour,
            "status_counts": status_counts,
            "payments": payments,
            "hourly": {
                "finance": hourly_finance,
                "orders": hourly_orders,
            },
            "geography": geography,
            "top_products": top_products,
            "top_customers": top_customers,
            "product_views": product_views,
            "reviews": reviews,
            "segments": segments,
        })


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
