from django.urls import path
from .views import (OrderCreateView, OrderListView, OrderStatusView,
                    BotOrderStatusView, StatsView, ClientsView, BroadcastView,
                    AnalyticsView)

urlpatterns = [
    path("orders", OrderCreateView.as_view()),
    path("admin/orders", OrderListView.as_view()),
    path("admin/orders/<int:pk>/status", OrderStatusView.as_view()),
    path("bot/order-status", BotOrderStatusView.as_view()),
    path("admin/stats", StatsView.as_view()),
    path("admin/analytics", AnalyticsView.as_view()),
    path("admin/customers", ClientsView.as_view()),
    path("admin/broadcast", BroadcastView.as_view()),
]
