from django.urls import path
from .views import (
    DashboardMetricsView,
    DashboardMasVendidosView,
    DashboardRotacionView,
    DashboardAlertasView,
)

app_name = 'dashboard'

urlpatterns = [
    path('', DashboardMetricsView.as_view(), name='metricas'),
    path('mas-vendidos/', DashboardMasVendidosView.as_view(), name='mas-vendidos'),
    path('rotacion/', DashboardRotacionView.as_view(), name='rotacion'),
    path('alertas/', DashboardAlertasView.as_view(), name='alertas'),
]

