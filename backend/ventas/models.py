from django.conf import settings
from django.db import models


class Venta(models.Model):
    """
    Encabezado transaccional de ventas realizadas en mostrador.
    Tabla: ventas (db/schema.sql §6).
    """
    METODOS_PAGO = [
        ('EFECTIVO', 'Efectivo'),
        ('TRANSFERENCIA', 'Transferencia'),
        ('DEBITO', 'Débito'),
        ('CREDITO', 'Crédito'),
        ('OTRO', 'Otro'),
    ]

    fecha_venta = models.DateTimeField(auto_now_add=True)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    vendedor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.RESTRICT,
        db_column='vendedor_id',
        related_name='ventas',
    )
    metodo_pago = models.CharField(
        max_length=20,
        choices=METODOS_PAGO,
        default='EFECTIVO',
    )
    observaciones = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = 'ventas'
        verbose_name = 'Venta'
        verbose_name_plural = 'Ventas'
        ordering = ['-fecha_venta']
        indexes = [
            models.Index(fields=['-fecha_venta'], name='idx_ventas_fecha'),
            models.Index(fields=['fecha_venta', 'vendedor'], name='idx_ventas_fecha_vend'),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(total__gte=0),
                name='chk_ventas_total_gte_0',
            ),
            models.CheckConstraint(
                check=models.Q(metodo_pago__in=['EFECTIVO', 'TRANSFERENCIA', 'DEBITO', 'CREDITO', 'OTRO']),
                name='chk_ventas_metodo_pago_valido',
            ),
        ]

    def __str__(self):
        return f"Venta #{self.id} - ${self.total} ({self.vendedor})"


class DetalleVenta(models.Model):
    """
    Renglones o ítems incluidos en cada venta.
    Tabla: detalles_ventas (db/schema.sql §7).
    """
    venta = models.ForeignKey(
        Venta,
        on_delete=models.CASCADE,
        db_column='venta_id',
        related_name='detalles',
    )
    producto = models.ForeignKey(
        'inventario.Producto',
        on_delete=models.RESTRICT,
        db_column='producto_id',
        related_name='detalles_venta',
    )
    cantidad = models.IntegerField()
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = 'detalles_ventas'
        verbose_name = 'Detalle de Venta'
        verbose_name_plural = 'Detalles de Venta'
        constraints = [
            models.UniqueConstraint(
                fields=['venta', 'producto'],
                name='unique_venta_producto',
            ),
            models.CheckConstraint(
                check=models.Q(cantidad__gt=0),
                name='chk_det_ventas_cantidad_gt_0',
            ),
            models.CheckConstraint(
                check=models.Q(precio_unitario__gte=0),
                name='chk_det_ventas_precio_unitario_gte_0',
            ),
            models.CheckConstraint(
                check=models.Q(subtotal__gte=0),
                name='chk_det_ventas_subtotal_gte_0',
            ),
        ]
        indexes = [
            models.Index(fields=['venta'], name='idx_det_venta'),
            models.Index(fields=['producto'], name='idx_det_prod'),
            models.Index(fields=['producto', 'venta'], name='idx_det_prod_venta'),
        ]

    def __str__(self):
        return f"{self.cantidad}x {self.producto} en Venta #{self.venta_id}"


class MovimientoStock(models.Model):
    """
    Registro inmutable de trazabilidad de stock.
    Tabla: movimientos_stock (db/schema.sql §8).
    """
    TIPOS = [
        ('INGRESO', 'Ingreso (+)'),
        ('EGRESO', 'Egreso (-)'),
        ('AJUSTE', 'Ajuste (+/-)'),
        ('VENTA', 'Venta (-)'),
    ]

    producto = models.ForeignKey(
        'inventario.Producto',
        on_delete=models.RESTRICT,
        db_column='producto_id',
        related_name='movimientos_stock',
    )
    tipo = models.CharField(max_length=20, choices=TIPOS)
    cantidad = models.IntegerField()
    stock_previo = models.IntegerField()
    stock_posterior = models.IntegerField()
    motivo = models.CharField(max_length=255, null=True, blank=True)
    fecha_vencimiento_asociada = models.DateField(null=True, blank=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.RESTRICT,
        db_column='usuario_id',
        related_name='movimientos_registrados',
        null=True,
        blank=True,
    )
    venta = models.ForeignKey(
        Venta,
        on_delete=models.SET_NULL,
        db_column='venta_id',
        related_name='movimientos_stock',
        null=True,
        blank=True,
    )
    fecha_movimiento = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'movimientos_stock'
        verbose_name = 'Movimiento de Stock'
        verbose_name_plural = 'Movimientos de Stock'
        ordering = ['-fecha_movimiento']
        indexes = [
            models.Index(fields=['producto'], name='idx_mov_producto'),
            models.Index(fields=['-fecha_movimiento'], name='idx_mov_fecha'),
            models.Index(fields=['producto', '-fecha_movimiento'], name='idx_mov_prod_fecha'),
            models.Index(fields=['usuario'], name='idx_mov_usuario'),
            models.Index(fields=['venta'], name='idx_mov_venta'),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(tipo__in=['INGRESO', 'EGRESO', 'AJUSTE', 'VENTA']),
                name='chk_mov_tipo_valido',
            ),
            models.CheckConstraint(
                check=~models.Q(cantidad=0),
                name='chk_mov_cantidad_no_cero',
            ),
            models.CheckConstraint(
                check=models.Q(stock_previo__gte=0),
                name='chk_mov_stock_previo_gte_0',
            ),
            models.CheckConstraint(
                check=models.Q(stock_posterior__gte=0),
                name='chk_mov_stock_posterior_gte_0',
            ),
        ]

    def __str__(self):
        return f"{self.tipo} ({self.cantidad}) - {self.producto} [{self.fecha_movimiento}]"
