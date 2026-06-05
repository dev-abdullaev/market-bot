import json
import urllib.error
import urllib.request

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


class TelegramVerifyView(APIView):
    """Verify a Telegram bot token by calling the Telegram getMe API.

    POST body: ``{"token": "<bot token>"}``

    Always returns HTTP 200 so the frontend can read the JSON body:
    - ``{"ok": true, "name": "<first_name>", "username": "<username>"}``
    - ``{"ok": false}``
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get("token", "").strip()
        if not token:
            return Response({"ok": False})
        url = f"https://api.telegram.org/bot{token}/getMe"
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode())
        except Exception:
            return Response({"ok": False})
        if not data.get("ok"):
            return Response({"ok": False})
        result = data.get("result", {})
        return Response({
            "ok": True,
            "name": result.get("first_name", ""),
            "username": result.get("username", ""),
        })
