
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny


@api_view(['GET'])
@permission_classes([AllowAny])
def healthcheck(request):
    return JsonResponse({
        'status': 'ok',
        'message': 'API funcionando',
        'service': 'StockX backend',
    })


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', healthcheck, name='healthcheck'),
    path('api/auth/', include('authentication.urls')),
    path('api/inventario/', include('inventario.urls')),
    
]
