"""
TDD tests for:
  - GET /api/admin/analytics (AnalyticsView)
  - GET /api/admin/orders?date_from=&date_to= (OrderListView date-range filter)

Written BEFORE implementation.
"""
import pytest
from decimal import Decimal
from datetime import date, datetime, timezone as dt_timezone
from rest_framework.test import APIClient
from django.utils import timezone

from apps.accounts.models import User
from apps.stores.models import Store
from apps.orders.models import Order, OrderItem, Customer
from apps.catalog.models import Product

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_store(name="TestStore", phone="1", service_fee="500.00", currency_code="UZS"):
    return Store.objects.create(
        name=name, phone=phone,
        service_fee=Decimal(service_fee),
        currency_code=currency_code,
    )


def _make_operator(store, username=None):
    username = username or f"op_{store.id}"
    u = User.objects.create_user(username=username, role="operator", store=store)
    c = APIClient()
    c.force_authenticate(user=u)
    return c, u


def _make_order(store, status="delivered", total=Decimal("10000"),
                lat=None, lng=None, customer=None, payment_method="cash",
                created_at=None):
    """Create an order, optionally overriding created_at."""
    o = Order.objects.create(
        store=store,
        customer=customer,
        customer_name=customer.full_name if customer else "Guest",
        customer_phone="998",
        status=status,
        total_amount=total,
        latitude=lat,
        longitude=lng,
        payment_method=payment_method,
    )
    if created_at is not None:
        # Force-set created_at (auto_now_add won't let us pass it via create)
        Order.objects.filter(pk=o.pk).update(created_at=created_at)
        o.refresh_from_db()
    return o


def _today_dt(hour=10):
    """Return a timezone-aware datetime for today at `hour` in Asia/Tashkent."""
    import zoneinfo
    tz = zoneinfo.ZoneInfo("Asia/Tashkent")
    d = date.today()
    return datetime(d.year, d.month, d.day, hour, 0, 0, tzinfo=tz)


# ---------------------------------------------------------------------------
# Analytics endpoint — basic shape & computation
# ---------------------------------------------------------------------------

