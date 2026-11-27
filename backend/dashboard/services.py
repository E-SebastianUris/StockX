from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Sum, Count, Q, F, Max, OuterRef, Subquery
from django.db.models.functions import Coalesce
from django.utils import timezone

from inventario.models import Producto
from ventas.models import Venta, DetalleVenta, MovimientoStock

MAX_DASHBOARD_LIMIT = 100


def validar_limit_servicio(limit, allow_none=False):
    if limit is None:
        if allow_none:
            return None
        raise ValueError('El límite debe ser un entero positivo entre 1 y 100.')
    if isinstance(limit, bool):
        raise ValueError('El límite debe ser un entero positivo entre 1 y 100.')
    if not isinstance(limit, int) or limit < 1 or limit > MAX_DASHBOARD_LIMIT:
        raise ValueError('El límite debe ser un entero positivo entre 1 y 100.')
    return limit


def get_productos_mas_vendidos(limit=10, fecha_desde=None, fecha_hasta=None, proveedor=None):
    """
    Obtiene los productos con mayor cantidad vendida y monto recaudado.
    Equivalente a vista_productos_mas_vendidos en SQL.
    Acepta filtros opcionales de período (fecha_desde, fecha_hasta) y proveedor.
    """
    detalle_filtros = Q(producto=OuterRef('pk'))
    if fecha_desde:
        detalle_filtros &= Q(venta__fecha_venta__date__gte=fecha_desde)
    if fecha_hasta:
        detalle_filtros &= Q(venta__fecha_venta__date__lte=fecha_hasta)
    if proveedor:
        detalle_filtros &= Q(producto__producto_proveedores__proveedor_id=proveedor)

    cant_sub = (
        DetalleVenta.objects.filter(detalle_filtros)
        .values('producto')
        .annotate(total=Sum('cantidad'))
        .values('total')[:1]
    )
    rec_sub = (
        DetalleVenta.objects.filter(detalle_filtros)
        .values('producto')
        .annotate(total=Sum('subtotal'))
        .values('total')[:1]
    )
    ventas_sub = (
        DetalleVenta.objects.filter(detalle_filtros)
        .values('producto')
        .annotate(total=Count('venta_id', distinct=True))
        .values('total')[:1]
    )

    productos_qs = Producto.objects.filter(activo=True)
    if proveedor:
        productos_qs = productos_qs.filter(producto_proveedores__proveedor_id=proveedor).distinct()

    productos = (
        productos_qs
        .select_related('categoria')
        .annotate(
            total_unidades_vendidas=Coalesce(Subquery(cant_sub), 0),
            total_recaudado=Coalesce(Subquery(rec_sub), Decimal('0.00')),
            cantidad_ventas_asociadas=Coalesce(Subquery(ventas_sub), 0),
        )
        .order_by('-total_unidades_vendidas', '-total_recaudado')
    )

    limit = validar_limit_servicio(limit)
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


def get_rotacion_productos(limit=None, fecha_desde=None, fecha_hasta=None, proveedor=None):
    """
    Calcula la velocidad de salida (ventas) y reposición (ingresos) por producto,
    así como el índice de rotación y su clasificación comercial.
    Utiliza subconsultas para evitar productos cartesianos entre ventas y movimientos.
    Acepta filtros opcionales de período (fecha_desde, fecha_hasta) y proveedor.
    """
    salidas_filtros = Q(producto=OuterRef('pk'))
    ingresos_filtros = Q(producto=OuterRef('pk'), tipo='INGRESO')

    if fecha_desde:
        salidas_filtros &= Q(venta__fecha_venta__date__gte=fecha_desde)
        ingresos_filtros &= Q(fecha_movimiento__date__gte=fecha_desde)
    if fecha_hasta:
        salidas_filtros &= Q(venta__fecha_venta__date__lte=fecha_hasta)
        ingresos_filtros &= Q(fecha_movimiento__date__lte=fecha_hasta)
    if proveedor:
        salidas_filtros &= Q(producto__producto_proveedores__proveedor_id=proveedor)
        ingresos_filtros &= Q(producto__producto_proveedores__proveedor_id=proveedor)

    salidas_sub = (
        DetalleVenta.objects.filter(salidas_filtros)
        .values('producto')
        .annotate(total=Sum('cantidad'))
        .values('total')[:1]
    )
    ingresos_sub = (
        MovimientoStock.objects.filter(ingresos_filtros)
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

    productos_qs = Producto.objects.filter(activo=True)
    if proveedor:
        productos_qs = productos_qs.filter(producto_proveedores__proveedor_id=proveedor).distinct()

    productos = (
        productos_qs
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

    limit = validar_limit_servicio(limit, allow_none=True)
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


def get_resumen_general(alertas, fecha_desde=None, fecha_hasta=None, mes=None, proveedor=None, historico=False):
    """Métricas generales y recaudación filtrada de ventas."""
    hoy = timezone.now().date()

    ventas = Venta.objects.all()
    detalles = DetalleVenta.objects.select_related('venta', 'producto')

    if fecha_desde or fecha_hasta:
        if fecha_desde:
            ventas = ventas.filter(fecha_venta__date__gte=fecha_desde)
            detalles = detalles.filter(venta__fecha_venta__date__gte=fecha_desde)
        if fecha_hasta:
            ventas = ventas.filter(fecha_venta__date__lte=fecha_hasta)
            detalles = detalles.filter(venta__fecha_venta__date__lte=fecha_hasta)
    elif mes:
        try:
            from calendar import monthrange
            anio, numero_mes = (int(parte) for parte in mes.split('-', 1))
            ultimo_dia = monthrange(anio, numero_mes)[1]
            inicio_mes = datetime(anio, numero_mes, 1).date()
            fin_mes = datetime(anio, numero_mes, ultimo_dia).date()
        except (TypeError, ValueError):
            inicio_mes = None
            fin_mes = None

        if inicio_mes and fin_mes:
            ventas = ventas.filter(fecha_venta__date__gte=inicio_mes, fecha_venta__date__lte=fin_mes)
            detalles = detalles.filter(venta__fecha_venta__date__gte=inicio_mes, venta__fecha_venta__date__lte=fin_mes)
    elif historico:
        # Abarca todo el histórico de ventas sin acotar por fecha
        pass
    else:
        ventas = ventas.filter(fecha_venta__date=hoy)
        detalles = detalles.filter(venta__fecha_venta__date=hoy)

    if proveedor:
        detalles = detalles.filter(
            producto__producto_proveedores__proveedor_id=proveedor
        ).distinct()
        total_recaudado = detalles.aggregate(
            total=Coalesce(Sum('subtotal'), Decimal('0.00'))
        )['total']
        cantidad_ventas = detalles.values('venta_id').distinct().count()
    else:
        ventas_agg = ventas.aggregate(
            total_recaudado=Coalesce(Sum('total'), Decimal('0.00')),
            cantidad_ventas=Count('id'),
        )
        total_recaudado = ventas_agg['total_recaudado']
        cantidad_ventas = ventas_agg['cantidad_ventas']

    total_productos = Producto.objects.filter(activo=True).count()

    return {
        'total_ventas_recaudado': total_recaudado,
        'cantidad_ventas': cantidad_ventas,
        'total_productos_activos': total_productos,
        'total_alertas_activas': alertas['total_alertas'],
    }
