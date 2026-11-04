from rest_framework import viewsets, mixins, filters, status
from rest_framework.response import Response

from .models import Venta, MovimientoStock
from .permissions import HasVentaPermission, HasMovimientoStockPermission
from .serializers import (
    VentaSerializer,
    VentaCreateSerializer,
    MovimientoStockSerializer,
    MovimientoStockCreateSerializer,
)


class VentaViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """
    ViewSet para ventas.
    - GET /api/ventas/ventas/: Listado de ventas.
    - POST /api/ventas/ventas/: Registro transaccional de nueva venta.
    - GET /api/ventas/ventas/<id>/: Detalle de una venta con ítems asociados.
    """
    permission_classes = [HasVentaPermission]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['fecha_venta', 'total']
    ordering = ['-fecha_venta']

    def get_queryset(self):
        qs = (
            Venta.objects
            .select_related('vendedor')
            .prefetch_related('detalles__producto')
            .all()
        )
        params = self.request.query_params

        if vendedor_id := params.get('vendedor'):
            qs = qs.filter(vendedor_id=vendedor_id)
        if metodo_pago := params.get('metodo_pago'):
            qs = qs.filter(metodo_pago=metodo_pago)
        if fecha_desde := params.get('fecha_desde'):
            qs = qs.filter(fecha_venta__date__gte=fecha_desde)
        if fecha_hasta := params.get('fecha_hasta'):
            qs = qs.filter(fecha_venta__date__lte=fecha_hasta)

        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return VentaCreateSerializer
        return VentaSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        venta = serializer.save()
        output_serializer = VentaSerializer(venta, context={'request': request})
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class MovimientoStockViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """
    ViewSet para movimientos de stock.
    - GET /api/ventas/movimientos/: Historial y trazabilidad de movimientos.
    - POST /api/ventas/movimientos/: Registro de INGRESO, EGRESO y AJUSTE manuales (solo ADMIN).
    - GET /api/ventas/movimientos/<id>/: Detalle de un movimiento individual.
    """
    permission_classes = [HasMovimientoStockPermission]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['fecha_movimiento', 'cantidad']
    ordering = ['-fecha_movimiento']

    def get_queryset(self):
        qs = (
            MovimientoStock.objects
            .select_related('producto', 'usuario', 'venta')
            .all()
        )
        params = self.request.query_params

        if producto_id := params.get('producto'):
            qs = qs.filter(producto_id=producto_id)
        if tipo := params.get('tipo'):
            qs = qs.filter(tipo=tipo.upper())
        if fecha_desde := params.get('fecha_desde'):
            qs = qs.filter(fecha_movimiento__date__gte=fecha_desde)
        if fecha_hasta := params.get('fecha_hasta'):
            qs = qs.filter(fecha_movimiento__date__lte=fecha_hasta)

        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return MovimientoStockCreateSerializer
        return MovimientoStockSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        movimiento = serializer.save()
        output_serializer = MovimientoStockSerializer(movimiento, context={'request': request})
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