class TestAnalyticsBasic:

    def test_returns_200_and_correct_shape(self):
        s = _make_store()
        c, _ = _make_operator(s)
        r = c.get("/api/admin/analytics")
        assert r.status_code == 200
        d = r.json()
        # Top-level keys
        for key in ("period", "date", "currency_code", "revenue", "orders",
                    "packaging_total", "service_fee_total", "avg_check",
                    "peak_hour", "status_counts", "payments", "hourly",
                    "geography", "top_products", "top_customers",
                    "product_views", "reviews", "segments"):
            assert key in d, f"Missing key: {key}"

    def test_empty_store_returns_zeros(self):
        s = _make_store(currency_code="UZS")
        c, _ = _make_operator(s)
        r = c.get("/api/admin/analytics")
        assert r.status_code == 200
        d = r.json()
        assert d["currency_code"] == "UZS"
        assert d["revenue"]["total"] == "0.00"
        assert d["revenue"]["products"] == "0.00"
        assert d["revenue"]["delivery"] == "0.00"
        assert d["orders"]["total"] == 0
        assert d["orders"]["delivered"] == 0
        assert d["service_fee_total"] == "0.00"
        assert d["avg_check"] == "0.00"
        assert d["peak_hour"] is None
        # status_counts must have all 6 keys at zero
        sc = d["status_counts"]
        for k in ("new", "accepted", "preparing", "delivering", "delivered", "cancelled"):
            assert sc[k] == 0, f"status_counts[{k}] should be 0"
        # payments — 7 rows
        assert len(d["payments"]) == 7
        for row in d["payments"]:
            assert row["count"] == 0
            assert row["sum"] == "0.00"
        # hourly — exactly 24 buckets each
        assert len(d["hourly"]["finance"]) == 24
        assert len(d["hourly"]["orders"]) == 24
        for i, label in enumerate(
                [f"{h:02d}:00" for h in range(24)]):
            assert d["hourly"]["finance"][i]["hour"] == label
            assert d["hourly"]["orders"][i]["hour"] == label

    def test_revenue_excludes_cancelled(self):
        s = _make_store()
        c, _ = _make_operator(s)
        _make_order(s, status="delivered", total=Decimal("10000"),
                    created_at=_today_dt())
        _make_order(s, status="cancelled", total=Decimal("99999"),
                    created_at=_today_dt())
        d = c.get("/api/admin/analytics").json()
        assert d["revenue"]["total"] == "10000.00"
        assert d["orders"]["total"] == 1

    def test_orders_delivered_count(self):
        s = _make_store()
        c, _ = _make_operator(s)
        _make_order(s, status="delivered", total=Decimal("5000"), created_at=_today_dt())
        _make_order(s, status="new", total=Decimal("5000"), created_at=_today_dt())
        d = c.get("/api/admin/analytics").json()
        assert d["orders"]["total"] == 2
        assert d["orders"]["delivered"] == 1

    def test_service_fee_total(self):
        s = _make_store(service_fee="300.00")
        c, _ = _make_operator(s)
        _make_order(s, status="delivered", total=Decimal("5000"), created_at=_today_dt())
        _make_order(s, status="new", total=Decimal("5000"), created_at=_today_dt())
        d = c.get("/api/admin/analytics").json()
        # 2 non-cancelled × 300 = 600
        assert d["service_fee_total"] == "600.00"

    def test_avg_check(self):
        s = _make_store()
        c, _ = _make_operator(s)
        _make_order(s, status="delivered", total=Decimal("10000"), created_at=_today_dt())
        _make_order(s, status="delivered", total=Decimal("20000"), created_at=_today_dt())
        d = c.get("/api/admin/analytics").json()
        assert d["avg_check"] == "15000.00"

    def test_status_counts(self):
        s = _make_store()
        c, _ = _make_operator(s)
        _make_order(s, status="new", total=Decimal("1000"), created_at=_today_dt())
        _make_order(s, status="preparing", total=Decimal("1000"), created_at=_today_dt())
        _make_order(s, status="cancelled", total=Decimal("1000"), created_at=_today_dt())
        d = c.get("/api/admin/analytics").json()
        sc = d["status_counts"]
        assert sc["new"] == 1
        assert sc["preparing"] == 1
        assert sc["cancelled"] == 1
        assert sc["delivered"] == 0
        assert sc["accepted"] == 0

    def test_cash_payment_row_populated(self):
        s = _make_store()
        c, _ = _make_operator(s)
        _make_order(s, status="delivered", total=Decimal("8000"),
                    payment_method="cash", created_at=_today_dt())
        _make_order(s, status="delivered", total=Decimal("2000"),
                    payment_method="cash", created_at=_today_dt())
        d = c.get("/api/admin/analytics").json()
        payments = {row["type"]: row for row in d["payments"]}
        cash = payments["cash"]
        assert cash["count"] == 2
        assert cash["sum"] == "10000.00"
        # 2/2 = 100%
        assert cash["percent"] == 100.0
        # All other payment types still zero
        assert payments["payme"]["count"] == 0

    def test_hourly_buckets_populated(self):
        s = _make_store()
        c, _ = _make_operator(s)
        # Create 2 orders at hour 14 today
        _make_order(s, status="delivered", total=Decimal("5000"),
                    created_at=_today_dt(hour=14))
        _make_order(s, status="delivered", total=Decimal("3000"),
                    created_at=_today_dt(hour=14))
        d = c.get("/api/admin/analytics").json()
        fin = {row["hour"]: row["value"] for row in d["hourly"]["finance"]}
        ord_ = {row["hour"]: row["value"] for row in d["hourly"]["orders"]}
        assert fin["14:00"] == 8000
        assert ord_["14:00"] == 2

    def test_peak_hour(self):
        s = _make_store()
        c, _ = _make_operator(s)
        _make_order(s, status="delivered", total=Decimal("1000"),
                    created_at=_today_dt(hour=9))
        _make_order(s, status="delivered", total=Decimal("1000"),
                    created_at=_today_dt(hour=14))
        _make_order(s, status="delivered", total=Decimal("1000"),
                    created_at=_today_dt(hour=14))
        d = c.get("/api/admin/analytics").json()
        assert d["peak_hour"] == "14:00"

    def test_geography_points(self):
        s = _make_store()
        c, _ = _make_operator(s)
        _make_order(s, status="delivered", total=Decimal("1000"),
                    lat=Decimal("41.3111111"), lng=Decimal("69.2400000"),
                    created_at=_today_dt())
        # cancelled with coords should be excluded
        _make_order(s, status="cancelled", total=Decimal("1000"),
                    lat=Decimal("40.0"), lng=Decimal("68.0"),
                    created_at=_today_dt())
        # order without coords should be excluded
        _make_order(s, status="delivered", total=Decimal("1000"),
                    created_at=_today_dt())
        d = c.get("/api/admin/analytics").json()
        geo = d["geography"]
        assert len(geo) == 1
        assert geo[0]["lat"] == "41.3111111"
        assert geo[0]["lng"] == "69.2400000"
        assert geo[0]["count"] == 1

    def test_top_products(self):
        s = _make_store()
        c, _ = _make_operator(s)
        p1 = Product.objects.create(store=s, name_uz="Kola", name_ru="Kola",
                                    price=Decimal("5000"))
        p2 = Product.objects.create(store=s, name_uz="Burger", name_ru="Burger",
                                    price=Decimal("12000"))
        o1 = _make_order(s, status="delivered", total=Decimal("15000"),
                         created_at=_today_dt())
        OrderItem.objects.create(order=o1, product=p1, product_name="Kola",
                                 price=Decimal("5000"), quantity=3,
                                 line_total=Decimal("15000"))
        o2 = _make_order(s, status="delivered", total=Decimal("12000"),
                         created_at=_today_dt())
        OrderItem.objects.create(order=o2, product=p2, product_name="Burger",
                                 price=Decimal("12000"), quantity=1,
                                 line_total=Decimal("12000"))
        d = c.get("/api/admin/analytics").json()
        tp = d["top_products"]
        assert tp[0]["name"] == "Kola"
        assert tp[0]["qty"] == 3
        assert tp[0]["revenue"] == "15000.00"

    def test_top_customers(self):
        s = _make_store()
        c, _ = _make_operator(s)
        cust = Customer.objects.create(telegram_id="tg99", full_name="Ali", phone="998")
        _make_order(s, status="delivered", total=Decimal("8000"),
                    customer=cust, created_at=_today_dt())
        _make_order(s, status="delivered", total=Decimal("7000"),
                    customer=cust, created_at=_today_dt())
        d = c.get("/api/admin/analytics").json()
        tc = d["top_customers"]
        assert len(tc) >= 1
        assert tc[0]["name"] == "Ali"
        assert tc[0]["orders_count"] == 2
        assert tc[0]["total_spent"] == "15000.00"

    def test_static_stub_fields(self):
        s = _make_store()
        c, _ = _make_operator(s)
        d = c.get("/api/admin/analytics").json()
        assert d["product_views"] == []
        assert d["reviews"]["average"] == "0.00"
        assert d["reviews"]["count"] == 0
        assert len(d["segments"]) == 2
        assert d["segments"][0]["customers"] == 0

    def test_packaging_total_is_zero(self):
        """We don't track packaging separately yet."""
        s = _make_store()
        c, _ = _make_operator(s)
        d = c.get("/api/admin/analytics").json()
        assert d["packaging_total"] == "0.00"

    def test_default_period_and_date_params(self):
        s = _make_store()
        c, _ = _make_operator(s)
        d = c.get("/api/admin/analytics").json()
        assert d["period"] == "day"
        from datetime import date
        assert d["date"] == str(date.today())


