from django.urls import path
from .views import StoreCreateView, StoreMeView

urlpatterns = [
    path("stores", StoreCreateView.as_view()),
    path("stores/me", StoreMeView.as_view()),
]
