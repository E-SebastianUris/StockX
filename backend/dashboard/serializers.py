from rest_framework import serializers


class ProductoMasVendidoSerializer(serializers.Serializer):
    producto_id = serializers.IntegerField()
    codigo_barra = serializers.CharField(allow_null=True, allow_blank=True)
    producto_nombre = serializers.CharField()
    categoria_nombre = serializers.CharField()
    total_unidades_vendidas = serializers.IntegerField()
    total_recaudado = serializers.DecimalField(max_digits=12, decimal_places=2)
    cantidad_ventas_asociadas = serializers.IntegerField()


class RotacionProductoSerializer(serializers.Serializer):
    producto_id = serializers.IntegerField()
    codigo_barra = serializers.CharField(allow_null=True, allow_blank=True)
    producto_nombre = serializers.CharField()
    categoria_nombre = serializers.CharField()
    stock_actual = serializers.IntegerField()
    stock_minimo = serializers.IntegerField()
    total_salidas = serializers.IntegerField()
    total_ingresos = serializers.IntegerField()
    ratio_rotacion = serializers.FloatField()
    nivel_rotacion = serializers.ChoiceField(
        choices=['ALTA', 'MEDIA', 'BAJA', 'SIN_MOVIMIENTO']
    )
    ultimo_movimiento = serializers.DateTimeField(allow_null=True)


class AlertaStockSerializer(serializers.Serializer):
    producto_id = serializers.IntegerField()
    codigo_barra = serializers.CharField(allow_null=True, allow_blank=True)
    producto_nombre = serializers.CharField()
    categoria_nombre = serializers.CharField()
    stock_actual = serializers.IntegerField()
    stock_minimo = serializers.IntegerField()
    unidades_faltantes = serializers.IntegerField()
    nivel_alerta = serializers.ChoiceField(choices=['SIN STOCK', 'CRITICO', 'BAJO'])


class AlertaVencimientoSerializer(serializers.Serializer):
    producto_id = serializers.IntegerField()
    codigo_barra = serializers.CharField(allow_null=True, allow_blank=True)
    producto_nombre = serializers.CharField()
    categoria_nombre = serializers.CharField()
    stock_actual = serializers.IntegerField()
    fecha_vencimiento = serializers.DateField()
    dias_para_vencer = serializers.IntegerField()
    estado_vencimiento = serializers.ChoiceField(choices=['VENCIDO', 'URGENTE', 'PROXIMO'])


class AlertasResumenSerializer(serializers.Serializer):
    total_alertas = serializers.IntegerField()
    conteo_stock_minimo = serializers.IntegerField()
    conteo_vencimiento = serializers.IntegerField()
    conteo_sin_stock = serializers.IntegerField()
    conteo_vencidos = serializers.IntegerField()
    items_stock_minimo = AlertaStockSerializer(many=True)
    items_vencimiento = AlertaVencimientoSerializer(many=True)


class DashboardResumenGeneralSerializer(serializers.Serializer):
    total_ventas_recaudado = serializers.DecimalField(max_digits=12, decimal_places=2)
    cantidad_ventas = serializers.IntegerField()
    total_productos_activos = serializers.IntegerField()
    total_alertas_activas = serializers.IntegerField()


class DashboardMetricsSerializer(serializers.Serializer):
    resumen_general = DashboardResumenGeneralSerializer()
    productos_mas_vendidos = ProductoMasVendidoSerializer(many=True)
    rotacion_productos = RotacionProductoSerializer(many=True)
    alertas = AlertasResumenSerializer()

