from django.urls import path
from .views import OrderCreateView, OrderListView, OrderStatusView, BotOrderStatusView

urlpatterns = [
    path("orders", OrderCreateView.as_view()),
    path("admin/orders", OrderListView.as_view()),
    path("admin/orders/<int:pk>/status", OrderStatusView.as_view()),
    path("bot/order-status", BotOrderStatusView.as_view()),
]
