from django.conf import settings
from django.db import models


class Categoria(models.Model):
    """
    Clasificación de productos. Tabla: categorias.
    Compatible con db/schema.sql §2.
    """
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(null=True, blank=True)
    activo = models.BooleanField(default=True)
    creado_el = models.DateTimeField(auto_now_add=True)
    actualizado_el = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'categorias'
        verbose_name = 'Categoría'
        verbose_name_plural = 'Categorías'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Proveedor(models.Model):
    """
    Empresas distribuidoras. Tabla: proveedores.
    Compatible con db/schema.sql §3.
    """
    nombre = models.CharField(max_length=150)
    contacto = models.CharField(max_length=100, null=True, blank=True)
    telefono = models.CharField(max_length=30, null=True, blank=True)
    email = models.EmailField(max_length=254, null=True, blank=True)
    direccion = models.CharField(max_length=255, null=True, blank=True)
    cuit = models.CharField(max_length=20, null=True, blank=True, unique=True)
    activo = models.BooleanField(default=True)
    creado_el = models.DateTimeField(auto_now_add=True)
    actualizado_el = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'proveedores'
        verbose_name = 'Proveedor'
        verbose_name_plural = 'Proveedores'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Producto(models.Model):
    """
    Artículos del kiosco con control de stock y vencimiento. Tabla: productos.
    Compatible con db/schema.sql §4.
    """
    codigo_barra = models.CharField(max_length=64, null=True, blank=True, unique=True)
    nombre = models.CharField(max_length=150, db_index=True)
    descripcion = models.TextField(null=True, blank=True)
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.RESTRICT,
        db_column='categoria_id',
        related_name='productos',
    )
    precio_costo = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    precio_venta = models.DecimalField(max_digits=12, decimal_places=2)
    stock_actual = models.IntegerField(default=0)
    stock_minimo = models.IntegerField(default=5)
    fecha_vencimiento = models.DateField(null=True, blank=True)
    activo = models.BooleanField(default=True, db_index=True)
    creado_el = models.DateTimeField(auto_now_add=True)
    actualizado_el = models.DateTimeField(auto_now=True)

    # Relación M:N con Proveedor a través de ProductoProveedor
    proveedores = models.ManyToManyField(
        Proveedor,
        through='ProductoProveedor',
        related_name='productos',
        blank=True,
    )

    class Meta:
        db_table = 'productos'
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        ordering = ['nombre']
        indexes = [
            models.Index(fields=['stock_actual', 'stock_minimo'], name='idx_prod_stock_alert'),
            models.Index(fields=['activo', 'fecha_vencimiento'], name='idx_prod_vencimiento'),
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(precio_costo__gte=0), name='chk_prod_precio_costo_gte_0'),
            models.CheckConstraint(check=models.Q(precio_venta__gte=0), name='chk_prod_precio_venta_gte_0'),
            models.CheckConstraint(check=models.Q(stock_actual__gte=0), name='chk_prod_stock_actual_gte_0'),
            models.CheckConstraint(check=models.Q(stock_minimo__gte=0), name='chk_prod_stock_minimo_gte_0'),
        ]

    def __str__(self):
        return self.nombre

    @property
    def en_alerta_stock(self):
        return self.stock_actual <= self.stock_minimo

    @property
    def sin_stock(self):
        return self.stock_actual == 0


class ProductoProveedor(models.Model):
    """
    Tabla intermedia M:N Producto <-> Proveedor. Tabla: productos_proveedores.
    Compatible con db/schema.sql §5.
    """
    producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        db_column='producto_id',
        related_name='producto_proveedores',
    )
    proveedor = models.ForeignKey(
        Proveedor,
        on_delete=models.CASCADE,
        db_column='proveedor_id',
        related_name='producto_proveedores',
    )
    codigo_articulo_proveedor = models.CharField(max_length=64, null=True, blank=True)
    precio_compra = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    creado_el = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'productos_proveedores'
        verbose_name = 'Producto-Proveedor'
        verbose_name_plural = 'Productos-Proveedores'
        unique_together = [('producto', 'proveedor')]
        constraints = [
            models.CheckConstraint(
                check=models.Q(precio_compra__gte=0) | models.Q(precio_compra__isnull=True),
                name='chk_pp_precio_compra_gte_0',
            ),
        ]

    def __str__(self):
        return f'{self.producto} — {self.proveedor}'
