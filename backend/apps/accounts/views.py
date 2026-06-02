from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from .serializers import UserSerializer
from .telegram import parse_init_data

def _tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh),
            "user": UserSerializer(user).data}

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user = authenticate(username=request.data.get("username"),
                            password=request.data.get("password"))
        if not user:
            return Response({"detail": "Invalid credentials"}, status=401)
        return Response(_tokens(user))

class TelegramWebAppView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        tg = parse_init_data(request.data.get("init_data", ""), settings.TELEGRAM_BOT_TOKEN)
        if not tg or "id" not in tg:
            return Response({"detail": "Invalid init data"}, status=401)
        tg_id = str(tg["id"])
        user, _ = User.objects.get_or_create(
            telegram_id=tg_id,
            defaults={"username": f"tg{tg_id}",
                      "full_name": tg.get("first_name", "")})
        return Response(_tokens(user))

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

class LogoutView(APIView):
    def post(self, request):
        return Response(status=status.HTTP_204_NO_CONTENT)
