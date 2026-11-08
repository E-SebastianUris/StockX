from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .permissions import IsAdminRolePermission
from .services import (
    get_productos_mas_vendidos,
    get_rotacion_productos,
    get_alertas_activas,
    get_resumen_general,
)
from .serializers import (
    DashboardMetricsSerializer,
    ProductoMasVendidoSerializer,
    RotacionProductoSerializer,
    AlertasResumenSerializer,
)


class DashboardMetricsView(APIView):
    """
    Vista consolidada del Dashboard para el Administrador.
    Retorna los 3 indicadores principales (más vendidos, rotación y alertas)
    junto al resumen de KPIs generales del negocio.
    Exclusivo para rol ADMIN (403 para VENDEDOR, 401 si no autenticado).
    """
    permission_classes = [IsAdminRolePermission]

    def get(self, request):
        limit_top = request.query_params.get('limit', 10)
        try:
            limit_top = int(limit_top)
        except (ValueError, TypeError):
            limit_top = 10

        alertas_data = get_alertas_activas()
        mas_vendidos_data = get_productos_mas_vendidos(limit=limit_top)
        rotacion_data = get_rotacion_productos()
        resumen_data = get_resumen_general(alertas_data)

        payload = {
            'resumen_general': resumen_data,
            'productos_mas_vendidos': mas_vendidos_data,
            'rotacion_productos': rotacion_data,
            'alertas': alertas_data,
        }

        serializer = DashboardMetricsSerializer(payload)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DashboardMasVendidosView(APIView):
    """
    Indicador 1: Top productos más vendidos por cantidad y recaudación.
    """
    permission_classes = [IsAdminRolePermission]

    def get(self, request):
        limit = request.query_params.get('limit', 10)
        try:
            limit = int(limit)
        except (ValueError, TypeError):
            limit = 10

        data = get_productos_mas_vendidos(limit=limit)
        serializer = ProductoMasVendidoSerializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DashboardRotacionView(APIView):
    """
    Indicador 2: Velocidad de salida vs reposición e índice de rotación de mercadería.
    """
    permission_classes = [IsAdminRolePermission]

    def get(self, request):
        limit = request.query_params.get('limit')
        if limit:
            try:
                limit = int(limit)
            except (ValueError, TypeError):
                limit = None

        data = get_rotacion_productos(limit=limit)
        serializer = RotacionProductoSerializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DashboardAlertasView(APIView):
    """
    Indicador 3: Resumen activo de alertas de stock mínimo y vencimientos.
    """
    permission_classes = [IsAdminRolePermission]

    def get(self, request):
        data = get_alertas_activas()
        serializer = AlertasResumenSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)

