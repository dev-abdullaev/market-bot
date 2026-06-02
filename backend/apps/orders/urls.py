from django.urls import path
from .views import OrderCreateView, OrderListView, OrderStatusView

urlpatterns = [
    path("orders", OrderCreateView.as_view()),
    path("admin/orders", OrderListView.as_view()),
    path("admin/orders/<int:pk>/status", OrderStatusView.as_view()),
]