# ---------------------------------------------------------------------------
# Period filtering
# ---------------------------------------------------------------------------

class TestAnalyticsPeriods:

    def _setup(self):
        s = _make_store()
        c, _ = _make_operator(s)
        return c, s

    def test_day_filter_excludes_other_days(self):
        c, s = self._setup()
        today = date.today()
        # Order today
        _make_order(s, status="delivered", total=Decimal("1000"),
                    created_at=_today_dt())
        # Order yesterday — should be excluded
        from datetime import timedelta
        yesterday = datetime(today.year, today.month, today.day,
                             10, 0, 0, tzinfo=dt_timezone.utc) - timedelta(days=1)
        _make_order(s, status="delivered", total=Decimal("9999"),
                    created_at=yesterday)
        d = c.get(f"/api/admin/analytics?period=day&date={today}").json()
        assert d["orders"]["total"] == 1
        assert d["revenue"]["total"] == "1000.00"

    def test_month_filter(self):
        c, s = self._setup()
        today = date.today()
        # Order this month
        _make_order(s, status="delivered", total=Decimal("2000"),
                    created_at=_today_dt())
        # Order far in the past (different month/year)
        past = datetime(2020, 1, 1, 10, 0, 0, tzinfo=dt_timezone.utc)
        _make_order(s, status="delivered", total=Decimal("99999"),
                    created_at=past)
        d = c.get(f"/api/admin/analytics?period=month&date={today}").json()
        assert d["orders"]["total"] == 1
        assert d["revenue"]["total"] == "2000.00"

    def test_year_filter(self):
        c, s = self._setup()
        today = date.today()
        _make_order(s, status="delivered", total=Decimal("3000"),
                    created_at=_today_dt())
        past = datetime(2020, 6, 1, 10, 0, 0, tzinfo=dt_timezone.utc)
        _make_order(s, status="delivered", total=Decimal("99999"),
                    created_at=past)
        d = c.get(f"/api/admin/analytics?period=year&date={today}").json()
        assert d["orders"]["total"] == 1
        assert d["revenue"]["total"] == "3000.00"

    def test_invalid_period_defaults_to_day(self):
        c, s = self._setup()
        r = c.get("/api/admin/analytics?period=week")
        assert r.status_code == 200
        assert r.json()["period"] == "day"

    def test_invalid_date_returns_400(self):
        c, s = self._setup()
        r = c.get("/api/admin/analytics?date=not-a-date")
        assert r.status_code == 400


