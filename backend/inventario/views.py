from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Categoria, Proveedor, Producto
from .serializers import (
    CategoriaSerializer,
    ProveedorSerializer,
    ProductoListSerializer,
    ProductoDetailSerializer,
)


class CategoriaViewSet(viewsets.ModelViewSet):
    """CRUD de categorías. Solo ADMIN puede crear/editar/eliminar."""
    queryset = Categoria.objects.all().order_by('nombre')
    serializer_class = CategoriaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']

    def get_queryset(self):
        qs = super().get_queryset()
        activo = self.request.query_params.get('activo')
        if activo is not None:
            qs = qs.filter(activo=activo.lower() == 'true')
        return qs


class ProveedorViewSet(viewsets.ModelViewSet):
    """CRUD de proveedores."""
    queryset = Proveedor.objects.all().order_by('nombre')
    serializer_class = ProveedorSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'cuit']

    def get_queryset(self):
        qs = super().get_queryset()
        activo = self.request.query_params.get('activo')
        if activo is not None:
            qs = qs.filter(activo=activo.lower() == 'true')
        return qs


class ProductoViewSet(viewsets.ModelViewSet):
    """
    CRUD de productos con filtros por categoría, stock y vencimiento.
    Listado usa ProductoListSerializer (liviano).
    Detalle usa ProductoDetailSerializer (anidado completo).
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'codigo_barra']
    ordering_fields = ['nombre', 'precio_venta', 'stock_actual', 'fecha_vencimiento']
    ordering = ['nombre']

    def get_queryset(self):
        qs = Producto.objects.select_related('categoria').prefetch_related('producto_proveedores__proveedor')
        params = self.request.query_params

        if activo := params.get('activo'):
            qs = qs.filter(activo=activo.lower() == 'true')
        if categoria_id := params.get('categoria'):
            qs = qs.filter(categoria_id=categoria_id)
        if params.get('alerta_stock') == 'true':
            # stock_actual <= stock_minimo (usa el índice idx_prod_stock_alert)
            from django.db.models import F
            qs = qs.filter(stock_actual__lte=F('stock_minimo'))
        if params.get('sin_stock') == 'true':
            qs = qs.filter(stock_actual=0)

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductoListSerializer
        return ProductoDetailSerializer

    @action(detail=False, methods=['get'], url_path='alertas-stock')
    def alertas_stock(self, request):
        """Productos con stock_actual <= stock_minimo, ordenados por stock_actual ASC."""
        from django.db.models import F
        qs = self.get_queryset().filter(
            activo=True,
            stock_actual__lte=F('stock_minimo'),
        ).order_by('stock_actual')
        serializer = ProductoListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='alertas-vencimiento')
    def alertas_vencimiento(self, request):
        """Productos con fecha_vencimiento en los próximos 15 días o ya vencidos."""
        from django.utils import timezone
        from datetime import timedelta
        hoy = timezone.now().date()
        limite = hoy + timedelta(days=15)
        qs = self.get_queryset().filter(
            activo=True,
            fecha_vencimiento__isnull=False,
            fecha_vencimiento__lte=limite,
        ).order_by('fecha_vencimiento')
        serializer = ProductoListSerializer(qs, many=True)
        return Response(serializer.data)
