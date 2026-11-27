from datetime import datetime

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

MAX_DASHBOARD_LIMIT = 100


def validar_limit_dashboard(request, default=10):
    """Valida limit: entero positivo entre 1 y 100."""
    valor = request.query_params.get('limit')
    if valor is None:
        return default, None

    try:
        numero = int(valor)
    except (TypeError, ValueError):
        return None, Response(
            {'detail': 'El parámetro limit debe ser un entero positivo entre 1 y 100.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if numero < 1 or numero > MAX_DASHBOARD_LIMIT:
        return None, Response(
            {'detail': 'El parámetro limit debe ser un entero positivo entre 1 y 100.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return numero, None


def validar_mes_y_rango(request, mes=None, fecha_desde=None, fecha_hasta=None):
    if mes and (fecha_desde or fecha_hasta):
        return Response(
            {'detail': 'mes no puede combinarse con fecha_desde ni fecha_hasta.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return None


class DashboardMetricsView(APIView):
    """
    Vista consolidada del Dashboard para el Administrador.
    Retorna los 3 indicadores principales (más vendidos, rotación y alertas)
    junto al resumen de KPIs generales del negocio.
    Exclusivo para rol ADMIN (403 para VENDEDOR, 401 si no autenticado).
    """
    permission_classes = [IsAdminRolePermission]

    def get(self, request):
        limit_top, response = validar_limit_dashboard(request)
        if response is not None:
            return response

        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        mes = request.query_params.get('mes')
        proveedor = request.query_params.get('proveedor')
        historico = request.query_params.get('historico')
        es_historico = historico is not None and str(historico).lower() in ['true', '1', 't', 'si', 'yes']

        try:
            if fecha_desde:
                fecha_desde = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
            if fecha_hasta:
                fecha_hasta = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'detail': 'Las fechas deben tener formato YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
            return Response(
                {'detail': 'fecha_desde no puede ser posterior a fecha_hasta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if es_historico and (fecha_desde or fecha_hasta or mes):
            return Response(
                {'detail': 'historico no puede combinarse con filtros de fecha o mes.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conflicto = validar_mes_y_rango(request, mes=mes, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta)
        if conflicto:
            return conflicto

        if mes:
            try:
                datetime.strptime(mes, '%Y-%m')
            except ValueError:
                return Response(
                    {'detail': 'El mes debe tener formato YYYY-MM.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if proveedor:
            try:
                proveedor = int(proveedor)
            except (ValueError, TypeError):
                return Response(
                    {'detail': 'El proveedor debe ser un identificador numérico.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        alertas_data = get_alertas_activas()
        mas_vendidos_data = get_productos_mas_vendidos(
            limit=limit_top,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            proveedor=proveedor,
        )
        rotacion_data = get_rotacion_productos(
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            proveedor=proveedor,
        )
        resumen_data = get_resumen_general(
            alertas_data,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            mes=None if (fecha_desde or fecha_hasta) else mes,
            proveedor=proveedor,
            historico=es_historico,
        )

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
        limit, limit_error = validar_limit_dashboard(request, default=10)
        if limit_error:
            return limit_error

        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        proveedor = request.query_params.get('proveedor')
        if fecha_desde:
            try:
                fecha_desde = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
            except ValueError:
                return Response({'detail': 'Las fechas deben tener formato YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        if fecha_hasta:
            try:
                fecha_hasta = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
            except ValueError:
                return Response({'detail': 'Las fechas deben tener formato YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
            return Response({'detail': 'fecha_desde no puede ser posterior a fecha_hasta.'}, status=status.HTTP_400_BAD_REQUEST)
        if proveedor:
            try:
                proveedor = int(proveedor)
            except (ValueError, TypeError):
                return Response({'detail': 'El proveedor debe ser un identificador numérico.'}, status=status.HTTP_400_BAD_REQUEST)

        data = get_productos_mas_vendidos(limit=limit, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta, proveedor=proveedor)
        serializer = ProductoMasVendidoSerializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DashboardRotacionView(APIView):
    """
    Indicador 2: Velocidad de salida vs reposición e índice de rotación de mercadería.
    """
    permission_classes = [IsAdminRolePermission]

    def get(self, request):
        limit, limit_error = validar_limit_dashboard(request, default=None)
        if limit_error:
            return limit_error

        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        proveedor = request.query_params.get('proveedor')
        if fecha_desde:
            try:
                fecha_desde = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
            except ValueError:
                return Response({'detail': 'Las fechas deben tener formato YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        if fecha_hasta:
            try:
                fecha_hasta = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
            except ValueError:
                return Response({'detail': 'Las fechas deben tener formato YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
            return Response({'detail': 'fecha_desde no puede ser posterior a fecha_hasta.'}, status=status.HTTP_400_BAD_REQUEST)
        if proveedor:
            try:
                proveedor = int(proveedor)
            except (ValueError, TypeError):
                return Response({'detail': 'El proveedor debe ser un identificador numérico.'}, status=status.HTTP_400_BAD_REQUEST)

        data = get_rotacion_productos(limit=limit, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta, proveedor=proveedor)
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