# ---------------------------------------------------------------------------
# Tenant isolation for analytics
# ---------------------------------------------------------------------------

class TestAnalyticsTenantIsolation:

    def test_other_store_orders_not_counted(self):
        s1 = _make_store(name="Store1", phone="11")
        s2 = _make_store(name="Store2", phone="22")
        c1, _ = _make_operator(s1, username="op1")
        # Put orders only in store2
        _make_order(s2, status="delivered", total=Decimal("50000"),
                    created_at=_today_dt())
        d = c1.get("/api/admin/analytics").json()
        assert d["orders"]["total"] == 0
        assert d["revenue"]["total"] == "0.00"

    def test_currency_code_from_own_store(self):
        s1 = _make_store(name="UZS Store", phone="11", currency_code="UZS")
        s2 = _make_store(name="USD Store", phone="22", currency_code="USD")
        c1, _ = _make_operator(s1, username="op1")
        d = c1.get("/api/admin/analytics").json()
        assert d["currency_code"] == "UZS"

    def test_top_products_tenant_isolated(self):
        s1 = _make_store(name="S1", phone="11")
        s2 = _make_store(name="S2", phone="22")
        c1, _ = _make_operator(s1, username="op1")
        p = Product.objects.create(store=s2, name_uz="Pizza", name_ru="Pizza",
                                   price=Decimal("20000"))
        o = _make_order(s2, status="delivered", total=Decimal("20000"),
                        created_at=_today_dt())
        OrderItem.objects.create(order=o, product=p, product_name="Pizza",
                                 price=Decimal("20000"), quantity=5,
                                 line_total=Decimal("100000"))
        d = c1.get("/api/admin/analytics").json()
        assert d["top_products"] == []


