from datetime import timedelta
from decimal import Decimal
from django.db.models import Sum, Count, Q, F, Max, OuterRef, Subquery
from django.db.models.functions import Coalesce
from django.utils import timezone

from inventario.models import Producto
from ventas.models import Venta, DetalleVenta, MovimientoStock


def get_productos_mas_vendidos(limit=10):
    """
    Obtiene los productos con mayor cantidad vendida y monto recaudado.
    Equivalente a vista_productos_mas_vendidos en SQL.
    """
    cant_sub = (
        DetalleVenta.objects.filter(producto=OuterRef('pk'))
        .values('producto')
        .annotate(total=Sum('cantidad'))
        .values('total')[:1]
    )
    rec_sub = (
        DetalleVenta.objects.filter(producto=OuterRef('pk'))
        .values('producto')
        .annotate(total=Sum('subtotal'))
        .values('total')[:1]
    )
    ventas_sub = (
        DetalleVenta.objects.filter(producto=OuterRef('pk'))
        .values('producto')
        .annotate(total=Count('venta_id', distinct=True))
        .values('total')[:1]
    )

    productos = (
        Producto.objects.filter(activo=True)
        .select_related('categoria')
        .annotate(
            total_unidades_vendidas=Coalesce(Subquery(cant_sub), 0),
            total_recaudado=Coalesce(Subquery(rec_sub), Decimal('0.00')),
            cantidad_ventas_asociadas=Coalesce(Subquery(ventas_sub), 0),
        )
        .order_by('-total_unidades_vendidas', '-total_recaudado')
    )

    if limit:
        productos = productos[:limit]

    return [
        {
            'producto_id': p.id,
            'codigo_barra': p.codigo_barra,
            'producto_nombre': p.nombre,
            'categoria_nombre': p.categoria.nombre if p.categoria else 'Sin categoría',
            'total_unidades_vendidas': p.total_unidades_vendidas,
            'total_recaudado': p.total_recaudado,
            'cantidad_ventas_asociadas': p.cantidad_ventas_asociadas,
        }
        for p in productos
    ]


def get_rotacion_productos(limit=None):
    """
    Calcula la velocidad de salida (ventas) y reposición (ingresos) por producto,
    así como el índice de rotación y su clasificación comercial.
    Utiliza subconsultas para evitar productos cartesianos entre ventas y movimientos.
    """
    salidas_sub = (
        DetalleVenta.objects.filter(producto=OuterRef('pk'))
        .values('producto')
        .annotate(total=Sum('cantidad'))
        .values('total')[:1]
    )
    ingresos_sub = (
        MovimientoStock.objects.filter(producto=OuterRef('pk'), tipo='INGRESO')
        .values('producto')
        .annotate(total=Sum('cantidad'))
        .values('total')[:1]
    )
    ultimo_mov_sub = (
        MovimientoStock.objects.filter(producto=OuterRef('pk'))
        .values('producto')
        .annotate(ultimo=Max('fecha_movimiento'))
        .values('ultimo')[:1]
    )

    productos = (
        Producto.objects.filter(activo=True)
        .select_related('categoria')
        .annotate(
            unidades_vendidas=Coalesce(Subquery(salidas_sub), 0),
            unidades_ingresadas=Coalesce(Subquery(ingresos_sub), 0),
            ultimo_mov=Subquery(ultimo_mov_sub),
        )
        .order_by('-unidades_vendidas', 'stock_actual')
    )

    resultado = []
    for p in productos:
        salidas = p.unidades_vendidas
        ingresos = p.unidades_ingresadas
        stock = p.stock_actual

        if stock > 0:
            ratio = round(float(salidas) / float(stock), 2)
        elif salidas > 0:
            ratio = float(salidas)
        else:
            ratio = 0.0

        if ratio >= 2.0 or salidas >= 20:
            nivel = 'ALTA'
        elif ratio >= 0.5 or salidas >= 5:
            nivel = 'MEDIA'
        elif salidas > 0:
            nivel = 'BAJA'
        else:
            nivel = 'SIN_MOVIMIENTO'

        resultado.append({
            'producto_id': p.id,
            'codigo_barra': p.codigo_barra,
            'producto_nombre': p.nombre,
            'categoria_nombre': p.categoria.nombre if p.categoria else 'Sin categoría',
            'stock_actual': stock,
            'stock_minimo': p.stock_minimo,
            'total_salidas': salidas,
            'total_ingresos': ingresos,
            'ratio_rotacion': ratio,
            'nivel_rotacion': nivel,
            'ultimo_movimiento': p.ultimo_mov,
        })

    if limit:
        return resultado[:limit]
    return resultado


