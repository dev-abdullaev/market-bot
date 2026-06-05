from django.urls import path
from .views import LoginView, TelegramWebAppView, MeView, LogoutView, TelegramVerifyView

urlpatterns = [
    path("login", LoginView.as_view()),
    path("telegram-webapp", TelegramWebAppView.as_view()),
    path("telegram/verify", TelegramVerifyView.as_view()),
    path("me", MeView.as_view()),
    path("logout", LogoutView.as_view()),
]
