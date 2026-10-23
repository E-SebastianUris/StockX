
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path


def healthcheck(request):
    return JsonResponse({
        'status': 'ok',
        'message': 'API funcionando',
        'service': 'StockX backend',
    })


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', healthcheck, name='healthcheck'),
]
