from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import VentaViewSet, MovimientoStockViewSet

router = DefaultRouter()
router.register('ventas', VentaViewSet, basename='venta')
router.register('movimientos', MovimientoStockViewSet, basename='movimientostock')

urlpatterns = [
    path('', include(router.urls)),
]