def get_alertas_activas():
    """
    Genera el resumen de alertas activas consumiendo los criterios de
    stock mínimo (vista_alertas_stock_minimo) y vencimiento (vista_alertas_vencimiento).
    """
    # 1. Alertas de stock mínimo
    productos_stock = (
        Producto.objects.filter(activo=True, stock_actual__lte=F('stock_minimo'))
        .select_related('categoria')
        .order_by('stock_actual')
    )

    items_stock = []
    conteo_sin_stock = 0
    for p in productos_stock:
        if p.stock_actual == 0:
            nivel = 'SIN STOCK'
            conteo_sin_stock += 1
        elif p.stock_actual <= (p.stock_minimo / 2):
            nivel = 'CRITICO'
        else:
            nivel = 'BAJO'

        items_stock.append({
            'producto_id': p.id,
            'codigo_barra': p.codigo_barra,
            'producto_nombre': p.nombre,
            'categoria_nombre': p.categoria.nombre if p.categoria else 'Sin categoría',
            'stock_actual': p.stock_actual,
            'stock_minimo': p.stock_minimo,
            'unidades_faltantes': max(0, p.stock_minimo - p.stock_actual),
            'nivel_alerta': nivel,
        })

    # 2. Alertas de vencimiento (próximos a 15 días o vencidos)
    hoy = timezone.now().date()
    limite_vencimiento = hoy + timedelta(days=15)
    productos_vencimiento = (
        Producto.objects.filter(
            activo=True,
            fecha_vencimiento__isnull=False,
            fecha_vencimiento__lte=limite_vencimiento,
        )
        .select_related('categoria')
        .order_by('fecha_vencimiento')
    )

    items_vencimiento = []
    conteo_vencidos = 0
    for p in productos_vencimiento:
        dias = (p.fecha_vencimiento - hoy).days
        if dias < 0:
            estado = 'VENCIDO'
            conteo_vencidos += 1
        elif dias <= 7:
            estado = 'URGENTE'
        else:
            estado = 'PROXIMO'

        items_vencimiento.append({
            'producto_id': p.id,
            'codigo_barra': p.codigo_barra,
            'producto_nombre': p.nombre,
            'categoria_nombre': p.categoria.nombre if p.categoria else 'Sin categoría',
            'stock_actual': p.stock_actual,
            'fecha_vencimiento': p.fecha_vencimiento,
            'dias_para_vencer': dias,
            'estado_vencimiento': estado,
        })

    ids_stock = {i['producto_id'] for i in items_stock}
    ids_venc = {i['producto_id'] for i in items_vencimiento}
    total_alertas = len(ids_stock.union(ids_venc))

    return {
        'total_alertas': total_alertas,
        'conteo_stock_minimo': len(items_stock),
        'conteo_vencimiento': len(items_vencimiento),
        'conteo_sin_stock': conteo_sin_stock,
        'conteo_vencidos': conteo_vencidos,
        'items_stock_minimo': items_stock,
        'items_vencimiento': items_vencimiento,
    }


def get_resumen_general(alertas):
    """
    Retorna métricas globales para las tarjetas de KPIs del Dashboard.
    """
    ventas_agg = Venta.objects.aggregate(
        total_recaudado=Coalesce(Sum('total'), Decimal('0.00')),
        cantidad_ventas=Count('id'),
    )
    total_productos = Producto.objects.filter(activo=True).count()

    return {
        'total_ventas_recaudado': ventas_agg['total_recaudado'],
        'cantidad_ventas': ventas_agg['cantidad_ventas'],
        'total_productos_activos': total_productos,
        'total_alertas_activas': alertas['total_alertas'],
    }
