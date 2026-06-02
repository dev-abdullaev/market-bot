from rest_framework.routers import SimpleRouter
from .views import PromoViewSet

router = SimpleRouter(trailing_slash=False)
router.register("promos", PromoViewSet, basename="promo")
urlpatterns = router.urls