# ---------------------------------------------------------------------------
# Orders date-range filter
# ---------------------------------------------------------------------------

class TestOrdersDateRangeFilter:

    def _setup(self):
        s = _make_store(name="DR", phone="99")
        c, _ = _make_operator(s, username="dr_op")
        return c, s

    def test_date_from_filters_older_orders(self):
        c, s = self._setup()
        today = date.today()
        from datetime import timedelta
        yesterday = datetime(today.year, today.month, today.day,
                             12, 0, 0, tzinfo=dt_timezone.utc) - timedelta(days=1)
        _make_order(s, status="new", total=Decimal("100"), created_at=_today_dt())
        old = _make_order(s, status="new", total=Decimal("999"), created_at=yesterday)
        data = c.get(f"/api/admin/orders?date_from={today}").json()
        ids = [o["id"] for o in data]
        assert old.id not in ids

    def test_date_to_filters_newer_orders(self):
        c, s = self._setup()
        today = date.today()
        from datetime import timedelta
        tomorrow_dt = datetime(today.year, today.month, today.day,
                               12, 0, 0, tzinfo=dt_timezone.utc) + timedelta(days=1)
        today_order = _make_order(s, status="new", total=Decimal("100"),
                                  created_at=_today_dt())
        future = _make_order(s, status="new", total=Decimal("999"),
                             created_at=tomorrow_dt)
        # date_to=today → future order excluded
        data = c.get(f"/api/admin/orders?date_to={today}").json()
        ids = [o["id"] for o in data]
        assert today_order.id in ids
        assert future.id not in ids

    def test_date_from_and_date_to_range(self):
        c, s = self._setup()
        today = date.today()
        from datetime import timedelta
        yesterday_dt = datetime(today.year, today.month, today.day,
                                12, 0, 0, tzinfo=dt_timezone.utc) - timedelta(days=1)
        tomorrow_dt = datetime(today.year, today.month, today.day,
                               12, 0, 0, tzinfo=dt_timezone.utc) + timedelta(days=1)
        yesterday = (today - timedelta(days=1))
        tomorrow = (today + timedelta(days=1))
        o_yesterday = _make_order(s, status="new", total=Decimal("10"),
                                  created_at=yesterday_dt)
        o_today = _make_order(s, status="new", total=Decimal("20"),
                              created_at=_today_dt())
        o_tomorrow = _make_order(s, status="new", total=Decimal("30"),
                                 created_at=tomorrow_dt)
        data = c.get(f"/api/admin/orders?date_from={today}&date_to={today}").json()
        ids = [o["id"] for o in data]
        assert o_today.id in ids
        assert o_yesterday.id not in ids
        assert o_tomorrow.id not in ids

    def test_date_range_combined_with_status(self):
        c, s = self._setup()
        today = date.today()
        o1 = _make_order(s, status="new", total=Decimal("10"), created_at=_today_dt())
        o2 = _make_order(s, status="delivered", total=Decimal("20"),
                         created_at=_today_dt())
        data = c.get(f"/api/admin/orders?date_from={today}&date_to={today}&status=new").json()
        ids = [o["id"] for o in data]
        assert o1.id in ids
        assert o2.id not in ids

    def test_date_range_tenant_isolated(self):
        c, s = self._setup()
        s2 = _make_store(name="Other", phone="777")
        today = date.today()
        other_order = _make_order(s2, status="new", total=Decimal("999"),
                                  created_at=_today_dt())
        data = c.get(f"/api/admin/orders?date_from={today}&date_to={today}").json()
        ids = [o["id"] for o in data]
        assert other_order.id not in ids
