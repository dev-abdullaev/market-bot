from django.urls import path
from .views import StoreCreateView, StoreMeView, StoreLogoView

urlpatterns = [
    path("stores", StoreCreateView.as_view()),
    path("stores/me", StoreMeView.as_view()),
    path("stores/me/logo", StoreLogoView.as_view()),
]
